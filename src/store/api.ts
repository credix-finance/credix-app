import { BN, Address, Program, Provider, utils, Wallet, web3 } from "@project-serum/anchor";
import { Idl, IdlTypeDef } from "@project-serum/anchor/dist/cjs/idl";
import { IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { multiAsync } from "async.utils";
import { config } from "config";
import { SEEDS } from "consts";
import { PoolStats } from "types/program.types";
import { PdaSeeds } from "types/solana.types";

const mapPKToSeed = (publicKey: PublicKey) => publicKey.toBuffer().slice(0, 10);

const encodeSeedString = (seedString: string) => utils.bytes.utf8.encode(seedString);

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
	const seed = encodeSeedString(SEEDS.DEPOSITOR_TOKEN);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), Buffer.from(seed)];
	return getPDA(seeds);
});

const getDepositorPDA = multiAsync(async (publicKey: PublicKey) => {
	const seed = encodeSeedString(SEEDS.DEPOSITOR);
	const seeds: PdaSeeds = [mapPKToSeed(publicKey), Buffer.from(seed)];
	return getPDA(seeds);
});

const getInvestorTokenMintAuthorityPDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.INVESTOR_MINT_AUTHORITY);
	return getPDA([seed]);
});

const getGlobalMarketStateData = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const program = getProgram(connection, wallet);
	const globalMarketStatePDA = await getGlobalMarketStatePDA();
	return program.account.globalMarketState.fetch(globalMarketStatePDA[0]);
});

const getLPTokenAccountInfo = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return connection.getParsedAccountInfo(globalMarketStateData.liquidityPoolTokenAccount);
});

const getLPMint = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpTokenAccountInfo = await getLPTokenAccountInfo(connection, wallet);

	if (!lpTokenAccountInfo.value) {
		throw Error("Couldn't fetch lp token account info");
	}

	return new PublicKey((lpTokenAccountInfo.value.data as ParsedAccountData).parsed.info.mint);
});

const getLPMintTokenAccounts = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpMint = await getLPMint(connection, wallet);
	return connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: lpMint });
});

export const getLPMintTokenAccount = multiAsync(async (connection, wallet) => {
	const tokenAccounts = await getLPMintTokenAccounts(connection, wallet);
	return tokenAccounts.value[0];
});

export const getBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const tokenAccount = await getLPMintTokenAccount(connection, wallet);

	if (!tokenAccount) {
		return 0;
	}

	// TODO: is it ok to only show the balance of the first one? do we need to add them all up?
	return 1.0 * tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
});

const getParsedProgramAccounts = multiAsync(async (connection: Connection) => {
	const programId = config.clusterConfig.programId;
	return connection.getParsedProgramAccounts(programId);
});

const getLPBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return (1.0 * globalMarketStateData.liquidityPoolUsdcAmount.toNumber()) / 1000000;
});

const getOutstandingCredit = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	// TODO: can we extract this '1000000' into a constant?
	return (1.0 * globalMarketStateData.totalOutstandingCredit.toNumber()) / 1000000;
});

const getRunningAPY = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const programAccounts = await getParsedProgramAccounts(connection);
	const dealDataCalls: Array<Promise<void | TypeDef<IdlTypeDef, IdlTypes<Idl>>>> = [];

	// We don't know which programAccounts are deal accounts so we try and catch the error if \
	//  it isn't
	programAccounts.forEach((programAccount) => {
		dealDataCalls.push(getDealAccountData(programAccount.pubkey, connection, wallet));
	});

	const lpBalanceCall: Promise<number> = getLPBalance(connection, wallet);
	const [lpBalance, settledDealDataCalls] = await Promise.all([
		lpBalanceCall,
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

	return runningAPY + 6 * (lpBalance as unknown as number);
});

const getAPY = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const outstandingCreditCall = getOutstandingCredit(connection, wallet);
	const lpBalanceCall = getLPBalance(connection, wallet);
	const runningApyCall = getRunningAPY(connection, wallet);

	const [lpBalance, outstandingCredit, runningAPY] = await Promise.all([
		lpBalanceCall,
		outstandingCreditCall,
		runningApyCall,
	]);

	if (lpBalance === 0 && outstandingCredit === 0) {
		return 0;
	}

	return Math.round(runningAPY / (outstandingCredit + lpBalance)) / 100;
});

const getSolendBuffer = multiAsync(async (connection: Connection, wallet: Wallet) => {
	return getLPBalance(connection, wallet);
});

