import { BN, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SystemProgram } from "@solana/web3.js";
import { divide } from "lodash";
import { DealStatus, PoolStats, RepaymentType } from "types/program.types";
import { multiAsync } from "utils/async.utils";
import { mapDealToStatus } from "utils/deal.utils";
import { toProgramAmount, toProgramPercentage } from "utils/format.utils";
import { percentage } from "utils/math.utils";
import {
	findGlobalMarketStatePDA,
	findSigningAuthorityPDA,
	findDealPDA,
	findBorrowerInfoPDA,
	findCredixPassPDA,
} from "./pda";
import { newCredixProgram } from "./program";

export const getDealAccounts = multiAsync(async (connection, wallet) => {
	const program = newCredixProgram(connection, wallet);

	return program.account.deal.all();
});

const getGlobalMarketStateAccountData = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const globalMarketStatePDA = await findGlobalMarketStatePDA();
		return program.account.globalMarketState.fetch(globalMarketStatePDA[0]);
	}
);

const getUSDCMintPK = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const marketUSDCTokenAccount = await getMarketUSDCTokenAccountPK(connection, wallet);
	const marketUSDCTokenAccountInfo = await connection.getParsedAccountInfo(marketUSDCTokenAccount);

	if (!marketUSDCTokenAccountInfo.value) {
		throw Error("Couldn't fetch lp token account info");
	}

	return new PublicKey(
		(marketUSDCTokenAccountInfo.value.data as ParsedAccountData).parsed.info.mint
	);
});

export const getUserUSDCTokenAccount = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const usdcMint = await getUSDCMintPK(connection, wallet);
		const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
			mint: usdcMint,
		});

		return accounts.value[0];
	}
);

export const getUserUSDCBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const tokenAccount = await getUserUSDCTokenAccount(connection, wallet);

	if (!tokenAccount) {
		return 0;
	}

	return Number(tokenAccount.account.data.parsed.info.tokenAmount.amount);
});

export const getLiquidityPoolBalance = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
		return globalMarketStateData.liquidityPoolUsdcAmount.toNumber();
	}
);

const getOutstandingCredit = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.totalOutstandingCredit.toNumber();
});

export const getClusterTime = multiAsync(async (connection: Connection) => {
	const slot = await connection.getSlot();
	return connection.getBlockTime(slot);
});

const getRunningAPY = multiAsync(async (connection: Connection, wallet: Wallet) => {
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
			const principal = deal.account.principal.toNumber();

			result += percentage(principal, financingFeePercentage);
		}

		return result;
	}, 0);

	return runningAPY;
});

const getAPY = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _outstandingCredit: Promise<number> = getOutstandingCredit(connection, wallet);
	const _liquidityPoolBalance: Promise<number> = getLiquidityPoolBalance(connection, wallet);
	const _runningApy = getRunningAPY(connection, wallet);

	const [liquidityPoolBalance, outstandingCredit, runningAPY] = await Promise.all([
		_liquidityPoolBalance,
		_outstandingCredit,
		_runningApy,
	]);

	if (liquidityPoolBalance === 0 && outstandingCredit === 0) {
		return 0;
	}

	return divide(runningAPY, outstandingCredit + liquidityPoolBalance);
});

const getSolendBuffer = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const liquidityPoolBalance = await getLiquidityPoolBalance(connection, wallet);
	return liquidityPoolBalance;
});

const getTVL = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const outstandingCreditCall = getOutstandingCredit(connection, wallet);
	const [liquidityPoolBalance, outstandingCredit] = await Promise.all([
		_liquidityPoolBalance,
		outstandingCreditCall,
	]);

	return liquidityPoolBalance + outstandingCredit;
});

const getMarketUSDCTokenAccountPK = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.liquidityPoolTokenAccount;
});

const getTreasuryPoolTokenAccountPK = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.treasuryPoolTokenAccount;
});

const getAssociatedUSDCTokenAddressPK = multiAsync(
	async (connection: Connection, wallet: Wallet, publicKey: PublicKey) => {
		const _usdcMintPK = await getUSDCMintPK(connection, wallet);
		return await Token.getAssociatedTokenAddress(
			ASSOCIATED_TOKEN_PROGRAM_ID,
			TOKEN_PROGRAM_ID,
			_usdcMintPK,
			publicKey
		);
	}
);

