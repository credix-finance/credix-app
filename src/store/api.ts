import { BN, Program, ProgramAccount, Provider, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
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
	const seeds: PdaSeeds = [Buffer.from(config.clusterConfig.programId.toString()).subarray(0, 32)];
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

export const getUserUSDCBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const userUSDCTokenBalance = await getUserUSDCTokenBalance(connection, wallet);
	return Number(userUSDCTokenBalance.value.amount);
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

const getAssociatedUSDCTokenAddressPK = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _usdcMintPK = await getUSDCMintPK(connection, wallet);
	return await Token.getAssociatedTokenAddress(
		ASSOCIATED_TOKEN_PROGRAM_ID,
		TOKEN_PROGRAM_ID,
		_usdcMintPK,
		wallet.publicKey,
	);
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
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(connection, wallet);
		const _usdcMintPK = getUSDCMintPK(connection, wallet);
		const _marketUSDCTokenAccountPK = getMarketUSDCTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();

		const [
			globalMarketStatePDA,
			lpTokenMintPDA,
			depositorInfoPDA,
			depositorLPTokenPDA,
			userAssociatedUSDCTokenAddressPK,
			usdcMintPK,
			marketUSDCTokenAccountPK,
			signingAuthorityPDA,
		] = await Promise.all([
			_globalMarketStatePDA,
			_lpTokenMintPDA,
			_depositorInfoPDA,
			_depositorLPTokenPDA,
			_userAssociatedUSDCTokenAddressPK,
			_usdcMintPK,
			_marketUSDCTokenAccountPK,
			_signingAuthorityPDA,
		]);

		return program.rpc.depositFunds(signingAuthorityPDA[1], depositAmount, {
			accounts: {
				depositor: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				depositorInfo: depositorInfoPDA[0],
				depositorTokenAccount: userAssociatedUSDCTokenAddressPK,
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
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(connection, wallet);
		const _lpTokenMintPDA = findLPTokenMintPDA();
		const _usdcMint = getUSDCMintPK(connection, wallet);
		const _marketUSDCTokenAccountPK = getMarketUSDCTokenAccountPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);
		const _signingAuthorityPDA = findSigningAuthorityPDA();

		const [
			lpTokenPrice,
			globalMarketStatePDA,
			depositorLPTokenPDA,
			userAssociatedUSDCTokenAddressPK,
			lpTokenMintPDA,
			usdcMint,
			marketUSDCTokenAccountPK,
			treasuryPoolTokenAccountPK,
			signingAuthorityPDA,
		] = await Promise.all([
			_lpTokenPrice,
			_globalMarketStatePDA,
			_depositorLPTokenPDA,
			_userAssociatedUSDCTokenAddressPK,
			_lpTokenMintPDA,
			_usdcMint,
			_marketUSDCTokenAccountPK,
			_treasuryPoolTokenAccountPK,
			_signingAuthorityPDA,
		]);

		const withdrawAmount = new BN(toProgramAmount(amount / lpTokenPrice));

		return program.rpc.withdrawFunds(signingAuthorityPDA[1], withdrawAmount, {
			accounts: {
				withdrawer: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				withdrawerLpTokenAccount: depositorLPTokenPDA[0],
				withdrawerTokenAccount: userAssociatedUSDCTokenAddressPK,
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
	const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(connection, wallet);
	const _usdcMintPK = getUSDCMintPK(connection, wallet);
	const _marketUSDCTokenPDA = findMarketUSDCTokenPDA();
	const _globalMarketStatePDA = findGlobalMarketStatePDA();
	const _dealPDA = findDealPDA(wallet.publicKey);
	const _signingAuthorityPDA = findSigningAuthorityPDA();

	const [
		userAssociatedUSDCTokenAddressPK,
		usdcMintPK,
		marketUSDCTokenPDA,
		globalMarketStatePDA,
		dealPDA,
		signingAuthorityPDA,
	] = await Promise.all([
		_userAssociatedUSDCTokenAddressPK,
		_usdcMintPK,
		_marketUSDCTokenPDA,
		_globalMarketStatePDA,
		_dealPDA,
		_signingAuthorityPDA,
	]);

	return program.rpc.activateDeal(signingAuthorityPDA[1], {
		accounts: {
			owner: wallet.publicKey,
			globalMarketState: globalMarketStatePDA[0],
			signingAuthority: signingAuthorityPDA[0],
			deal: dealPDA[0],
			liquidityPoolTokenAccount: marketUSDCTokenPDA[0],
			borrowerTokenAccount: userAssociatedUSDCTokenAddressPK,
			usdcMintAccount: usdcMintPK,
			tokenProgram: TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
			rent: web3.SYSVAR_RENT_PUBKEY,
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

const getUserLPTokenBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const depositorLPTokenPDA = await findDepositorLPTokenPDA(wallet.publicKey);
	return connection.getTokenAccountBalance(depositorLPTokenPDA[0]);
});

const getUserUSDCTokenBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const depositorUSDCTokenAccountPK = await getAssociatedUSDCTokenAddressPK(connection, wallet);
	return connection.getTokenAccountBalance(depositorUSDCTokenAccountPK);
});

export const getLPTokenUSDCBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _lpTokenPrice = getLPTokenPrice(connection, wallet);
	const _userLPTokenBalance = getUserLPTokenBalance(connection, wallet);

	const [lpTokenPrice, userLPTokenBalance] = await Promise.all([
		_lpTokenPrice,
		_userLPTokenBalance,
	]);

	const userLPTokenAmount = Number(userLPTokenBalance.value.amount);

	return userLPTokenAmount * lpTokenPrice;
});

export const repayDeal = multiAsync(
	async (amount: number, repaymentType: RepaymentType, connection: Connection, wallet: Wallet) => {
		const program = constructProgram(connection, wallet);
		const repayAmount = new BN(amount);

		const _globalMarketStatePDA = findGlobalMarketStatePDA();
		const _userAssociatedUSDCTokenAddressPK = getAssociatedUSDCTokenAddressPK(connection, wallet);
		const _dealPDA = findDealPDA(wallet.publicKey);
		const _marketUSDCTokenPDA = findMarketUSDCTokenPDA();
		const _usdcMintPK = getUSDCMintPK(connection, wallet);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(connection, wallet);

		const [
			globalMarketStatePDA,
			userAssociatedUSDCTokenAddressPK,
			dealPDA,
			marketUSDCTokenPDA,
			usdcMintPK,
			treasuryPoolTokenAccountPK,
		] = await Promise.all([
			_globalMarketStatePDA,
			_userAssociatedUSDCTokenAddressPK,
			_dealPDA,
			_marketUSDCTokenPDA,
			_usdcMintPK,
			_treasuryPoolTokenAccountPK,
		]);

		await program.rpc.makeDealRepayment(repayAmount, repaymentType, {
			accounts: {
				borrower: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				borrowerTokenAccount: userAssociatedUSDCTokenAddressPK,
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
