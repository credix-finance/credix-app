import { Address, BN, Program, Provider, Wallet, web3 } from "@project-serum/anchor";
import { Idl, IdlTypeDef } from "@project-serum/anchor/dist/cjs/idl";
import { IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SystemProgram } from "@solana/web3.js";
import { config } from "config";
import { SEEDS } from "consts";
import { PoolStats } from "types/program.types";
import { PdaSeeds } from "types/solana.types";
import { multiAsync } from "utils/async.utils";
import { encodeSeedString, formatNumber, mapPKToSeed } from "utils/format.utils";

const getProgram = (connection: Connection, wallet: Wallet) => {
	const provider = new Provider(connection, wallet, config.confirmOptions);
	return new Program(config.idl, config.clusterConfig.programId, provider);
};

const getDealAccountData = multiAsync(
	async (address: Address, connection: Connection, wallet: Wallet) => {
		const program = getProgram(connection, wallet);
		return program.account.deal.fetch(address);
	}
);

const getPDA = multiAsync(async (seeds: PdaSeeds) => {
	const programId = config.clusterConfig.programId;
	return PublicKey.findProgramAddress(seeds, programId);
});

const getGlobalMarketStatePDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.GLOBAL_MARKET_STATE_PDA);
	return getPDA([seed]);
});

const getDepositorLPTokenPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEPOSITOR_LP_TOKEN_ACCOUNT);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return getPDA(seeds);
});

const getDepositorInfoPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEPOSITOR_INFO);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return getPDA(seeds);
});

const getLPTokenMintAuthorityPDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.LP_TOKEN_MINT_AUTHORITY);
	return getPDA([seed]);
});

const getMarketLiquidityPoolTokenPDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.MARKET_LIQUIDITY_POOL_TOKEN_ACCOUNT);
	return getPDA([seed]);
});

const getDealPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEAL);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return getPDA(seeds);
});

const getGlobalMarketStateData = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const program = getProgram(connection, wallet);
	const globalMarketStatePDA = await getGlobalMarketStatePDA();
	return program.account.globalMarketState.fetch(globalMarketStatePDA[0]);
});

const getUSDCMint = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const marketLiquidityPoolTokenAccount = await getMarketLiquidityPoolTokenAccount(
		connection,
		wallet
	);
	const liquidityPoolTokenAccountInfo = await connection.getParsedAccountInfo(
		marketLiquidityPoolTokenAccount
	);

	if (!liquidityPoolTokenAccountInfo.value) {
		throw Error("Couldn't fetch lp token account info");
	}

	return new PublicKey(
		(liquidityPoolTokenAccountInfo.value.data as ParsedAccountData).parsed.info.mint
	);
});

const getTokenAccount = multiAsync(
	async (connection: Connection, pubkey: PublicKey, mint: PublicKey) => {
		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
			mint,
		});

		// TODO: if the depositor doens't have a (usdc) token account yet, \
		//  maybe return one we generate using the associated token account program
		return tokenAccounts.value[0];
	}
);

export const getDepositorLiquidityPoolTokenAccount = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const usdcMint = await getUSDCMint(connection, wallet);
		return getTokenAccount(connection, wallet.publicKey, usdcMint);
	}
);

const getDepositorLPTokenTokenAccount = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const _depositorLPTokenPDA = getDepositorLPTokenPDA(wallet.publicKey);
		const _lpTokenMint = getLPTokenMintAccount(connection, wallet);

		const [depositorInvestorTokenPDA, lpTokenMint] = await Promise.all([
			_depositorLPTokenPDA,
			_lpTokenMint,
		]);

		return getTokenAccount(connection, depositorInvestorTokenPDA[0], lpTokenMint);
	}
);

export const getBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const tokenAccount = await getDepositorLiquidityPoolTokenAccount(connection, wallet);

	if (!tokenAccount) {
		return 0;
	}

	// TODO: is it ok to only show the balance of the first one? do we need to add them all up?
	const balance = 1.0 * tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
	return Math.round(balance * 100) / 100;
});

const getLiquidityPoolBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return globalMarketStateData.liquidityPoolUsdcAmount.toNumber();
});

const getOutstandingCredit = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return globalMarketStateData.totalOutstandingCredit.toNumber();
});