const getDepositorLPAssociatedTokenAddress = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const lpTokenMintPK = await getLPTokenMintPK(connection, wallet);
		return Token.getAssociatedTokenAddress(
			ASSOCIATED_TOKEN_PROGRAM_ID,
			TOKEN_PROGRAM_ID,
			lpTokenMintPK,
			wallet.publicKey
		);
	}
);

const getLPTokenMintPK = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.lpTokenMintAccount;
});

export const getPoolStats = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _tvl = getTVL(connection, wallet);
	const _apy = getAPY(connection, wallet);
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const _solendBuffer = getSolendBuffer(connection, wallet);

	const [TVL, APY, outstandingCredit, solendBuffer] = await Promise.all([
		_tvl,
		_apy,
		_outstandingCredit,
		_solendBuffer,
	]);

	const poolStats: PoolStats = {
		TVL,
		APY,
		outstandingCredit,
		solendBuffer,
	};

	return poolStats;
});

export const depositInvestment = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		const depositAmount = new BN(toProgramAmount(amount));
		const program = newCredixProgram(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _lpTokenMintPK = getLPTokenMintPK(connection, wallet);
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey
		);
		const _usdcMintPK = getUSDCMintPK(connection, wallet);
		const _marketUSDCTokenAccountPK = getMarketUSDCTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _depositorLPAssociatedTokenAddress = getDepositorLPAssociatedTokenAddress(
			connection,
			wallet
		);
		const _getCredixPass = findCredixPassPDA(wallet.publicKey);

		const [
			globalMarketStatePDA,
			lpTokenMintPK,
			userAssociatedUSDCTokenAddressPK,
			usdcMintPK,
			marketUSDCTokenAccountPK,
			signingAuthorityPDA,
			depositorLPAssociatedTokenAddress,
			credixPass,
		] = await Promise.all([
			_globalMarketStatePDA,
			_lpTokenMintPK,
			_userAssociatedUSDCTokenAddressPK,
			_usdcMintPK,
			_marketUSDCTokenAccountPK,
			_signingAuthorityPDA,
			_depositorLPAssociatedTokenAddress,
			_getCredixPass,
		]);

		return program.rpc.depositFunds(depositAmount, {
			accounts: {
				depositor: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				depositorTokenAccount: userAssociatedUSDCTokenAddressPK,
				liquidityPoolTokenAccount: marketUSDCTokenAccountPK,
				lpTokenMintAccount: lpTokenMintPK,
				depositorLpTokenAccount: depositorLPAssociatedTokenAddress,
				usdcMintAccount: usdcMintPK,
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
	async (amount: number, connection: Connection, wallet: Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const _lpTokenPrice = getLPTokenPrice(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey
		);
		const _lpTokenMintPK = getLPTokenMintPK(connection, wallet);
		const _usdcMint = getUSDCMintPK(connection, wallet);
		const _marketUSDCTokenAccountPK = getMarketUSDCTokenAccountPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _depositorLPAssociatedTokenAddress = getDepositorLPAssociatedTokenAddress(
			connection,
			wallet
		);
		const _getCredixPass = findCredixPassPDA(wallet.publicKey);

		const [
			lpTokenPrice,
			globalMarketStatePDA,
			userAssociatedUSDCTokenAddressPK,
			lpTokenMintPK,
			usdcMint,
			marketUSDCTokenAccountPK,
			treasuryPoolTokenAccountPK,
			signingAuthorityPDA,
			depositorLPAssociatedTokenAddress,
			credixPass,
		] = await Promise.all([
			_lpTokenPrice,
			_globalMarketStatePDA,
			_userAssociatedUSDCTokenAddressPK,
			_lpTokenMintPK,
			_usdcMint,
			_marketUSDCTokenAccountPK,
			_treasuryPoolTokenAccountPK,
			_signingAuthorityPDA,
			_depositorLPAssociatedTokenAddress,
			_getCredixPass,
		]);

		const withdrawAmount = new BN(toProgramAmount(amount / lpTokenPrice));

		return program.rpc.withdrawFunds(withdrawAmount, {
			accounts: {
				withdrawer: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				withdrawerLpTokenAccount: depositorLPAssociatedTokenAddress,
				withdrawerTokenAccount: userAssociatedUSDCTokenAddressPK,
				liquidityPoolTokenAccount: marketUSDCTokenAccountPK,
				treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
				lpTokenMintAccount: lpTokenMintPK,
				credixPass: credixPass[0],
				usdcMintAccount: usdcMint,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const getDealAccountData = multiAsync(
	async (connection: Connection, wallet: Wallet, dealNumber: number) => {
		const program = newCredixProgram(connection, wallet);
		const dealPDA = await findDealPDA(wallet.publicKey, dealNumber);
		return program.account.deal.fetchNullable(dealPDA[0]);
	}
);

export const getBorrowerInfoAccountData = multiAsync(
	async (connection: Connection, wallet: Wallet, borrower: PublicKey) => {
		const borrowerInfoPDA = await findBorrowerInfoPDA(borrower);
		const program = newCredixProgram(connection, wallet);

		return program.account.borrowerInfo.fetchNullable(borrowerInfoPDA[0]);
	}
);

export const createDeal = multiAsync(
	async (
		principal: number,
		financingFee: number,
		timeToMaturity: number,
		borrower: PublicKey,
		dealNumber: number,
		dealName: string,
		connection: Connection,
		wallet: Wallet
	) => {
		const _dealPDA = findDealPDA(borrower, dealNumber);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _getCredixPass = findCredixPassPDA(borrower);
		const _borrowerInfoPDA = findBorrowerInfoPDA(borrower);

		const [dealPDA, globalMarketStatePDA, borrowerInfoPDA, credixPass] = await Promise.all([
			_dealPDA,
			_globalMarketStatePDA,
			_borrowerInfoPDA,
			_getCredixPass,
		]);

		const program = newCredixProgram(connection, wallet);

		const principalAmount = new BN(toProgramAmount(principal));
		const financingFeeAmount = new BN(toProgramPercentage(financingFee));

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
	async (borrower: PublicKey, dealNumber: number, connection: Connection, wallet: Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(
			connection,
			wallet,
			borrower
		);
		const _usdcMintPK = getUSDCMintPK(connection, wallet);
		const _liquidityPoolAssociatedUSDCTokenAddressPK = getMarketUSDCTokenAccountPK(
			connection,
			wallet
		);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _dealPDA = findDealPDA(borrower, dealNumber);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _getCredixPass = findCredixPassPDA(borrower);

		const [
			userAssociatedUSDCTokenAddressPK,
			usdcMintPK,
			liquidityPoolAssociatedUSDCTokenAddressPK,
			globalMarketStatePDA,
			dealPDA,
			signingAuthorityPDA,
			credixPass,
		] = await Promise.all([
			_userAssociatedUSDCTokenAddressPK,
			_usdcMintPK,
			_liquidityPoolAssociatedUSDCTokenAddressPK,
			_globalMarketStatePDA,
			_dealPDA,
			_signingAuthorityPDA,
			_getCredixPass,
		]);

		return program.rpc.activateDeal({
			accounts: {
				owner: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				deal: dealPDA[0],
				liquidityPoolTokenAccount: liquidityPoolAssociatedUSDCTokenAddressPK,
				borrower: borrower,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				borrowerTokenAccount: userAssociatedUSDCTokenAddressPK,
				credixPass: credixPass[0],
				usdcMintAccount: usdcMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: web3.SYSVAR_RENT_PUBKEY,
			},
		});
	}
);

const getLPTokenSupply = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpTokenMintPK = await getLPTokenMintPK(connection, wallet);
	return connection.getTokenSupply(lpTokenMintPK).then((response) => Number(response.value.amount));
});

const getLPTokenPrice = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const _lpTokenSupply = getLPTokenSupply(connection, wallet);

	const [outstandingCredit, liquidityPoolBalance, lpTokenSupply] = await Promise.all([
		_outstandingCredit,
		_liquidityPoolBalance,
		_lpTokenSupply,
	]);

	return lpTokenSupply && divide(outstandingCredit + liquidityPoolBalance, lpTokenSupply);
});

const getUserLPTokenAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _lpTokenMintPK = getLPTokenMintPK(connection, wallet);
	const _depositorLPAssociatedTokenAddress = getDepositorLPAssociatedTokenAddress(
		connection,
		wallet
	);

	const [lpTokenMintPK, depositorLPAssociatedTokenAddress] = await Promise.all([
		_lpTokenMintPK,
		_depositorLPAssociatedTokenAddress,
	]);

	const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
		mint: lpTokenMintPK,
	});

	return tokenAccounts.value.filter((tokenAccount) =>
		tokenAccount.pubkey.equals(depositorLPAssociatedTokenAddress)
	)[0];
});

