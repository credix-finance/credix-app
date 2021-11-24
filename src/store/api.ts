import { Address, BN, Program, Provider, utils, Wallet, web3 } from "@project-serum/anchor";
import { Idl, IdlTypeDef } from "@project-serum/anchor/dist/cjs/idl";
import { IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey, SystemProgram } from "@solana/web3.js";
import { multiAsync } from "async.utils";
import { config } from "config";
import { SEEDS } from "consts";
import { PoolStats } from "types/program.types";
import { PdaSeeds } from "types/solana.types";

// TODO: think of a better name
// TODO: move to different file?
const formatNumber = (n: number) => (1.0 * n) / 1000000;

const mapPKToSeed = (publicKey: PublicKey) => publicKey.toBuffer().slice(0, 10);

const encodeSeedString = (seedString: string) => Buffer.from(utils.bytes.utf8.encode(seedString));

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

const getDepositorInvestorTokenPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEPOSITOR_INVESTOR_TOKEN_ACCOUNT);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return getPDA(seeds);
});

const getDepositorInfoPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEPOSITOR_INFO);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), seed];
	return getPDA(seeds);
});

const getInvestorTokenMintAuthorityPDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.INVESTOR_TOKEN_MINT_AUTHORITY);
	return getPDA([seed]);
});

const getMarketLPTokenPDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.MARKET_LP_TOKEN_ACCOUNT);
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

const getLPMint = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const marketLPTokenAccount = await getMarketLPTokenAccount(connection, wallet);
	const lpTokenAccountInfo = await connection.getParsedAccountInfo(marketLPTokenAccount);

	if (!lpTokenAccountInfo.value) {
		throw Error("Couldn't fetch lp token account info");
	}

	return new PublicKey((lpTokenAccountInfo.value.data as ParsedAccountData).parsed.info.mint);
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

const getDepositorLPTokenAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpMint = await getLPMint(connection, wallet);
	return getTokenAccount(connection, wallet.publicKey, lpMint);
});

const getDepositorInvestorTokenTokenAccount = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const _depositorInvestorTokenPDA = getDepositorInvestorTokenPDA(wallet.publicKey);
		const _investorTokenMint = getInvestorTokenMintAccount(connection, wallet);

		const [depositorInvestorTokenPDA, investorTokenMint] = await Promise.all([
			_depositorInvestorTokenPDA,
			_investorTokenMint,
		]);

		return getTokenAccount(connection, depositorInvestorTokenPDA[0], investorTokenMint);
	}
);

export const getBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const tokenAccount = await getDepositorLPTokenAccount(connection, wallet);

	if (!tokenAccount) {
		return 0;
	}

	// TODO: is it ok to only show the balance of the first one? do we need to add them all up?
	const balance = 1.0 * tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
	return Math.round(balance * 100) / 100;
});

const getLPBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
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

	const _lpBalance: Promise<number> = getLPBalance(connection, wallet);
	const [lpBalance, settledDealDataCalls] = await Promise.all([
		_lpBalance,
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

	return runningAPY + 6 * formatNumber(lpBalance as unknown as number);
});

const getAPY = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const _lpBalance = getLPBalance(connection, wallet);
	const _runningApy = getRunningAPY(connection, wallet);

	const [lpBalance, outstandingCredit, runningAPY] = await Promise.all([
		_lpBalance,
		_outstandingCredit,
		_runningApy,
	]);

	const outstandingCreditFormatted = formatNumber(outstandingCredit);
	const lpBalanceFormatted = formatNumber(lpBalance);

	if (lpBalanceFormatted === 0 && outstandingCreditFormatted === 0) {
		return 0;
	}

	return Math.round(runningAPY / (outstandingCreditFormatted + lpBalanceFormatted)) / 100;
});

const getSolendBuffer = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpBalance = await getLPBalance(connection, wallet);
	return formatNumber(lpBalance);
});

const getTVL = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpBalanceCall = getLPBalance(connection, wallet);
	const outstandingCreditCall = getOutstandingCredit(connection, wallet);
	const [lpBalance, outstandingCredit] = await Promise.all([lpBalanceCall, outstandingCreditCall]);

	return formatNumber(lpBalance) + formatNumber(outstandingCredit);
});

const getMarketLPTokenAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return globalMarketStateData.liquidityPoolTokenAccount;
});

const getInvestorTokenMintAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return globalMarketStateData.investorTokenMintAccount;
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
		const _depositorInvestorTokenPDA = getDepositorInvestorTokenPDA(wallet.publicKey);
		const _investorTokenMintAuthorityPDA = getInvestorTokenMintAuthorityPDA();

		const [depositorPDA, depositorInvestorTokenPDA, investorTokenMintAuthorityPDA] =
			await Promise.all([
				_depositorPDA,
				_depositorInvestorTokenPDA,
				_investorTokenMintAuthorityPDA,
			]);

		const program = getProgram(connection, wallet);

		return program.rpc.createDepositor({
			accounts: {
				owner: wallet.publicKey,
				depositor: wallet.publicKey,
				depositorInfo: depositorPDA[0],
				depositorInvestorTokenAccount: depositorInvestorTokenPDA[0],
				investorTokenMintAccount: investorTokenMintAuthorityPDA[0],
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
		const _investorTokenMintAuthorityPDA = getInvestorTokenMintAuthorityPDA();
		const _depositorInfoPDA = getDepositorInfoPDA(wallet.publicKey);
		const _depositorInvestorTokenPDA = getDepositorInvestorTokenPDA(wallet.publicKey);
		const _depositorLPTokenAccount = getDepositorLPTokenAccount(connection, wallet);
		const _lpMint = getLPMint(connection, wallet);
		const _investorTokenMintAccount = getInvestorTokenMintAccount(connection, wallet);
		const _marketLPTokenAccount = getMarketLPTokenAccount(connection, wallet);

		const [
			globalMarketStatePDA,
			investorTokenMintAuthorityPDA,
			depositorInfoPDA,
			depositorInvestorTokenPDA,
			depositorLPTokenAccount,
			lpMint,
			investorTokenMintAccount,
			marketLPTokenAccount,
		] = await Promise.all([
			_globalMarketStatePDA,
			_investorTokenMintAuthorityPDA,
			_depositorInfoPDA,
			_depositorInvestorTokenPDA,
			_depositorLPTokenAccount,
			_lpMint,
			_investorTokenMintAccount,
			_marketLPTokenAccount,
		]);

		if (!depositorLPTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.depositFunds(investorTokenMintAuthorityPDA[1], depositAmount, {
			accounts: {
				depositor: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				depositorInfo: depositorInfoPDA[0],
				depositorTokenAccount: depositorLPTokenAccount.pubkey,
				liquidityPoolTokenAccount: marketLPTokenAccount,
				investorTokenMintAccount: investorTokenMintAccount,
				depositorInvestorTokenAccount: depositorInvestorTokenPDA[0],
				usdcMintAccount: lpMint,
				tokenProgram: TOKEN_PROGRAM_ID,
			},
		});
	}
);

export const withdrawInvestment = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		const program = getProgram(connection, wallet);
		const _investorTokenPrice = getInvestorTokenPrice(connection, wallet);
		const _globalMarketStatePDA = getGlobalMarketStatePDA();
		const _depositorInvestorTokenPDA = getDepositorInvestorTokenPDA(wallet.publicKey);
		const _depositorLPTokenAccount = getDepositorLPTokenAccount(connection, wallet);
		const _marketLPTokenPDA = getMarketLPTokenPDA();
		const _investorTokenMintAccount = getInvestorTokenMintAccount(connection, wallet);
		const _lpMint = getLPMint(connection, wallet);
		const _marketLPTokenAccount = getMarketLPTokenAccount(connection, wallet);
		const _treasuryPoolTokenAccount = getTreasuryPoolTokenAccount(connection, wallet);

		const [
			investorTokenPrice,
			globalMarketStatePDA,
			depositorInvestorTokenPDA,
			depositorLPTokenAccount,
			marketLPTokenPDA,
			investorTokenMintAccount,
			lpMint,
			marketLPTokenAccount,
			treasuryPoolTokenAccount,
		] = await Promise.all([
			_investorTokenPrice,
			_globalMarketStatePDA,
			_depositorInvestorTokenPDA,
			_depositorLPTokenAccount,
			_marketLPTokenPDA,
			_investorTokenMintAccount,
			_lpMint,
			_marketLPTokenAccount,
			_treasuryPoolTokenAccount,
		]);

		const withdrawAmount = new BN(Math.floor((amount / investorTokenPrice) * 1000000));

		if (!depositorLPTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.withdrawFunds(
			marketLPTokenPDA[1],
			depositorInvestorTokenPDA[1],
			withdrawAmount,
			{
				accounts: {
					withdrawer: wallet.publicKey,
					globalMarketState: globalMarketStatePDA[0],
					withdrawerInvestorTokenAccount: depositorInvestorTokenPDA[0],
					withdrawerTokenAccount: depositorLPTokenAccount.pubkey,
					liquidityPoolTokenAccount: marketLPTokenAccount,
					treasuryPoolTokenAccount: treasuryPoolTokenAccount,
					investorTokenMintAccount: investorTokenMintAccount,
					usdcMintAccount: lpMint,
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
	const _depositorLPTokenAccount = getDepositorLPTokenAccount(connection, wallet);
	const _lpMint = getLPMint(connection, wallet);
	const _marketLPTokenPDA = getMarketLPTokenPDA();
	const _globalMarketStatePDA = getGlobalMarketStatePDA();
	const _dealPDA = getDealPDA(wallet.publicKey);

	const [depositorLPTokenAccount, lpMint, marketLPTokenPDA, globalMarketStatePDA, dealPDA] =
		await Promise.all([
			_depositorLPTokenAccount,
			_lpMint,
			_marketLPTokenPDA,
			_globalMarketStatePDA,
			_dealPDA,
		]);

	if (!depositorLPTokenAccount) {
		throw Error("No USDC token accounts found for depositor");
	}

	return program.rpc.activateDeal(marketLPTokenPDA[1], {
		accounts: {
			owner: wallet.publicKey,
			globalMarketState: globalMarketStatePDA[0],
			deal: dealPDA[0],
			liquidityPoolTokenAccount: marketLPTokenPDA[0],
			borrowerTokenAccount: depositorLPTokenAccount.pubkey,
			usdcMintAccount: lpMint,
			tokenProgram: TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
		},
	});
});

const getInvestorTokenSupply = multiAsync(async (connection: Connection) => {
	const investorTokenMintAuthorityPDA = await getInvestorTokenMintAuthorityPDA();
	return connection.getTokenSupply(investorTokenMintAuthorityPDA[0]);
});

const getInvestorTokenPrice = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const _outstandingCredit = getOutstandingCredit(connection, wallet);
	const _lpBalance = getLPBalance(connection, wallet);
	const _investorTokenSupply = getInvestorTokenSupply(connection);

	const [outstandingCredit, lpBalance, investorTokenSupply] = await Promise.all([
		_outstandingCredit,
		_lpBalance,
		_investorTokenSupply,
	]);

	return (
		((outstandingCredit + lpBalance) * 1.0) /
		(investorTokenSupply.value.amount as unknown as number)
	);
});

export const getInvestorTokenUSDCBalance = multiAsync(
	async (connection: Connection, wallet: Wallet) => {
		const _investorTokenPrice = getInvestorTokenPrice(connection, wallet);
		const _depositorInvestorTokenTokenAccount = getDepositorInvestorTokenTokenAccount(
			connection,
			wallet
		);

		const [investorTokenPrice, depositorInvestorTokenTokenAccount] = await Promise.all([
			_investorTokenPrice,
			_depositorInvestorTokenTokenAccount,
		]);

		if (!depositorInvestorTokenTokenAccount) {
			return 0;
		}

		const stake =
			depositorInvestorTokenTokenAccount.account.data.parsed.info.tokenAmount.uiAmount *
			investorTokenPrice;

		return Math.round(stake * 100) / 100;
	}
);
