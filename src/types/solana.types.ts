import { PublicKey } from "@solana/web3.js";

export enum SolanaCluster {
	LOCALNET = "localnet",
	TESTNET = "testnet",
}

export enum RPCEndpoint {
	LOCALNET = "http://127.0.0.1:8899",
	TESTNET = "https://api.testnet.solana.com",
}

export interface ClusterConfig {
	RPCEndpoint: RPCEndpoint;
	programId: PublicKey;
}
