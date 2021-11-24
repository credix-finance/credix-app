export enum SolanaCluster {
	LOCALNET = "localnet",
	TESTNET = "testnet",
	DEVNET = "devnet",
}

export enum RPCEndpoint {
	LOCALNET = "http://127.0.0.1:8899",
	TESTNET = "https://api.testnet.solana.com",
	DEVNET = "https://api.devnet.solana.com",
}

export type PdaSeeds = Array<Buffer | Uint8Array>;