const getRunningAPY = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const programAccounts = await connection.getProgramAccounts(config.clusterConfig.programId);
	const dealDataCalls: Array<Promise<void | TypeDef<IdlTypeDef, IdlTypes<Idl>>>> = [];

	// We don't know which programAccounts are deal accounts so we try and catch the error if \
	//  it isn't
	programAccounts.forEach((programAccount) => {
		dealDataCalls.push(getDealAccountData(programAccount.pubkey, connection, wallet));
	});

	const _liquidityPoolBalance: Promise<number> = getLiquidityPoolBalance(connection, wallet);
	const [liquidityPoolBalance, settledDealDataCalls] = await Promise.all([
		_liquidityPoolBalance,
		Promise.allSettled(dealDataCalls),
	]);

	const runningAPY = settledDealDataCalls
		.filter((result) => Object.prototype.hasOwnProperty.call(result, "value"))
		// we know the property exists becaues the filter above
		// @ts-ignore
		.map((result) => result.value)
		.reduce((runningApy, dealData) => {
			if ("inProgress" in dealData.status) {
				runningApy += (dealData.financingFee / 1000000) * dealData.principal;
			}

			return runningApy;
		}, 0);

	return runningAPY + 6 * formatNumber(liquidityPoolBalance as unknown as number);
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

const getMarketLiquidityPoolTokenAccount = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
		return globalMarketStateData.liquidityPoolTokenAccount;
	}
);

const getLPTokenMintAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return globalMarketStateData.lpTokenMintAccount;
});

const getTreasuryPoolTokenAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
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
		const depositorInfoPDA = await getDepositorInfoPDA(wallet.publicKey);
		const program = getProgram(connection, wallet);

		return program.account.depositorInfo.fetch(depositorInfoPDA[0]);
	}
);

export const createDepositorAccounts = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const _depositorPDA = getDepositorInfoPDA(wallet.publicKey);
		const _depositorLPTokenPDA = getDepositorLPTokenPDA(wallet.publicKey);
		const _lpTokenMintAuthorityPDA = getLPTokenMintAuthorityPDA();

		const [depositorPDA, depositorLPTokenPDA, lpTokenMintAuthorityPDA] = await Promise.all([
			_depositorPDA,
			_depositorLPTokenPDA,
			_lpTokenMintAuthorityPDA,
		]);

		const program = getProgram(connection, wallet);

		return program.rpc.createDepositor({
			accounts: {
				owner: wallet.publicKey,
				depositor: wallet.publicKey,
				depositorInfo: depositorPDA[0],
				depositorLpTokenAccount: depositorLPTokenPDA[0],
				lpTokenMintAccount: lpTokenMintAuthorityPDA[0],
				rent: web3.SYSVAR_RENT_PUBKEY,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
			},
		});
	}
);