const getTVL = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpBalanceCall = getLPBalance(connection, wallet);
	const outstandingCreditCall = getOutstandingCredit(connection, wallet);
	const [lpBalance, outstandingCredit] = await Promise.all([lpBalanceCall, outstandingCreditCall]);

	return lpBalance + outstandingCredit;
});

export const getPoolStats = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const tvlCall = getTVL(connection, wallet);
	const apyCall = getAPY(connection, wallet);
	const outstandingCreditCall = getOutstandingCredit(connection, wallet);
	const solendBufferCall = getSolendBuffer(connection, wallet);

	const [TVL, APY, outstandingCredit, solendBuffer] = await Promise.all([
		tvlCall,
		apyCall,
		outstandingCreditCall,
		solendBufferCall,
	]);

	const poolStats: PoolStats = {
		TVL,
		APY,
		outstandingCredit,
		solendBuffer,
	};

	return poolStats;
});

const getDepositorAccountData = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const depositorPDA = await getDepositorPDA(wallet.publicKey);
	const program = getProgram(connection, wallet);

	return program.account.depositorInfo.fetch(depositorPDA[0]);
});

const createDepositorAccount = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const depositorPDAPromise = getDepositorPDA(wallet.publicKey);
	const depositorInvestorTokenPDAPromise = getDepositorInvestorTokenPDA(wallet.publicKey);
	const investorTokenMintAuthorityPDAPromise = getInvestorTokenMintAuthorityPDA();

	const [depositorPDA, depositorInvestorTokenPDA, investorTokenMintAuthorityPDA] =
		await Promise.all([
			depositorPDAPromise,
			depositorInvestorTokenPDAPromise,
			investorTokenMintAuthorityPDAPromise,
		]);

	const program = getProgram(connection, wallet);

	return program.rpc.createDepositor({
		accounts: {
			owner: wallet.publicKey,
			depositor: wallet.publicKey,
			depositorInfo: depositorPDA[0],
			depositorInvestorTokenPDA: depositorInvestorTokenPDA[0],
			investorTokenMintAccount: investorTokenMintAuthorityPDA[0],
			rent: web3.SYSVAR_RENT_PUBKEY,
			tokenProgram: TOKEN_PROGRAM_ID,
		},
	});
});

const depositInvestment = multiAsync(
	async (amount: number, connection: Connection, wallet: Wallet) => {
		// TODO: turn into constant
		const depositAmount = new BN(amount * 1000000);
		const program = getProgram(connection, wallet);
		const globalMarketStatePDAPromise = getGlobalMarketStatePDA();
		const globalMarketStateDataCall = getGlobalMarketStateData(connection, wallet);
		const investorTokenMintAuthorityPDAPromise = getInvestorTokenMintAuthorityPDA();
		const depositorPDAPromise = getDepositorPDA(wallet.publicKey);
		const depositorInvestorTokenPDAPromise = getDepositorInvestorTokenPDA(wallet.publicKey);
		const lpMintTokenAccountCall = getLPMintTokenAccount(connection, wallet);
		const lpMintCall = getLPMint(connection, wallet);

		const [
			globalMarketStatePDA,
			globalMarketState,
			investorTokenMintAuthorityPDA,
			depositorPDA,
			depositorInvestorTokenPDA,
			lpMintTokenAccount,
			lpMint,
		] = await Promise.all([
			globalMarketStatePDAPromise,
			globalMarketStateDataCall,
			investorTokenMintAuthorityPDAPromise,
			depositorPDAPromise,
			depositorInvestorTokenPDAPromise,
			lpMintTokenAccountCall,
			lpMintCall,
		]);

		if (!lpMintTokenAccount) {
			throw Error("No USDC token accounts found for depositor");
		}

		return program.rpc.depositFunds(investorTokenMintAuthorityPDA[1], depositAmount, {
			accounts: {
				depositor: wallet.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				depositorInfo: depositorPDA[0],
				depositorTokenAccount: lpMintTokenAccount.pubkey,
				liquidityPoolTokenAccount: globalMarketState.liquidityPoolTokenAccount,
				investorTokenMintAccount: globalMarketState.investorTokenMintAccount,
				depositorInvestorTokenAccount: depositorInvestorTokenPDA[0],
				usdcMintAccount: lpMint,
				tokenProgram: TOKEN_PROGRAM_ID,
			},
			signer: wallet.publicKey,
		});
	}
);
