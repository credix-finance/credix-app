import { BN, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { DealStatus, PoolStats, Ratio, RepaymentType } from "types/program.types";
import { multiAsync } from "utils/async.utils";
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

export const getDealAccounts = multiAsync(async (connection, wallet, borrower?: PublicKey) => {
	const program = newCredixProgram(connection, wallet);

	const deals = await program.account.deal.all();

	if (borrower) {
		return deals.filter((deal) => deal.account.borrower.equals(borrower));
	}

	return deals;
});

const getGlobalMarketStateAccountData = multiAsync(
	async (connection: Connection, wallet: typeof Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const globalMarketStatePDA = await findGlobalMarketStatePDA();
		return program.account.globalMarketState.fetch(globalMarketStatePDA[0]);
	}
);

const getBaseMintPK = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const globalMarketState = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketState.liquidityPoolTokenMintAccount;
});

export const getUserBaseTokenAccount = multiAsync(
	async (connection: Connection, wallet: typeof Wallet) => {
		const baseMint = await getBaseMintPK(connection, wallet);
		const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
			mint: baseMint,
		});

		return accounts.value[0];
	}
);

export const getUserBaseBalance = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const tokenAccount = await getUserBaseTokenAccount(connection, wallet);

	if (!tokenAccount) {
		return ZERO;
	}

	return new Big(Number(tokenAccount.account.data.parsed.info.tokenAmount.amount));
});

export const getLiquidityPoolBalance = multiAsync(
	async (connection: Connection, wallet: typeof Wallet) => {
		const liquidityPoolTokenAddress = await getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet
		);
		const balance = await connection.getTokenAccountBalance(liquidityPoolTokenAddress);

		if (!balance.value) {
			throw Error("Couldn't fetch market balance");
		}

		return Big(balance.value.amount);
	}
);

const getOutstandingCredit = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return new Big(globalMarketStateData.totalOutstandingCredit.toNumber());
});

export const getGatekeeperNetwork = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.gatekeeperNetwork;
});

export const getClusterTime = multiAsync(async (connection: Connection) => {
	const slot = await connection.getSlot();
	return connection.getBlockTime(slot);
});

const getRunningAPY = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const _deals = await getDealAccounts(connection, wallet);
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
});

const getAPY = multiAsync(async (connection: Connection, wallet: typeof Wallet): Promise<Ratio> => {
	const _tvl = getTVL(connection, wallet);
	const _runningApy = getRunningAPY(connection, wallet);

	const [tvl, runningAPY] = await Promise.all([_tvl, _runningApy]);

	if (tvl.eq(ZERO)) {
		return { numerator: 0, denominator: 1 };
	}

	const apy = runningAPY.div(tvl);

	return { numerator: apy.mul(new Big(100)).toNumber(), denominator: 100 };
});

const getTVL = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const [liquidityPoolBalance, outstandingCredit] = await Promise.all([
		_liquidityPoolBalance,
		_outstandingCredit,
	]);

	return liquidityPoolBalance.add(outstandingCredit);
});

const getLiquidityPoolAssociatedBaseTokenAddressPK = multiAsync(
	async (connection: Connection, wallet: typeof Wallet) => {
		const signingAuthorityPDA = await findSigningAuthorityPDA();
		return getAssociatedBaseTokenAddressPK(connection, wallet, signingAuthorityPDA[0], true);
	}
);

const getTreasuryPoolTokenAccountPK = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.treasuryPoolTokenAccount;
});

const getAssociatedBaseTokenAddressPK = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, publicKey: PublicKey, offCurve: boolean) => {
		const _baseMintPK = await getBaseMintPK(connection, wallet);
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
	async (connection: Connection, wallet: typeof Wallet) => {
		const lpTokenMintPK = await getLPTokenMintPK(connection, wallet);
		return Token.getAssociatedTokenAddress(
			ASSOCIATED_TOKEN_PROGRAM_ID,
			TOKEN_PROGRAM_ID,
			lpTokenMintPK,
			wallet.publicKey
		);
	}
);

const getGatewayToken = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, userPK: PublicKey) => {
		// used from node_modules/@identity.com/solana-gateway-ts/src/lib `findGatewayTokens`
		// should be able to plug in our own program id in order to make it work locally
		const GATEWAY_TOKEN_ACCOUNT_OWNER_FIELD_OFFSET = 2;
		const GATEWAY_TOKEN_ACCOUNT_GATEKEEPER_NETWORK_FIELD_OFFSET = 35;
		const gatekeeperNetwork = await getGatekeeperNetwork(connection, wallet as typeof Wallet);
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

const getLPTokenMintPK = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.lpTokenMintAccount;
});

export const getPoolStats = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const _tvl = getTVL(connection, wallet);
	const _apy = getAPY(connection, wallet);
	const _outstandingCredit = getOutstandingCredit(connection, wallet);

	const [TVL, APY, outstandingCredit] = await Promise.all([_tvl, _apy, _outstandingCredit]);

	const poolStats: PoolStats = {
		TVL,
		APY,
		outstandingCredit,
	};

	return poolStats;
});

