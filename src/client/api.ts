import { BN, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { DealStatus, PoolStats, Ratio, RepaymentType } from "types/program.types";
import { asyncFilter, multiAsync } from "utils/async.utils";
import { mapDealToStatus } from "utils/deal.utils";
import {
	findGlobalMarketStatePDA,
	findSigningAuthorityPDA,
	findDealPDA,
	findBorrowerInfoPDA,
	findCredixPassPDA,
} from "./pda";
import { newCredixProgram } from "./program";
import { dataToGatewayToken, GatewayTokenData } from "@identity.com/solana-gateway-ts";
import { config } from "../config";
import { applyRatio, ZERO } from "utils/math.utils";
import Big from "big.js";
import Fraction from "fraction.js";

export const getDealAccounts = multiAsync(
	async (connection, wallet, globalMarketSeed: string, borrower?: PublicKey) => {
		const program = newCredixProgram(connection, wallet);

		const allDeals = await program.account.deal.all();
		const marketDeals = await asyncFilter(allDeals, async (deal) => {
			const dealPDA = await findDealPDA(
				deal.account.borrower,
				deal.account.dealNumber,
				globalMarketSeed
			);

			return dealPDA[0].equals(deal.publicKey);
		});

		if (borrower) {
			return marketDeals.filter((deal) => deal.account.borrower.equals(borrower));
		}

		return marketDeals;
	}
);

export const getGlobalMarketStateAccountData = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const program = newCredixProgram(connection, wallet);
		const globalMarketStatePDA = await findGlobalMarketStatePDA(globalMarketSeed);
		return program.account.globalMarketState.fetchNullable(globalMarketStatePDA[0]);
	}
);

const getBaseMintPK = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const globalMarketState = await getGlobalMarketStateAccountData(
			connection,
			wallet,
			globalMarketSeed
		);

		if (!globalMarketState) {
			throw Error("Market not found");
		}

		return globalMarketState.liquidityPoolTokenMintAccount;
	}
);

export const getUserBaseTokenAccount = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const baseMint = await getBaseMintPK(connection, wallet, globalMarketSeed);
		const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
			mint: baseMint,
		});

		return accounts.value[0];
	}
);

export const getUserBaseBalance = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const tokenAccount = await getUserBaseTokenAccount(connection, wallet, globalMarketSeed);

		if (!tokenAccount) {
			return ZERO;
		}

		return new Big(Number(tokenAccount.account.data.parsed.info.tokenAmount.amount));
	}
);

export const getLiquidityPoolBalance = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const liquidityPoolTokenAddress = await getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const balance = await connection.getTokenAccountBalance(liquidityPoolTokenAddress);

		if (!balance.value) {
			throw Error("Couldn't fetch market balance");
		}

		return Big(balance.value.amount);
	}
);

const getOutstandingCredit = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(
			connection,
			wallet,
			globalMarketSeed
		);

		if (!globalMarketStateData) {
			throw Error("Market not found");
		}

		return new Big(globalMarketStateData.totalOutstandingCredit.toNumber());
	}
);

export const getGatekeeperNetwork = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(
			connection,
			wallet,
			globalMarketSeed
		);

		if (!globalMarketStateData) {
			throw Error("Market not found");
		}

		return globalMarketStateData.gatekeeperNetwork;
	}
);

export const getClusterTime = multiAsync(async (connection: Connection) => {
	const slot = await connection.getSlot();
	return connection.getBlockTime(slot);
});

const getRunningAPY = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const _deals = await getDealAccounts(connection, wallet, globalMarketSeed);
		const _clusterTime = getClusterTime(connection);

		const [deals, clusterTime] = await Promise.all([_deals, _clusterTime]);

		if (!clusterTime) {
			throw Error("Could not fetch cluster time");
		}

		const runningAPY = deals.reduce((result, deal) => {
			const status = mapDealToStatus(deal.account, clusterTime);
			if (status === DealStatus.IN_PROGRESS) {
				const financingFeePercentage = deal.account.financingFeePercentage;
				const principal = new Big(deal.account.principal.toNumber());
				const percentage = applyRatio(financingFeePercentage, principal);

				result = result.add(percentage);
			}

			return result;
		}, new Big(0));

		return runningAPY;
	}
);

