import { PublicKey } from "@solana/web3.js";
import { ClusterConfig, RPCEndpoint, SolanaCluster } from "types/solana.types";

/// PREFILLED CONFIGS
const localnetConfig: Partial<ClusterConfig> = {
	RPCEndpoint: RPCEndpoint.LOCALNET,
};

const testnetConfig: ClusterConfig = {
	RPCEndpoint: RPCEndpoint.TESTNET,
	programId: new PublicKey("7xxjTaGoqD9vTGGD2sr4krbKBozKrwQSB4GLsXsV5SYW"),
};
///

const getTargetClusterFromEnv = (): SolanaCluster => {
	const targetCluster = process.env.REACT_APP_CLUSTER;

	if (targetCluster) {
		if (!Object.values(SolanaCluster).some((c) => c === targetCluster)) {
			throw new Error(`Invalid cluster targetted ${targetCluster}`);
		}

		return targetCluster as SolanaCluster;
	}

	return SolanaCluster.LOCALNET;
};

const getBaseClusterConfig = (): Partial<ClusterConfig> => {
	const targetCluster = getTargetClusterFromEnv();

	switch (targetCluster) {
		case SolanaCluster.TESTNET:
			return testnetConfig;
		default:
			return localnetConfig;
	}
};

const getRPCEndpointFromEnv = (): RPCEndpoint | undefined => {
	const endpoint = process.env.REACT_APP_RPC_ENDPOINT;

	if (endpoint) {
		if (!Object.values(RPCEndpoint).some((e) => e === endpoint)) {
			throw new Error(`Invalid rpc endpoint ${endpoint}`);
		}

		return endpoint as RPCEndpoint;
	}
};

const getProgramIdFromEnv = (): PublicKey | undefined => {
	const key = process.env.REACT_APP_PROGRAM_ID;

	if (key) {
		return new PublicKey(key);
	}
};

export const clusterConfig = ((): ClusterConfig => {
	const baseClusterConfig = getBaseClusterConfig();

	const rpcEndpoint = getRPCEndpointFromEnv() || baseClusterConfig.RPCEndpoint;

	if (!rpcEndpoint) {
		throw new Error("No RPC endpoint provided");
	}

	const programId = getProgramIdFromEnv() || baseClusterConfig.programId;

	if (!programId) {
		throw new Error("No program id provided");
	}

	const clusterConfig: ClusterConfig = {
		RPCEndpoint: rpcEndpoint,
		programId: programId,
	};

	return clusterConfig;
})();