export const depositInvestment = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		// TODO: turn into constant
		const depositAmount = new BN(amount * 1000000);
		const program = getProgram(connection, wallet);
		const _globalMarketStatePDA = getGlobalMarketStatePDA();
		const _investorTokenMintAuthorityPDA = getLPTokenMintAuthorityPDA();
		const _depositorInfoPDA = getDepositorInfoPDA(wallet.publicKey);
		const _depositorLPTokenPDA = getDepositorLPTokenPDA(wallet.publicKey);
		const _depositorLiquidityPoolTokenAccount = getDepositorLiquidityPoolTokenAccount(
			connection,
			wallet
		);
		const _usdcMint = getUSDCMint(connection, wallet);
		const _lpTokenMintAccount = getLPTokenMintAccount(connection, wallet);
		const _marketLPTokenAccount = getMarketLiquidityPoolTokenAccount(connection, wallet);

		const [
			globalMarketStatePDA,
			investorTokenMintAuthorityPDA,
			depositorInfoPDA,
			depositorLPTokenPDA,
			depositorLiquidityPoolTokenAccount,
			usdcMint,
			lpTokenMintAccount,
			marketLPTokenAccount,
		] = await Promise.all([
			_globalMarketStatePDA,
			_investorTokenMintAuthorityPDA,
			_depositorInfoPDA,
			_depositorLPTokenPDA,
			_depositorLiquidityPoolTokenAccount,
			_usdcMint,
			_lpTokenMintAccount,
			_marketLPTokenAccount,
		]);

		if (!depositorLiquidityPoolTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.depositFunds(investorTokenMintAuthorityPDA[1], depositAmount, {
			accounts: {
				depositor: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				depositorInfo: depositorInfoPDA[0],
				depositorTokenAccount: depositorLiquidityPoolTokenAccount.pubkey,
				liquidityPoolTokenAccount: marketLPTokenAccount,
				lpTokenMintAccount: lpTokenMintAccount,
				depositorLpTokenAccount: depositorLPTokenPDA[0],
				usdcMintAccount: usdcMint,
				tokenProgram: TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const withdrawInvestment = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		const program = getProgram(connection, wallet);
		const _investorTokenPrice = getLPTokenPrice(connection, wallet);
		const _globalMarketStatePDA = getGlobalMarketStatePDA();
		const _depositorLPTokenPDA = getDepositorLPTokenPDA(wallet.publicKey);
		const _depositorLiquidityPoolTokenAccount = getDepositorLiquidityPoolTokenAccount(
			connection,
			wallet
		);
		const _marketLiquidityPoolTokenPDA = getMarketLiquidityPoolTokenPDA();
		const _lpTokenMintAccount = getLPTokenMintAccount(connection, wallet);
		const _usdcMint = getUSDCMint(connection, wallet);
		const _marketLPTokenAccount = getMarketLiquidityPoolTokenAccount(connection, wallet);
		const _treasuryPoolTokenAccount = getTreasuryPoolTokenAccount(connection, wallet);

		const [
			investorTokenPrice,
			globalMarketStatePDA,
			depositorLPTokenPDA,
			depositorLiquidityPoolTokenAccount,
			marketLiquidityPoolTokenPDA,
			lpTokenMintAccount,
			usdcMint,
			marketLPTokenAccount,
			treasuryPoolTokenAccount,
		] = await Promise.all([
			_investorTokenPrice,
			_globalMarketStatePDA,
			_depositorLPTokenPDA,
			_depositorLiquidityPoolTokenAccount,
			_marketLiquidityPoolTokenPDA,
			_lpTokenMintAccount,
			_usdcMint,
			_marketLPTokenAccount,
			_treasuryPoolTokenAccount,
		]);

		const withdrawAmount = new BN(Math.floor((amount / investorTokenPrice) * 1000000));

		if (!depositorLiquidityPoolTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.withdrawFunds(
			marketLiquidityPoolTokenPDA[1],
			depositorLPTokenPDA[1],
			withdrawAmount,
			{
				accounts: {
					withdrawer: wallet.publicKey,
					globalMarketState: globalMarketStatePDA[0],
					withdrawerLpTokenAccount: depositorLPTokenPDA[0],
					withdrawerTokenAccount: depositorLiquidityPoolTokenAccount.pubkey,
					liquidityPoolTokenAccount: marketLPTokenAccount,
					treasuryPoolTokenAccount: treasuryPoolTokenAccount,
					lpTokenMintAccount: lpTokenMintAccount,
					usdcMintAccount: usdcMint,
					tokenProgram: TOKEN_PROGRAM_ID,
				},
			}
		);
	}
);

export const getDealData = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const dealPDA = await getDealPDA(wallet.publicKey);
	return getDealAccountData(dealPDA[0], connection, wallet);
});

export const createDeal = multiAsync(
	async (principal: number, financingFee: number, connection: Connection, wallet: Wallet) => {
		const _dealPDA = getDealPDA(wallet.publicKey);
		const _globalMarketStatePDA = getGlobalMarketStatePDA();
		const program = getProgram(connection, wallet);

		const [dealPDA, globalMarketStatePDA] = await Promise.all([_dealPDA, _globalMarketStatePDA]);

		const principalAmount = new BN(principal * 1000000);
		const financingFeeAmount = new BN(financingFee);

		return program.rpc.createDeal(principalAmount, financingFeeAmount, {
			accounts: {
				borrower: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				deal: dealPDA[0],
				systemProgram: SystemProgram.programId,
			},
		});
	}
);

export const activateDeal = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const program = getProgram(connection, wallet);
	const _depositorLiquidityPoolTokenAccount = getDepositorLiquidityPoolTokenAccount(
		connection,
		wallet
	);
	const _usdcMint = getUSDCMint(connection, wallet);
	const _marketLiquidityPoolTokenPDA = getMarketLiquidityPoolTokenPDA();
	const _globalMarketStatePDA = getGlobalMarketStatePDA();
	const _dealPDA = getDealPDA(wallet.publicKey);

	const [
		depositorLiquidityPoolTokenAccount,
		usdcMint,
		marketLiquidityPoolTokenPDA,
		globalMarketStatePDA,
		dealPDA,
	] = await Promise.all([
		_depositorLiquidityPoolTokenAccount,
		_usdcMint,
		_marketLiquidityPoolTokenPDA,
		_globalMarketStatePDA,
		_dealPDA,
	]);

	if (!depositorLiquidityPoolTokenAccount) {
		throw Error("No USDC token accounts found for depositor");
	}

	return program.rpc.activateDeal(marketLiquidityPoolTokenPDA[1], {
		accounts: {
			owner: wallet.publicKey,
			globalMarketState: globalMarketStatePDA[0],
			deal: dealPDA[0],
			liquidityPoolTokenAccount: marketLiquidityPoolTokenPDA[0],
			borrowerTokenAccount: depositorLiquidityPoolTokenAccount.pubkey,
			usdcMintAccount: usdcMint,
			tokenProgram: TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
		},
	});
});