const getAPY = multiAsync(
	async (
		connection: Connection,
		wallet: typeof Wallet,
		globalMarketSeed: string
	): Promise<Ratio> => {
		const _tvl = getTVL(connection, wallet, globalMarketSeed);
		const _runningApy = getRunningAPY(connection, wallet, globalMarketSeed);

		const [tvl, runningAPY] = await Promise.all([_tvl, _runningApy]);

		if (tvl.eq(ZERO)) {
			return { numerator: 0, denominator: 1 };
		}

		const apy = runningAPY.div(tvl);

		return { numerator: apy.mul(new Big(100)).toNumber(), denominator: 100 };
	}
);

const getTVL = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet, globalMarketSeed);
		const _outstandingCredit = getOutstandingCredit(connection, wallet, globalMarketSeed);
		const [liquidityPoolBalance, outstandingCredit] = await Promise.all([
			_liquidityPoolBalance,
			_outstandingCredit,
		]);

		return liquidityPoolBalance.add(outstandingCredit);
	}
);

const getLiquidityPoolAssociatedBaseTokenAddressPK = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const signingAuthorityPDA = await findSigningAuthorityPDA(globalMarketSeed);
		return getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			signingAuthorityPDA[0],
			true,
			globalMarketSeed
		);
	}
);

const getTreasuryPoolTokenAccountPK = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(
			connection,
			wallet,
			globalMarketSeed
		);

		if (!globalMarketStateData) {
			throw Error("Market not found");
		}

		return globalMarketStateData.treasuryPoolTokenAccount;
	}
);

const getAssociatedBaseTokenAddressPK = multiAsync(
	async (
		connection: Connection,
		wallet: typeof Wallet,
		publicKey: PublicKey,
		offCurve: boolean,
		globalMarketSeed: string
	) => {
		const _baseMintPK = await getBaseMintPK(connection, wallet, globalMarketSeed);
		return await Token.getAssociatedTokenAddress(
			ASSOCIATED_TOKEN_PROGRAM_ID,
			TOKEN_PROGRAM_ID,
			_baseMintPK,
			publicKey,
			offCurve
		);
	}
);

const getInvestorLPAssociatedTokenAddress = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const lpTokenMintPK = await getLPTokenMintPK(connection, wallet, globalMarketSeed);
		return Token.getAssociatedTokenAddress(
			ASSOCIATED_TOKEN_PROGRAM_ID,
			TOKEN_PROGRAM_ID,
			lpTokenMintPK,
			wallet.publicKey
		);
	}
);

const getGatewayToken = multiAsync(
	async (
		connection: Connection,
		wallet: typeof Wallet,
		userPK: PublicKey,
		globalMarketSeed: string
	) => {
		// used from node_modules/@identity.com/solana-gateway-ts/src/lib `findGatewayTokens`
		// should be able to plug in our own program id in order to make it work locally
		const GATEWAY_TOKEN_ACCOUNT_OWNER_FIELD_OFFSET = 2;
		const GATEWAY_TOKEN_ACCOUNT_GATEKEEPER_NETWORK_FIELD_OFFSET = 35;
		const gatekeeperNetwork = await getGatekeeperNetwork(
			connection,
			wallet as typeof Wallet,
			globalMarketSeed
		);
		const ownerFilter = {
			memcmp: {
				offset: GATEWAY_TOKEN_ACCOUNT_OWNER_FIELD_OFFSET,
				bytes: userPK.toBase58(),
			},
		};
		const gatekeeperNetworkFilter = {
			memcmp: {
				offset: GATEWAY_TOKEN_ACCOUNT_GATEKEEPER_NETWORK_FIELD_OFFSET,
				bytes: gatekeeperNetwork.toBase58(),
			},
		};
		const filters = [ownerFilter, gatekeeperNetworkFilter];
		const accountsResponse = await connection.getProgramAccounts(
			config.clusterConfig.gatewayProgramId,
			{
				filters,
			}
		);

		if (accountsResponse.length === 0) {
			throw Error("No valid Civic gateway tokens found");
		}

		return dataToGatewayToken(
			GatewayTokenData.fromAccount(accountsResponse[0].account.data as Buffer),
			accountsResponse[0].pubkey
		);
	}
);

