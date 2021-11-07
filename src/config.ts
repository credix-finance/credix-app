import { PublicKey } from "@solana/web3.js";
import { ENV } from "types/env.types";
import { NetConfig, RPCEndpoint } from "types/solana.types";

/// Prefilled configs
const localnetConfig: Partial<NetConfig> = {
	RPCEndpoint: RPCEndpoint.LOCALNET,
};

const testnetConfig: NetConfig = {
	RPCEndpoint: RPCEndpoint.TESTNET,
	programId: new PublicKey("7xxjTaGoqD9vTGGD2sr4krbKBozKrwQSB4GLsXsV5SYW"),
};
///

const getRPCEndpoint = (baseEndpoint: string | undefined): RPCEndpoint => {
	const endpoint = process.env.REACT_APP_RPC_ENDPOINT || baseEndpoint;

	if (!Object.values(ENV).some((e) => e === endpoint)) {
		throw new Error(`Invalid rpc endpoint ${endpoint}`);
	}

	return endpoint as RPCEndpoint;
};

const getProgramId = (baseKey: PublicKey | undefined): PublicKey => {
	const envId = process.env.REACT_APP_PROGRAM_ID;

	if (envId) {
		return new PublicKey(envId);
	}

	if (!baseKey) {
		throw new Error("No program id provided");
	}

	return baseKey;
};

const getEnvironment = (): ENV => {
	const env = process.env.REACT_APP_NET || process.env.NODE_ENV;

	if (!Object.values(ENV).some((e) => e === env)) {
		throw new Error(`Invalid environment ${env}`);
	}

	return env as ENV;
};

// Creates a netconfig based on one of the prefilled configs above \
//  but with fields overridden by environment variables if present
export const netConfig: NetConfig = (() => {
	let baseConfig: Partial<NetConfig>;
	const env = getEnvironment();

	// TODO: deploy on mainnet and add a proper production environment
	switch (env) {
		case ENV.LOCAL:
			baseConfig = localnetConfig;
			break;
		case ENV.DEVELOPMENT:
		case ENV.PRODUCTION:
			baseConfig = testnetConfig;
	}

	const rpcEndpoint = getRPCEndpoint(baseConfig.RPCEndpoint);
	const programId = getProgramId(baseConfig.programId);

	const config: NetConfig = {
		RPCEndpoint: rpcEndpoint,
		programId,
	};

	return config;
})();
