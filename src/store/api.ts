import { Address, Program, Provider, utils, Wallet } from "@project-serum/anchor";
import { Idl, IdlTypeDef } from "@project-serum/anchor/dist/cjs/idl";
import { IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { multiAsync } from "async.utils";
import { config } from "config";
import { SEEDS } from "consts";
import { PoolStats } from "types/program.types";

const getProgram = (connection: Connection, wallet: Wallet) => {
	const provider = new Provider(connection, wallet, config.confirmOptions);
	return new Program(config.idl, config.clusterConfig.programId, provider);
};

const getGlobalMarketStateAccountData = multiAsync(
	async (address: Address, connection: Connection, wallet: Wallet) => {
		const program = getProgram(connection, wallet);
		return program.account.globalMarketState.fetch(address);
	}
);

const getDealAccountData = multiAsync(
	async (address: Address, connection: Connection, wallet: Wallet) => {
		const program = getProgram(connection, wallet);
		return program.account.deal.fetch(address);
	}
);

const getGlobalMarketStatePDA = multiAsync(async () => {
	const seed = utils.bytes.utf8.encode(SEEDS.GLOBAL_MARKET_STATE_PDA);
	const programId = config.clusterConfig.programId;
	return PublicKey.findProgramAddress([seed], programId);
});

const getGlobalMarketStateData = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStatePDA = await getGlobalMarketStatePDA();
	return getGlobalMarketStateAccountData(globalMarketStatePDA[0], connection, wallet);
});

const getLPTokenAccountInfo = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStateData = await getGlobalMarketStateData(connection, wallet);
	return connection.getParsedAccountInfo(globalMarketStateData.liquidityPoolTokenAccount);
});

const getLPMintTokenAccounts = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const lpTokenAccountInfo = await getLPTokenAccountInfo(connection, wallet);

	if (!lpTokenAccountInfo.value) {
		throw Error("Couldn't fetch lp token account info");
	}

	const lpMint = new PublicKey(
		(lpTokenAccountInfo.value.data as ParsedAccountData).parsed.info.mint
	);

	return connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: lpMint });
});

export const getBalance = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const tokenAccounts = await getLPMintTokenAccounts(connection, wallet);

	if (!tokenAccounts.value.length) {
		return 0;
	}

	// TODO: is it ok to only show the balance of the first one? do we need to add them all up?
	return 1.0 * tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
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
