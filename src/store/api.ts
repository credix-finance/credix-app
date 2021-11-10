import { Program, Provider, utils, Wallet } from "@project-serum/anchor";
import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { multiAsync } from "async.utils";
import { config } from "config";
import { SEEDS } from "consts";

const getGlobalMarketStatePDA = multiAsync(async () => {
	const seed = utils.bytes.utf8.encode(SEEDS.GLOBAL_MARKET_STATE_PDA);
	const programId = config.clusterConfig.programId;
	return PublicKey.findProgramAddress([seed], programId);
});

const getGlobalMarketStateData = multiAsync(async (connection: Connection, wallet: Wallet) => {
	const globalMarketStatePDA = await getGlobalMarketStatePDA();
	const provider = new Provider(connection, wallet, config.confirmOptions);
	const program = new Program(config.idl, config.clusterConfig.programId, provider);
	return program.account.globalMarketState.fetch(globalMarketStatePDA[0]);
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
