import { Provider, Wallet } from "@project-serum/anchor";
import { makeSaberProvider, newProgram } from "@saberhq/anchor-contrib";
import { Connection } from "@solana/web3.js";
import { config } from "config";
import { CredixProgram } from "types/program.types";

export const newCredixProgram = (connection: Connection, wallet:typeof Wallet) => {
	const provider = new Provider(connection, wallet, config.confirmOptions);
	const saberProvider = makeSaberProvider(provider);
	return newProgram<CredixProgram>(config.idl, config.clusterConfig.programId, saberProvider);
};
