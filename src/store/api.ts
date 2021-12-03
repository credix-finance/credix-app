import { BN, Program, ProgramAccount, Provider, Wallet, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SystemProgram } from "@solana/web3.js";
import { config } from "config";
import { SEEDS } from "consts";
import { Deal, DealStatus, PoolStats, RepaymentType } from "types/program.types";
import { PdaSeeds } from "types/solana.types";
import { multiAsync } from "utils/async.utils";
import { mapDealToStatus } from "utils/deal.utils";
import { encodeSeedString, formatNumber, mapPKToSeed } from "utils/format.utils";

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

	// TODO: is it ok to only show the balance of the first one? do we need to add them all up?
	const balance = 1.0 * tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
	return Math.round(balance * 100) / 100;
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
	const _deals = getDealAccounts(connection, wallet);
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const _clusterTime = getClusterTime(connection);

	const [liquidityPoolBalance, deals, clusterTime] = await Promise.all([
		_liquidityPoolBalance,
		_deals,
		_clusterTime,
	]);

	if (!clusterTime) {
		throw Error("Could not fetch cluster time");
	}

	const runningAPY = (deals as Array<ProgramAccount<Deal>>).reduce((result, deal) => {
		const status = mapDealToStatus(deal.account, clusterTime);
		if (status === DealStatus.IN_PROGRESS) {
			console.log(deal);
			console.log("principal");
			console.log(deal.account.principal.toNumber() / 1000000);
			console.log("amount that needs to be paid");
			console.log((deal.account.principal.toNumber() * (1 + deal.account.financingFeePercentage / 100))  / 1000000  );
			console.log("amount repaid");
			console.log(deal.account.amountRepaid.toNumber() / 1000000);
			result += (deal.account.financingFeePercentage / 1000000) * deal.account.principal.toNumber();
		}

		return result;
	}, 0);

	return runningAPY + 6 * formatNumber(liquidityPoolBalance);
});

const getAPY = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const _runningApy = getRunningAPY(connection, wallet);

	const [liquidityPoolBalance, outstandingCredit, runningAPY] = await Promise.all([
		_liquidityPoolBalance,
		_outstandingCredit,
		_runningApy,
	]);

	const outstandingCreditFormatted = formatNumber(outstandingCredit);
	const liqudityPoolBalanceFormatted = formatNumber(liquidityPoolBalance);

	if (liqudityPoolBalanceFormatted === 0 && outstandingCreditFormatted === 0) {
		return 0;
	}

	return Math.round(runningAPY / (outstandingCreditFormatted + liqudityPoolBalanceFormatted)) / 100;
});

const getSolendBuffer = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const liquidityPoolBalance = await getLiquidityPoolBalance(connection, wallet);
	return formatNumber(liquidityPoolBalance);
});

const getTVL = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const outstandingCreditCall = getOutstandingCredit(connection, wallet);
	const [liquidityPoolBalance, outstandingCredit] = await Promise.all([
		_liquidityPoolBalance,
		outstandingCreditCall,
	]);

	return formatNumber(liquidityPoolBalance) + formatNumber(outstandingCredit);
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
		outstandingCredit: formatNumber(outstandingCredit),
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
		// TODO: turn into constant
		const depositAmount = new BN(amount * 1000000);
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

		const withdrawAmount = new BN(Math.floor((amount / lpTokenPrice) * 1000000));

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

		const principalAmount = new BN(principal * 1000000);
		const financingFeeAmount = new BN(financingFee);

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
	const _userUSDCTokenAccount = getUserUSDCTokenAccount(connection, wallet);
	const _usdcMintPK = getUSDCMintPK(connection, wallet);
	const _marketUSDCTokenPDA = findMarketUSDCTokenPDA();
	const _globalMarketStatePDA = findGlobalMarketStatePDA();
	const _dealPDA = findDealPDA(wallet.publicKey);

	const [userUSDCTokenAccount, usdcMintPK, marketUSDCTokenPDA, globalMarketStatePDA, dealPDA] =
		await Promise.all([
			_userUSDCTokenAccount,
			_usdcMintPK,
			_marketUSDCTokenPDA,
			_globalMarketStatePDA,
			_dealPDA,
		]);

	if (!userUSDCTokenAccount) {
		throw Error("No USDC token accounts found for depositor");
	}

	return program.rpc.activateDeal(marketUSDCTokenPDA[1], {
		accounts: {
			owner: wallet.publicKey,
			globalMarketState: globalMarketStatePDA[0],
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
	return connection.getTokenSupply(lpTokenMintPDA[0]).then((response) => response.value);
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

	return (
		Number(lpTokenSupply.amount) &&
		((outstandingCredit + liquidityPoolBalance) * 1.0) / Number(lpTokenSupply.amount)
	);
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

	const stake = userLPTokenAccount.account.data.parsed.info.tokenAmount.uiAmount * lpTokenPrice;
	return Math.round(stake * 100) / 100;
});

export const repayDeal = multiAsync(
	async (amount: number, repaymentType: RepaymentType, connection: Connection, wallet: Wallet) => {
		const program = constructProgram(connection, wallet);
		const repayAmount = new BN(amount * 1000000);

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

		await program.rpc.makeDealRepayment(repayAmount, repaymentType, marketUSDCTokenPDA[1], {
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