const getLPTokenMintPK = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(
			connection,
			wallet,
			globalMarketSeed
		);

		if (!globalMarketStateData) {
			throw Error("Market not found");
		}

		return globalMarketStateData.lpTokenMintAccount;
	}
);

export const getPoolStats = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const _tvl = getTVL(connection, wallet, globalMarketSeed);
		const _apy = getAPY(connection, wallet, globalMarketSeed);
		const _outstandingCredit = getOutstandingCredit(connection, wallet, globalMarketSeed);

		const [TVL, APY, outstandingCredit] = await Promise.all([_tvl, _apy, _outstandingCredit]);

		const poolStats: PoolStats = {
			TVL,
			APY,
			outstandingCredit,
		};

		return poolStats;
	}
);

export const depositInvestment = multiAsync(
	async (amount: Big, connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const depositAmount = new BN(amount.toNumber());
		const program = newCredixProgram(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
		const _lpTokenMintPK = getLPTokenMintPK(connection, wallet, globalMarketSeed);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey,
			false,
			globalMarketSeed
		);
		const _baseMintPK = getBaseMintPK(connection, wallet, globalMarketSeed);
		const _marketBaseTokenAccountPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const _signingAuthorityPDA = findSigningAuthorityPDA(globalMarketSeed);
		const _investorLPAssociatedTokenAddress = getInvestorLPAssociatedTokenAddress(
			connection,
			wallet,
			globalMarketSeed
		);
		const _getGatewayToken = getGatewayToken(
			connection,
			wallet,
			wallet.publicKey,
			globalMarketSeed
		);
		const _getCredixPassPDA = findCredixPassPDA(wallet.publicKey, globalMarketSeed);

		const [
			globalMarketStatePDA,
			lpTokenMintPK,
			userAssociatedBaseTokenAddressPK,
			baseMintPK,
			marketBaseTokenAccountPK,
			signingAuthorityPDA,
			investorLPAssociatedTokenAddress,
			gatewayToken,
			credixPass,
		] = await Promise.all([
			_globalMarketStatePDA,
			_lpTokenMintPK,
			_userAssociatedBaseTokenAddressPK,
			_baseMintPK,
			_marketBaseTokenAccountPK,
			_signingAuthorityPDA,
			_investorLPAssociatedTokenAddress,
			_getGatewayToken,
			_getCredixPassPDA,
		]);

		return program.rpc.depositFunds(depositAmount, {
			accounts: {
				investor: wallet.publicKey,
				gatewayToken: gatewayToken.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				investorTokenAccount: userAssociatedBaseTokenAddressPK,
				liquidityPoolTokenAccount: marketBaseTokenAccountPK,
				lpTokenMintAccount: lpTokenMintPK,
				investorLpTokenAccount: investorLPAssociatedTokenAddress,
				baseMintAccount: baseMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				credixPass: credixPass[0],
				systemProgram: SystemProgram.programId,
				rent: web3.SYSVAR_RENT_PUBKEY,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const withdrawInvestment = multiAsync(
	async (amount: Big, connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const program = newCredixProgram(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey,
			false,
			globalMarketSeed
		);
		const _lpTokenMintPK = getLPTokenMintPK(connection, wallet, globalMarketSeed);
		const _baseMint = getBaseMintPK(connection, wallet, globalMarketSeed);
		const _marketBaseTokenAccountPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const _signingAuthorityPDA = findSigningAuthorityPDA(globalMarketSeed);
		const _investorLPAssociatedTokenAddress = getInvestorLPAssociatedTokenAddress(
			connection,
			wallet,
			globalMarketSeed
		);
		const _getGatewayToken = getGatewayToken(
			connection,
			wallet,
			wallet.publicKey,
			globalMarketSeed
		);
		const _getCredixPassPDA = findCredixPassPDA(wallet.publicKey, globalMarketSeed);

		const [
			globalMarketStatePDA,
			userAssociatedBaseTokenAddressPK,
			lpTokenMintPK,
			baseMint,
			marketBaseTokenAccountPK,
			treasuryPoolTokenAccountPK,
			signingAuthorityPDA,
			investorLPAssociatedTokenAddress,
			gatewayToken,
			credixPass,
		] = await Promise.all([
			_globalMarketStatePDA,
			_userAssociatedBaseTokenAddressPK,
			_lpTokenMintPK,
			_baseMint,
			_marketBaseTokenAccountPK,
			_treasuryPoolTokenAccountPK,
			_signingAuthorityPDA,
			_investorLPAssociatedTokenAddress,
			_getGatewayToken,
			_getCredixPassPDA,
		]);

		const withdrawAmount = new BN(amount.toNumber());

		return program.rpc.withdrawFunds(withdrawAmount, {
			accounts: {
				investor: wallet.publicKey,
				gatewayToken: gatewayToken.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				investorLpTokenAccount: investorLPAssociatedTokenAddress,
				investorTokenAccount: userAssociatedBaseTokenAddressPK,
				liquidityPoolTokenAccount: marketBaseTokenAccountPK,
				treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
				lpTokenMintAccount: lpTokenMintPK,
				credixPass: credixPass[0],
				baseMintAccount: baseMint,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const getDealAccountData = multiAsync(
	async (
		connection: Connection,
		wallet: typeof Wallet,
		borrower: PublicKey,
		dealNumber: number,
		globalMarketSeed: string
	) => {
		const program = newCredixProgram(connection, wallet);
		const dealPDA = await findDealPDA(borrower, dealNumber, globalMarketSeed);
		return program.account.deal.fetchNullable(dealPDA[0]);
	}
);

export const getBorrowerInfoAccountData = multiAsync(
	async (
		connection: Connection,
		wallet: typeof Wallet,
		borrower: PublicKey,
		globalMarketSeed: string
	) => {
		const borrowerInfoPDA = await findBorrowerInfoPDA(borrower, globalMarketSeed);
		const program = newCredixProgram(connection, wallet);

		return program.account.borrowerInfo.fetchNullable(borrowerInfoPDA[0]);
	}
);

export const getWithdrawFeePercentage = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(
			connection,
			wallet,
			globalMarketSeed
		);

		if (!globalMarketStateData) {
			throw Error("Market not found");
		}

		return globalMarketStateData.withdrawalFee;
	}
);

export const getInterestFeePercentage = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(
			connection,
			wallet,
			globalMarketSeed
		);

		if (!globalMarketStateData) {
			throw Error("Market not found");
		}

		return globalMarketStateData.interestFee;
	}
);

export const createDeal = multiAsync(
	async (
		principal: Big,
		financingFee: number,
		timeToMaturity: number,
		borrower: PublicKey,
		dealNumber: number,
		dealName: string,
		connection: Connection,
		wallet: typeof Wallet,
		globalMarketSeed: string
	) => {
		const _dealPDA = findDealPDA(borrower, dealNumber, globalMarketSeed);
		const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
		const _getCredixPassPDA = findCredixPassPDA(borrower, globalMarketSeed);
		const _borrowerInfoPDA = findBorrowerInfoPDA(borrower, globalMarketSeed);
		const _getGatewayToken = getGatewayToken(connection, wallet, borrower, globalMarketSeed);

		const [dealPDA, globalMarketStatePDA, borrowerInfoPDA, gatewayToken, credixPass] =
			await Promise.all([
				_dealPDA,
				_globalMarketStatePDA,
				_borrowerInfoPDA,
				_getGatewayToken,
				_getCredixPassPDA,
			]);

		const program = newCredixProgram(connection, wallet);

		const principalAmount = new BN(principal.toNumber());
		const financingFreeFraction = new Fraction(financingFee);

		const financingFeeAmount: Ratio = {
			numerator: financingFreeFraction.n,
			denominator: financingFreeFraction.d * 100,
		};

		return program.rpc.createDeal(
			dealPDA[1],
			borrowerInfoPDA[1],
			principalAmount,
			financingFeeAmount,
			0,
			0,
			timeToMaturity,
			dealName,
			{
				accounts: {
					owner: wallet.publicKey,
					gatewayToken: gatewayToken.publicKey,
					borrower: borrower,
					borrowerInfo: borrowerInfoPDA[0],
					globalMarketState: globalMarketStatePDA[0],
					credixPass: credixPass[0],
					deal: dealPDA[0],
					systemProgram: SystemProgram.programId,
				},
			}
		);
	}
);

export const activateDeal = multiAsync(
	async (
		borrower: PublicKey,
		dealNumber: number,
		connection: Connection,
		wallet: typeof Wallet,
		globalMarketSeed: string
	) => {
		const program = newCredixProgram(connection, wallet);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			borrower,
			false,
			globalMarketSeed
		);
		const _baseMintPK = getBaseMintPK(connection, wallet, globalMarketSeed);
		const _liquidityPoolAssociatedBaseTokenAddressPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
		const _dealPDA = findDealPDA(borrower, dealNumber, globalMarketSeed);
		const _signingAuthorityPDA = findSigningAuthorityPDA(globalMarketSeed);
		const _getGatewayToken = getGatewayToken(connection, wallet, borrower, globalMarketSeed);
		const _getCredixPassPDA = findCredixPassPDA(borrower, globalMarketSeed);

		const [
			userAssociatedBaseTokenAddressPK,
			baseMintPK,
			liquidityPoolAssociatedBaseTokenAddressPK,
			globalMarketStatePDA,
			dealPDA,
			signingAuthorityPDA,
			gatewayToken,
			credixPass,
		] = await Promise.all([
			_userAssociatedBaseTokenAddressPK,
			_baseMintPK,
			_liquidityPoolAssociatedBaseTokenAddressPK,
			_globalMarketStatePDA,
			_dealPDA,
			_signingAuthorityPDA,
			_getGatewayToken,
			_getCredixPassPDA,
		]);

		return program.rpc.activateDeal({
			accounts: {
				owner: wallet.publicKey,
				gatewayToken: gatewayToken.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				deal: dealPDA[0],
				liquidityPoolTokenAccount: liquidityPoolAssociatedBaseTokenAddressPK,
				borrower: borrower,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				borrowerTokenAccount: userAssociatedBaseTokenAddressPK,
				credixPass: credixPass[0],
				baseMintAccount: baseMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: web3.SYSVAR_RENT_PUBKEY,
			},
		});
	}
);

const getLPTokenSupply = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const lpTokenMintPK = await getLPTokenMintPK(connection, wallet, globalMarketSeed);
		return connection
			.getTokenSupply(lpTokenMintPK)
			.then((response) => new Big(Number(response.value.amount)));
	}
);

const getLPTokenPrice = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const _tvl = getTVL(connection, wallet, globalMarketSeed);
		const _lpTokenSupply = getLPTokenSupply(connection, wallet, globalMarketSeed);

		const [tvl, lpTokenSupply] = await Promise.all([_tvl, _lpTokenSupply]);

		if (lpTokenSupply.eq(ZERO)) {
			return ZERO;
		}

		return tvl.div(lpTokenSupply);
	}
);

const getUserLPTokenAccount = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const _lpTokenMintPK = getLPTokenMintPK(connection, wallet, globalMarketSeed);
		const _investorLPAssociatedTokenAddress = getInvestorLPAssociatedTokenAddress(
			connection,
			wallet,
			globalMarketSeed
		);

		const [lpTokenMintPK, investorLPAssociatedTokenAddress] = await Promise.all([
			_lpTokenMintPK,
			_investorLPAssociatedTokenAddress,
		]);

		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
			mint: lpTokenMintPK,
		});

		return tokenAccounts.value.filter((tokenAccount) =>
			tokenAccount.pubkey.equals(investorLPAssociatedTokenAddress)
		)[0];
	}
);

