import { BN, Program, ProgramAccount, Provider, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SystemProgram } from "@solana/web3.js";
import { config } from "config";
import { SEEDS } from "consts";
import { divide } from "lodash";
import { Deal, DealStatus, PoolStats, RepaymentType } from "types/program.types";
import { PdaSeeds } from "types/solana.types";
import { multiAsync } from "utils/async.utils";
import { mapDealToStatus } from "utils/deal.utils";
import {
	encodeSeedString,
	mapPKToSeed,
	toProgramAmount,
	toProgramPercentage,
} from "utils/format.utils";
import { percentage } from "utils/math.utils";

const constructProgram = (connection: Connection, wallet: Wallet) => {
	const provider = new Provider(connection, wallet, config.confirmOptions);
	return new Program(config.idl, config.clusterConfig.programId, provider);
};

const getDealAccounts = multiAsync(async (connection, wallet) => {
	const program = constructProgram(connection, wallet);
	return program.account.deal.all();
});

const findPDA = multiAsync(async (seeds: PdaSeeds) => {
	const programId = config.clusterConfig.programId;
	return PublicKey.findProgramAddress(seeds, programId);
});

const findGlobalMarketStatePDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.GLOBAL_MARKET_STATE_PDA);
	return findPDA([seed]);
});

const findSigningAuthorityPDA = multiAsync(async () => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA();
	const seeds: PdaSeeds = [globalMarketStatePDA[0].toBuffer()];
	return findPDA(seeds);
});

const findDepositorLPTokenPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEPOSITOR_LP_TOKEN_ACCOUNT);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return findPDA(seeds);
});

const findDepositorInfoPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEPOSITOR_INFO);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return findPDA(seeds);
});

const findLPTokenMintPDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.LP_TOKEN_MINT);
	return findPDA([seed]);
});

const findMarketUSDCTokenPDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.MARKET_USDC_TOKEN_ACCOUNT);
	return findPDA([seed]);
});

const findDealPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEAL);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return findPDA(seeds);
});

const getGlobalMarketStateAccountData = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const program = constructProgram(connection, wallet);
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

const getLiquidityPoolBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateAccountData(connection, wallet);
	return globalMarketStateData.liquidityPoolUsdcAmount.toNumber();
});

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

	const runningAPY = (deals as Array<ProgramAccount<Deal>>).reduce((result, deal) => {
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

	return divide(runningAPY, outstandingCredit + liquidityPoolBalance) / 100;
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

export const getDepositorInfoAccountData = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const depositorInfoPDA = await findDepositorInfoPDA(wallet.publicKey);
		const program = constructProgram(connection, wallet);

		return program.account.depositorInfo.fetch(depositorInfoPDA[0]);
	}
);

export const createDepositor = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _globalMarketStatePDA = findGlobalMarketStatePDA();
	const _signingAuthorityPDA = findSigningAuthorityPDA();
	const _depositorPDA = findDepositorInfoPDA(wallet.publicKey);
	const _depositorLPTokenPDA = findDepositorLPTokenPDA(wallet.publicKey);
	const _lpTokenMintPDA = findLPTokenMintPDA();

	const [
		globalMarketStatePDA,
		signingAuthorityPDA,
		depositorPDA,
		depositorLPTokenPDA,
		lpTokenMintPDA,
	] = await Promise.all([
		_globalMarketStatePDA,
		_signingAuthorityPDA,
		_depositorPDA,
		_depositorLPTokenPDA,
		_lpTokenMintPDA,
	]);

	const program = constructProgram(connection, wallet);

	return program.rpc.createDepositor({
		accounts: {
			owner: wallet.publicKey,
			globalMarketState: globalMarketStatePDA[0],
			signingAuthority: signingAuthorityPDA[0],
			depositor: wallet.publicKey,
			depositorInfo: depositorPDA[0],
			depositorLpTokenAccount: depositorLPTokenPDA[0],
			lpTokenMintAccount: lpTokenMintPDA[0],
			rent: web3.SYSVAR_RENT_PUBKEY,
			tokenProgram: TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
		},
	});
});