const getLPTokenSupply = multiAsync(async (connection: Connection) => {
	const lpTokenMintAuthorityPDA = await getLPTokenMintAuthorityPDA();
	return connection.getTokenSupply(lpTokenMintAuthorityPDA[0]);
});

const getLPTokenPrice = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const _liquidityPoolBalance = getLiquidityPoolBalance(connection, wallet);
	const _lpTokenSupply = getLPTokenSupply(connection);

	const [outstandingCredit, lpBalance, lpTokenSupply] = await Promise.all([
		_outstandingCredit,
		_liquidityPoolBalance,
		_lpTokenSupply,
	]);

	return (
		((outstandingCredit + lpBalance) * 1.0) / (lpTokenSupply.value.amount as unknown as number)
	);
});

export const getLPTokenUSDCBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _lpTokenPrice = getLPTokenPrice(connection, wallet);
	const _depositorLPTokenTokenAccount = getDepositorLPTokenTokenAccount(connection, wallet);

	const [lpTokenPrice, depositorLPTokenTokenAccount] = await Promise.all([
		_lpTokenPrice,
		_depositorLPTokenTokenAccount,
	]);

	if (!depositorLPTokenTokenAccount) {
		return 0;
	}

	const stake =
		depositorLPTokenTokenAccount.account.data.parsed.info.tokenAmount.uiAmount * lpTokenPrice;

	return Math.round(stake * 100) / 100;
});

export const repayDeal = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		const program = getProgram(connection, wallet);
		const repayAmount = new BN(amount * 1000000);

		const _globalMarketStatePDA = getGlobalMarketStatePDA();
		const _depositorLiquidityPoolTokenAccount = getDepositorLiquidityPoolTokenAccount(
			connection,
			wallet
		);
		const _dealPDA = getDealPDA(wallet.publicKey);
		const _marketLiquidityPoolTokenPDA = getMarketLiquidityPoolTokenPDA();
		const _usdcMint = getUSDCMint(connection, wallet);

		const [
			globalMarketStatePDA,
			depositorLPTokenAccount,
			dealPDA,
			marketLiquidityPoolTokenPDA,
			usdcMint,
		] = await Promise.all([
			_globalMarketStatePDA,
			_depositorLiquidityPoolTokenAccount,
			_dealPDA,
			_marketLiquidityPoolTokenPDA,
			_usdcMint,
		]);

		if (!depositorLPTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		await program.rpc.makeDealRepayment(repayAmount, {
			accounts: {
				borrower: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				borrowerTokenAccount: depositorLPTokenAccount.pubkey,
				deal: dealPDA[0],
				liquidityPoolTokenAccount: marketLiquidityPoolTokenPDA[0],
				usdcMintAccount: usdcMint,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
			},
		});
	}
);
