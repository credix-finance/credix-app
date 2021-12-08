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

const getTokenAccount = multiAsync(
	async (connection: Connection, pubkey: PublicKey, mint: PublicKey) => {
		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
			mint,
		});

		return tokenAccounts.value[0];
	}
);

export const getUserUSDCTokenAccount = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const usdcMint = await getUSDCMintPK(connection, wallet);
		return getTokenAccount(connection, wallet.publicKey, usdcMint);
	}
);

const getUserLPTokenAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _depositorLPTokenPDA = findDepositorLPTokenPDA(wallet.publicKey);
	const _lpTokenMintPDA = findLPTokenMintPDA();

	const [depositorInvestorTokenPDA, lpTokenMintPDA] = await Promise.all([
		_depositorLPTokenPDA,
		_lpTokenMintPDA,
	]);

	return getTokenAccount(connection, depositorInvestorTokenPDA[0], lpTokenMintPDA[0]);
});

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

	// TODO: is this still correct
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

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
	"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

const getAssociatedUSDCTokenAddressPK = multiAsync(async (_usdcMintPK: PublicKey, wallet: Wallet) => {
	return (await PublicKey.findProgramAddress(
		[
			wallet.publicKey.toBuffer(),
			TOKEN_PROGRAM_ID.toBuffer(),
			_usdcMintPK.toBuffer(),
		],
		SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
	))[0];
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
	const _depositorPDA = findDepositorInfoPDA(wallet.publicKey);
	const _depositorLPTokenPDA = findDepositorLPTokenPDA(wallet.publicKey);
	const _lpTokenMintPDA = findLPTokenMintPDA();

	const [depositorPDA, depositorLPTokenPDA, lpTokenMintPDA] = await Promise.all([
		_depositorPDA,
		_depositorLPTokenPDA,
		_lpTokenMintPDA,
	]);

	const program = constructProgram(connection, wallet);

	return program.rpc.createDepositor({
		accounts: {
			owner: wallet.publicKey,
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

		const [
			globalMarketStatePDA,
			lpTokenMintPDA,
			depositorInfoPDA,
			depositorLPTokenPDA,
			userUSDCTokenAccount,
			usdcMintPK,
			marketUSDCTokenAccountPK,
		] = await Promise.all([
			_globalMarketStatePDA,
			_lpTokenMintPDA,
			_depositorInfoPDA,
			_depositorLPTokenPDA,
			_userUSDCTokenAccount,
			_usdcMintPK,
			_marketUSDCTokenAccountPK,
		]);

		if (!userUSDCTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.depositFunds(lpTokenMintPDA[1], depositAmount, {
			accounts: {
				depositor: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
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
		const _marketUSDCTokenPDA = findMarketUSDCTokenPDA();
		const _lpTokenMintPDA = findLPTokenMintPDA();
		const _usdcMint = getUSDCMintPK(connection, wallet);
		const _marketUSDCTokenAccountPK = getMarketUSDCTokenAccountPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);

		const [
			lpTokenPrice,
			globalMarketStatePDA,
			depositorLPTokenPDA,
			userUSDCTokenAccount,
			marketUSDCTokenPDA,
			lpTokenMintPDA,
			usdcMint,
			marketUSDCTokenAccountPK,
			treasuryPoolTokenAccountPK,
		] = await Promise.all([
			_lpTokenPrice,
			_globalMarketStatePDA,
			_depositorLPTokenPDA,
			_userUSDCTokenAccount,
			_marketUSDCTokenPDA,
			_lpTokenMintPDA,
			_usdcMint,
			_marketUSDCTokenAccountPK,
			_treasuryPoolTokenAccountPK,
		]);

		// TODO: should we floor here to be safe?
		const withdrawAmount = new BN(toProgramAmount(amount / lpTokenPrice));

		if (!userUSDCTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.withdrawFunds(
			marketUSDCTokenPDA[1],
			depositorLPTokenPDA[1],
			withdrawAmount,
			{
				accounts: {
					withdrawer: wallet.publicKey,
					globalMarketState: globalMarketStatePDA[0],
					withdrawerLpTokenAccount: depositorLPTokenPDA[0],
					withdrawerTokenAccount: userUSDCTokenAccount.pubkey,
					liquidityPoolTokenAccount: marketUSDCTokenAccountPK,
					treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
					lpTokenMintAccount: lpTokenMintPDA[0],
					usdcMintAccount: usdcMint,
					tokenProgram: TOKEN_PROGRAM_ID,
				},
			}
		);
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
		const _dealPDA = findDealPDA(wallet.publicKey);
		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const program = constructProgram(connection, wallet);

		const [dealPDA, globalMarketStatePDA] = await Promise.all([_dealPDA, _globalMarketStatePDA]);

		const principalAmount = new BN(toProgramAmount(principal));
		const financingFeeAmount = new BN(toProgramPercentage(financingFee));

		return program.rpc.createDeal(principalAmount, financingFeeAmount, 0, 0, timeToMaturity, {
			accounts: {
				borrower: borrower,
				globalMarketState: globalMarketStatePDA[0],
				deal: dealPDA[0],
				systemProgram: SystemProgram.programId,
			},
		});
	}
);

export const activateDeal = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const program = constructProgram(connection, wallet);
	const _usdcMintPK = getUSDCMintPK(connection, wallet);
	const _marketUSDCTokenPDA = findMarketUSDCTokenPDA();
	const _globalMarketStatePDA = findGlobalMarketStatePDA();
	const _dealPDA = findDealPDA(wallet.publicKey);

	const [usdcMintPK, marketUSDCTokenPDA, globalMarketStatePDA, dealPDA] =
		await Promise.all([
			_usdcMintPK,
			_marketUSDCTokenPDA,
			_globalMarketStatePDA,
			_dealPDA,
		]);

	const userAssociatedUSDCTokenAddressPK = await getAssociatedUSDCTokenAddressPK(usdcMintPK, wallet);

	return program.rpc.activateDeal(marketUSDCTokenPDA[1], {
		accounts: {
			owner: wallet.publicKey,
			globalMarketState: globalMarketStatePDA[0],
			deal: dealPDA[0],
			liquidityPoolTokenAccount: marketUSDCTokenPDA[0],
			borrowerTokenAccount: userAssociatedUSDCTokenAddressPK,
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

export const getLPTokenUSDCBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _lpTokenPrice = getLPTokenPrice(connection, wallet);
	const _userLPTokenAccount = getUserLPTokenAccount(connection, wallet);

	const [lpTokenPrice, userLPTokenAccount] = await Promise.all([
		_lpTokenPrice,
		_userLPTokenAccount,
	]);

	if (!userLPTokenAccount) {
		return 0;
	}

	const userLPTokenAmount = Number(userLPTokenAccount.account.data.parsed.info.tokenAmount.amount);

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
