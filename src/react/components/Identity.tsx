import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useEffect, useState } from "react";
import { GatewayProvider } from "@civic/solana-gateway-react";
import { getGatekeeperNetwork } from "../../client/api";
import { Wallet } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { config } from "../../config";
import { Gateway } from "@components/Gateway";
import { SolanaCluster } from "../../types/solana.types";

export const Identity = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();

	const [gatekeeperNetwork, setGatekeeperNetwork] = useState<PublicKey | undefined>(undefined);

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			updateGatekeeperNetwork();
		}
	}, [wallet?.publicKey]);

	const updateGatekeeperNetwork = async () => {
		const gatekeeperNetwork = await getGatekeeperNetwork(connection.connection, wallet as Wallet);
		setGatekeeperNetwork(gatekeeperNetwork);
	};

	const mapClusterNameToStage = (clusterName: SolanaCluster) => {
		switch(clusterName) {
			case SolanaCluster.LOCALNET: {
				return SolanaCluster.LOCALNET.replace("net", "");
			}
			case SolanaCluster.DEVNET: {
				return SolanaCluster.DEVNET.replace("net", "");
			}
			case SolanaCluster.MAINNET: {
				return SolanaCluster.MAINNET;
			}
			default: {
				break;
			}
		}
	};

	return (
		<>
			<GatewayProvider
				wallet={wallet}
				stage={mapClusterNameToStage(config.clusterConfig.name)}
				gatekeeperNetwork={gatekeeperNetwork}
				clusterUrl={config.clusterConfig.RPCEndpoint}
			>
				{ gatekeeperNetwork &&
					<Gateway gatekeeperNetwork={gatekeeperNetwork} className="navbar-button credix-button" />
				}
			</GatewayProvider>
		</>
	);
};