const getUserLPTokenAmount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const userLPTokenAccount = await getUserLPTokenAccount(connection, wallet);

	if (!userLPTokenAccount) {
		return 0;
	}

	return Number(userLPTokenAccount.account.data.parsed.info.tokenAmount.amount);
});

export const getLPTokenUSDCBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _lpTokenPrice = getLPTokenPrice(connection, wallet);
	const _userLPTokenAmount = getUserLPTokenAmount(connection, wallet);

	const [lpTokenPrice, userLPTokenAmount] = await Promise.all([_lpTokenPrice, _userLPTokenAmount]);

	return userLPTokenAmount * lpTokenPrice;
});

export const repayDeal = multiAsync(
	async (
		amount: number,
		repaymentType: RepaymentType,
		dealNumber: number,
		connection: Connection,
		wallet: Wallet
	) => {
		const program = newCredixProgram(connection, wallet);
		const repayAmount = new BN(amount);

		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(
			connection,
			wallet,
			wallet.publicKey
		);
		const _dealPDA = findDealPDA(wallet.publicKey, dealNumber);
		const _liquidityPoolAssociatedUSDCTokenAddressPK = getMarketUSDCTokenAccountPK(
			connection,
			wallet
		);
		const _usdcMintPK = getUSDCMintPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();
		const _getCredixPass = findCredixPassPDA(wallet.publicKey);

		const [
			globalMarketStatePDA,
			userAssociatedUSDCTokenAddressPK,
			dealPDA,
			liquidityPoolAssociatedUSDCTokenAddressPK,
			usdcMintPK,
			treasuryPoolTokenAccountPK,
			signingAuthorityPDA,
			credixPass,
		] = await Promise.all([
			_globalMarketStatePDA,
			_userAssociatedUSDCTokenAddressPK,
			_dealPDA,
			_liquidityPoolAssociatedUSDCTokenAddressPK,
			_usdcMintPK,
			_treasuryPoolTokenAccountPK,
			_signingAuthorityPDA,
			_getCredixPass,
		]);

		await program.rpc.makeDealRepayment(repayAmount, repaymentType, {
			accounts: {
				borrower: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				borrowerTokenAccount: userAssociatedUSDCTokenAddressPK,
				deal: dealPDA[0],
				liquidityPoolTokenAccount: liquidityPoolAssociatedUSDCTokenAddressPK,
				treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
				signingAuthority: signingAuthorityPDA[0],
				usdcMintAccount: usdcMintPK,
				credixPass: credixPass[0],
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const issueCredixPass = multiAsync(
	async (
		publicKey: PublicKey,
		isUnderwriter: boolean,
		isBorrower: boolean,
		connection: Connection,
		wallet: Wallet
	) => {
		const program = newCredixProgram(connection, wallet);

		const [credixPassPDA, passBump] = await findCredixPassPDA(publicKey);

		await program.rpc.createCredixPass(passBump, isUnderwriter, isBorrower, {
			accounts: {
				owner: wallet.publicKey,
				passHolder: publicKey,
				credixPass: credixPassPDA,
				systemProgram: SystemProgram.programId,
				rent: web3.SYSVAR_RENT_PUBKEY,
			},
			signers: [],
		});
	}
);

export const updateCredixPass = multiAsync(
	async (
		publicKey: PublicKey,
		isActive: boolean,
		isUnderwriter: boolean,
		isBorrower: boolean,
		connection: Connection,
		wallet: Wallet
	) => {
		const program = newCredixProgram(connection, wallet);

		const [credixPassPDA] = await findCredixPassPDA(publicKey);

		await program.rpc.updateCredixPass(isActive, isUnderwriter, isBorrower, {
			accounts: {
				owner: wallet.publicKey,
				passHolder: publicKey,
				credixPass: credixPassPDA,
			},
			signers: [],
		});
	}
);

export const getCredixPassInfo = multiAsync(
	async (publicKey: PublicKey, connection: Connection, wallet: Wallet) => {
		const program = newCredixProgram(connection, wallet);
		const [credixPassPDA] = await findCredixPassPDA(publicKey);
		return program.account.credixPass.fetch(credixPassPDA);
	}
);