const getUserLPTokenAmount = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const userLPTokenAccount = await getUserLPTokenAccount(connection, wallet, globalMarketSeed);

		if (!userLPTokenAccount) {
			return ZERO;
		}

		return new Big(Number(userLPTokenAccount.account.data.parsed.info.tokenAmount.amount));
	}
);

export const getLPTokenBaseBalance = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, globalMarketSeed: string) => {
		const _lpTokenPrice = getLPTokenPrice(connection, wallet, globalMarketSeed);
		const _userLPTokenAmount = getUserLPTokenAmount(connection, wallet, globalMarketSeed);

		const [lpTokenPrice, userLPTokenAmount] = await Promise.all([
			_lpTokenPrice,
			_userLPTokenAmount,
		]);

		return userLPTokenAmount.mul(lpTokenPrice);
	}
);

export const repayDeal = multiAsync(
	async (
		amount: Big,
		repaymentType: RepaymentType,
		dealNumber: number,
		connection: Connection,
		wallet: typeof Wallet,
		globalMarketSeed: string
	) => {
		const program = newCredixProgram(connection, wallet);
		const repayAmount = new BN(amount.toNumber());

		const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey,
			false,
			globalMarketSeed
		);
		const _dealPDA = findDealPDA(wallet.publicKey, dealNumber, globalMarketSeed);
		const _liquidityPoolAssociatedBaseTokenAddressPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const _baseMintPK = getBaseMintPK(connection, wallet, globalMarketSeed);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const _signingAuthorityPDA = findSigningAuthorityPDA(globalMarketSeed);
		const _getGatewayToken = getGatewayToken(
			connection,
			wallet,
			wallet.publicKey,
			globalMarketSeed
		);
		const _getCredixPassPDA = findCredixPassPDA(wallet.publicKey, globalMarketSeed);

		const [
			globalMarketStatePDA,
			userAssociatedBaseTokenAddressPK,
			dealPDA,
			liquidityPoolAssociatedBaseTokenAddressPK,
			baseMintPK,
			treasuryPoolTokenAccountPK,
			signingAuthorityPDA,
			gatewayToken,
			credixPass,
		] = await Promise.all([
			_globalMarketStatePDA,
			_userAssociatedBaseTokenAddressPK,
			_dealPDA,
			_liquidityPoolAssociatedBaseTokenAddressPK,
			_baseMintPK,
			_treasuryPoolTokenAccountPK,
			_signingAuthorityPDA,
			_getGatewayToken,
			_getCredixPassPDA,
		]);

		await program.rpc.makeDealRepayment(repayAmount, repaymentType, {
			accounts: {
				borrower: wallet.publicKey,
				gatewayToken: gatewayToken.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				borrowerTokenAccount: userAssociatedBaseTokenAddressPK,
				deal: dealPDA[0],
				liquidityPoolTokenAccount: liquidityPoolAssociatedBaseTokenAddressPK,
				treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
				signingAuthority: signingAuthorityPDA[0],
				baseMintAccount: baseMintPK,
				credixPass: credixPass[0],
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const issueCredixPass = async (
	publicKey: PublicKey,
	isUnderwriter: boolean,
	isBorrower: boolean,
	connection: Connection,
	wallet: typeof Wallet,
	globalMarketSeed: string
) => {
	const program = newCredixProgram(connection, wallet);
	const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
	const _getCredixPassPDA = findCredixPassPDA(publicKey, globalMarketSeed);

	const [globalMarketStatePDA, credixPassPDA] = await Promise.all([
		_globalMarketStatePDA,
		_getCredixPassPDA,
	]);

	return program.rpc.createCredixPass(credixPassPDA[1], isUnderwriter, isBorrower, {
		accounts: {
			owner: wallet.publicKey,
			passHolder: publicKey,
			credixPass: credixPassPDA[0],
			systemProgram: SystemProgram.programId,
			rent: web3.SYSVAR_RENT_PUBKEY,
			globalMarketState: globalMarketStatePDA[0],
		},
		signers: [],
	});
};

export const updateCredixPass = async (
	publicKey: PublicKey,
	isActive: boolean,
	isUnderwriter: boolean,
	isBorrower: boolean,
	connection: Connection,
	wallet: typeof Wallet,
	globalMarketSeed: string
) => {
	const program = newCredixProgram(connection, wallet);

	const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
	const _getCredixPassPDA = findCredixPassPDA(publicKey, globalMarketSeed);

	const [globalMarketStatePDA, credixPassPDA] = await Promise.all([
		_globalMarketStatePDA,
		_getCredixPassPDA,
	]);

	return program.rpc.updateCredixPass(isActive, isUnderwriter, isBorrower, {
		accounts: {
			owner: wallet.publicKey,
			passHolder: publicKey,
			credixPass: credixPassPDA[0],
			globalMarketState: globalMarketStatePDA[0],
		},
		signers: [],
	});
};

export const getCredixPassInfo = multiAsync(
	async (
		publicKey: PublicKey,
		connection: Connection,
		wallet: typeof Wallet,
		globalMarketSeed: string
	) => {
		const program = newCredixProgram(connection, wallet);
		const [credixPassPDA] = await findCredixPassPDA(publicKey, globalMarketSeed);
		return program.account.credixPass.fetchNullable(credixPassPDA);
	}
);