export const depositInvestment = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		const depositAmount = new BN(toProgramAmount(amount));
		const program = constructProgram(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _lpTokenMintPDA = findLPTokenMintPDA();
		const _depositorInfoPDA = findDepositorInfoPDA(wallet.publicKey);
		const _depositorLPTokenPDA = findDepositorLPTokenPDA(wallet.publicKey);
		const _userUSDCTokenAccount = getUserUSDCTokenAccount(connection, wallet);
		const _usdcMintPK = getUSDCMintPK(connection, wallet);
		const _marketUSDCTokenAccountPK = getMarketUSDCTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();

		const [
			globalMarketStatePDA,
			lpTokenMintPDA,
			depositorInfoPDA,
			depositorLPTokenPDA,
			userUSDCTokenAccount,
			usdcMintPK,
			marketUSDCTokenAccountPK,
			signingAuthorityPDA,
		] = await Promise.all([
			_globalMarketStatePDA,
			_lpTokenMintPDA,
			_depositorInfoPDA,
			_depositorLPTokenPDA,
			_userUSDCTokenAccount,
			_usdcMintPK,
			_marketUSDCTokenAccountPK,
			_signingAuthorityPDA,
		]);

		if (!userUSDCTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.depositFunds(signingAuthorityPDA[1], depositAmount, {
			accounts: {
				depositor: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				depositorInfo: depositorInfoPDA[0],
				depositorTokenAccount: userUSDCTokenAccount.pubkey,
				liquidityPoolTokenAccount: marketUSDCTokenAccountPK,
				lpTokenMintAccount: lpTokenMintPDA[0],
				depositorLpTokenAccount: depositorLPTokenPDA[0],
				usdcMintAccount: usdcMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const withdrawInvestment = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		const program = constructProgram(connection, wallet);
		const _lpTokenPrice = getLPTokenPrice(connection, wallet);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _depositorLPTokenPDA = findDepositorLPTokenPDA(wallet.publicKey);
		const _userUSDCTokenAccount = getUserUSDCTokenAccount(connection, wallet);
		const _lpTokenMintPDA = findLPTokenMintPDA();
		const _usdcMint = getUSDCMintPK(connection, wallet);
		const _marketUSDCTokenAccountPK = getMarketUSDCTokenAccountPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();

		const [
			lpTokenPrice,
			globalMarketStatePDA,
			depositorLPTokenPDA,
			userUSDCTokenAccount,
			lpTokenMintPDA,
			usdcMint,
			marketUSDCTokenAccountPK,
			treasuryPoolTokenAccountPK,
			signingAuthorityPDA,
		] = await Promise.all([
			_lpTokenPrice,
			_globalMarketStatePDA,
			_depositorLPTokenPDA,
			_userUSDCTokenAccount,
			_lpTokenMintPDA,
			_usdcMint,
			_marketUSDCTokenAccountPK,
			_treasuryPoolTokenAccountPK,
			_signingAuthorityPDA,
		]);

		const withdrawAmount = new BN(toProgramAmount(amount / lpTokenPrice));

		if (!userUSDCTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.withdrawFunds(signingAuthorityPDA[1], withdrawAmount, {
			accounts: {
				withdrawer: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				withdrawerLpTokenAccount: depositorLPTokenPDA[0],
				withdrawerTokenAccount: userUSDCTokenAccount.pubkey,
				liquidityPoolTokenAccount: marketUSDCTokenAccountPK,
				treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
				lpTokenMintAccount: lpTokenMintPDA[0],
				usdcMintAccount: usdcMint,
				tokenProgram: TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const getDealAccountData = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const program = constructProgram(connection, wallet);
	const dealPDA = await findDealPDA(wallet.publicKey);
	return program.account.deal.fetch(dealPDA[0]);
});

export const createDeal = multiAsync(
	async (
		principal: number,
		financingFee: number,
		timeToMaturity: number,
		borrower: PublicKey,
		connection: Connection,
		wallet: Wallet
	) => {
		const dealPDA = await findDealPDA(wallet.publicKey);
		const program = constructProgram(connection, wallet);

		const principalAmount = new BN(toProgramAmount(principal));
		const financingFeeAmount = new BN(toProgramPercentage(financingFee));

		return program.rpc.createDeal(principalAmount, financingFeeAmount, 0, 0, timeToMaturity, {
			accounts: {
				borrower: borrower,
				deal: dealPDA[0],
				systemProgram: SystemProgram.programId,
			},
		});
	}
);

export const activateDeal = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const program = constructProgram(connection, wallet);
	const _userUSDCTokenAccount = getUserUSDCTokenAccount(connection, wallet);
	const _usdcMintPK = getUSDCMintPK(connection, wallet);
	const _marketUSDCTokenPDA = findMarketUSDCTokenPDA();
	const _globalMarketStatePDA = findGlobalMarketStatePDA();
	const _dealPDA = findDealPDA(wallet.publicKey);
	const _signingAuthorityPDA = findSigningAuthorityPDA();

	const [
		userUSDCTokenAccount,
		usdcMintPK,
		marketUSDCTokenPDA,
		globalMarketStatePDA,
		dealPDA,
		signingAuthorityPDA,
	] = await Promise.all([
		_userUSDCTokenAccount,
		_usdcMintPK,
		_marketUSDCTokenPDA,
		_globalMarketStatePDA,
		_dealPDA,
		_signingAuthorityPDA,
	]);

	if (!userUSDCTokenAccount) {
		throw Error("No USDC token accounts found for depositor");
	}

	return program.rpc.activateDeal(signingAuthorityPDA[1], {
		accounts: {
			owner: wallet.publicKey,
			globalMarketState: globalMarketStatePDA[0],
			signingAuthority: signingAuthorityPDA[0],
			deal: dealPDA[0],
			liquidityPoolTokenAccount: marketUSDCTokenPDA[0],
			borrowerTokenAccount: userUSDCTokenAccount.pubkey,
			usdcMintAccount: usdcMintPK,
			tokenProgram: TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
		},
	});
});

const getLPTokenSupply = multiAsync(async (connection: Connection) => {
	const lpTokenMintPDA = await findLPTokenMintPDA();
	return connection
		.getTokenSupply(lpTokenMintPDA[0])
		.then((response) => Number(response.value.amount));
});

const getLPTokenPrice = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const _lpTokenSupply = getLPTokenSupply(connection);

	const [outstandingCredit, liquidityPoolBalance, lpTokenSupply] = await Promise.all([
		_outstandingCredit,
		_liquidityPoolBalance,
		_lpTokenSupply,
	]);

	return lpTokenSupply && divide(outstandingCredit + liquidityPoolBalance, lpTokenSupply);
});

const getUserLPTokenAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _signingAuthorityPDA = findSigningAuthorityPDA();
	const _lpTokenMintPDA = findLPTokenMintPDA();
	const _depositorLPTokenPDA = findDepositorLPTokenPDA(wallet.publicKey);

	const [signingAuthorityPDA, lpTokenMintPDA, depositorLPTokenPDA] = await Promise.all([
		_signingAuthorityPDA,
		_lpTokenMintPDA,
		_depositorLPTokenPDA,
	]);

	const tokenAccounts = await connection.getParsedTokenAccountsByOwner(signingAuthorityPDA[0], {
		mint: lpTokenMintPDA[0],
	});

	return tokenAccounts.value.filter((tokenAccount) =>
		tokenAccount.pubkey.equals(depositorLPTokenPDA[0])
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

	console.log("token", userLPTokenAmount);

	return userLPTokenAmount * lpTokenPrice;
});

export const repayDeal = multiAsync(
	async (amount: number, repaymentType: RepaymentType, connection: Connection, wallet: Wallet) => {
		const program = constructProgram(connection, wallet);
		const repayAmount = new BN(amount);

		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _userUSDCTokenAccount = getUserUSDCTokenAccount(connection, wallet);
		const _dealPDA = findDealPDA(wallet.publicKey);
		const _marketUSDCTokenPDA = findMarketUSDCTokenPDA();
		const _usdcMintPK = getUSDCMintPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);

		const [
			globalMarketStatePDA,
			userUSDCTokenAccount,
			dealPDA,
			marketUSDCTokenPDA,
			usdcMintPK,
			treasuryPoolTokenAccountPK,
		] = await Promise.all([
			_globalMarketStatePDA,
			_userUSDCTokenAccount,
			_dealPDA,
			_marketUSDCTokenPDA,
			_usdcMintPK,
			_treasuryPoolTokenAccountPK,
		]);

		if (!userUSDCTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		await program.rpc.makeDealRepayment(repayAmount, repaymentType, {
			accounts: {
				borrower: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				borrowerTokenAccount: userUSDCTokenAccount.pubkey,
				deal: dealPDA[0],
				liquidityPoolTokenAccount: marketUSDCTokenPDA[0],
				treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
				usdcMintAccount: usdcMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
			},
		});
	}
);