export const depositInvestment = multiAsync(
	async (amount: Big, connection: Connection, wallet: typeof Wallet) => {
		const depositAmount = new BN(amount.toNumber());
		const program = newCredixProgram(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _lpTokenMintPK = getLPTokenMintPK(connection, wallet);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey,
			false
		);
		const _baseMintPK = getBaseMintPK(connection, wallet);
		const _marketBaseTokenAccountPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet
		);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _investorLPAssociatedTokenAddress = getInvestorLPAssociatedTokenAddress(
			connection,
			wallet
		);
		const _getGatewayToken = getGatewayToken(connection, wallet, wallet.publicKey);
		const _getCredixPassPDA = findCredixPassPDA(wallet.publicKey);

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
	async (amount: Big, connection: Connection, wallet: typeof Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey,
			false
		);
		const _lpTokenMintPK = getLPTokenMintPK(connection, wallet);
		const _baseMint = getBaseMintPK(connection, wallet);
		const _marketBaseTokenAccountPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet
		);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _investorLPAssociatedTokenAddress = getInvestorLPAssociatedTokenAddress(
			connection,
			wallet
		);
		const _getGatewayToken = getGatewayToken(connection, wallet, wallet.publicKey);
		const _getCredixPassPDA = findCredixPassPDA(wallet.publicKey);

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
	async (connection: Connection, wallet: typeof Wallet, borrower: PublicKey, dealNumber: number) => {
		const program = newCredixProgram(connection, wallet);
		const dealPDA = await findDealPDA(borrower, dealNumber);
		return program.account.deal.fetchNullable(dealPDA[0]);
	}
);

export const getBorrowerInfoAccountData = multiAsync(
	async (connection: Connection, wallet: typeof Wallet, borrower: PublicKey) => {
		const borrowerInfoPDA = await findBorrowerInfoPDA(borrower);
		const program = newCredixProgram(connection, wallet);

		return program.account.borrowerInfo.fetchNullable(borrowerInfoPDA[0]);
	}
);

export const getWithdrawFeePercentage = multiAsync(
	async (connection: Connection, wallet: typeof Wallet) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);

		return globalMarketStateData.withdrawalFee;
	}
);

export const getInterestFeePercentage = multiAsync(
	async (connection: Connection, wallet: typeof Wallet) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);

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
		wallet: typeof Wallet
	) => {
		const _dealPDA = findDealPDA(borrower, dealNumber);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _getCredixPassPDA = findCredixPassPDA(borrower);
		const _borrowerInfoPDA = findBorrowerInfoPDA(borrower);
		const _getGatewayToken = getGatewayToken(connection, wallet, borrower);

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
	async (borrower: PublicKey, dealNumber: number, connection: Connection, wallet: typeof Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			borrower,
			false
		);
		const _baseMintPK = getBaseMintPK(connection, wallet);
		const _liquidityPoolAssociatedBaseTokenAddressPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet
		);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _dealPDA = findDealPDA(borrower, dealNumber);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _getGatewayToken = getGatewayToken(connection, wallet, borrower);
		const _getCredixPassPDA = findCredixPassPDA(borrower);

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

const getLPTokenSupply = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const lpTokenMintPK = await getLPTokenMintPK(connection, wallet);
	return connection
		.getTokenSupply(lpTokenMintPK)
		.then((response) => new Big(Number(response.value.amount)));
});

const getLPTokenPrice = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const _tvl = getTVL(connection, wallet);
	const _lpTokenSupply = getLPTokenSupply(connection, wallet);

	const [tvl, lpTokenSupply] = await Promise.all([_tvl, _lpTokenSupply]);

	if (lpTokenSupply.eq(ZERO)) {
		return ZERO;
	}

	return tvl.div(lpTokenSupply);
});

const getUserLPTokenAccount = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const _lpTokenMintPK = getLPTokenMintPK(connection, wallet);
	const _investorLPAssociatedTokenAddress = getInvestorLPAssociatedTokenAddress(connection, wallet);

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
});

const getUserLPTokenAmount = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const userLPTokenAccount = await getUserLPTokenAccount(connection, wallet);

	if (!userLPTokenAccount) {
		return ZERO;
	}

	return new Big(Number(userLPTokenAccount.account.data.parsed.info.tokenAmount.amount));
});

export const getLPTokenBaseBalance = multiAsync(async (connection: Connection, wallet: typeof Wallet) => {
	const _lpTokenPrice = getLPTokenPrice(connection, wallet);
	const _userLPTokenAmount = getUserLPTokenAmount(connection, wallet);

	const [lpTokenPrice, userLPTokenAmount] = await Promise.all([_lpTokenPrice, _userLPTokenAmount]);

	return userLPTokenAmount.mul(lpTokenPrice);
});

export const repayDeal = multiAsync(
	async (
		amount: Big,
		repaymentType: RepaymentType,
		dealNumber: number,
		connection: Connection,
		wallet: typeof Wallet
	) => {
		const program = newCredixProgram(connection, wallet);
		const repayAmount = new BN(amount.toNumber());

		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey,
			false
		);
		const _dealPDA = findDealPDA(wallet.publicKey, dealNumber);
		const _liquidityPoolAssociatedBaseTokenAddressPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet
		);
		const _baseMintPK = getBaseMintPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _getGatewayToken = getGatewayToken(connection, wallet, wallet.publicKey);
		const _getCredixPassPDA = findCredixPassPDA(wallet.publicKey);

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
	wallet: typeof Wallet
) => {
	const program = newCredixProgram(connection, wallet);
	const _globalMarketStatePDA = findGlobalMarketStatePDA();
	const _getCredixPassPDA = findCredixPassPDA(publicKey);

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
	wallet: typeof Wallet
) => {
	const program = newCredixProgram(connection, wallet);

	const _globalMarketStatePDA = findGlobalMarketStatePDA();
	const _getCredixPassPDA = findCredixPassPDA(publicKey);

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
	async (publicKey: PublicKey, connection: Connection, wallet: typeof Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const [credixPassPDA] = await findCredixPassPDA(publicKey);
		return program.account.credixPass.fetchNullable(credixPassPDA);
	}
);
