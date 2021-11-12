import { Idl } from "@project-serum/anchor";
import { ConfirmOptions, PublicKey } from "@solana/web3.js";
import { RPCEndpoint } from "./solana.types";

export interface ClusterConfig {
	RPCEndpoint: RPCEndpoint;
	programId: PublicKey;
	lpMintId: PublicKey;
}

export interface Config {
	clusterConfig: ClusterConfig;
	idl: Idl;
	confirmOptions: ConfirmOptions;
}
