import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useEffect, useState } from "react";
import { GatewayProvider } from "@civic/solana-gateway-react";
import { getGatekeeperNetwork } from "../../client/api";
import { Wallet } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { config } from "../../config";
import { CivicHeaderSection } from "@components/CivicHeaderSection";
import { SolanaCluster } from "../../types/solana.types";

export const Identity = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();

	const [gatekeeperNetwork, setGatekeeperNetwork] = useState<PublicKey>();

	useEffect(() => {
		const updateGatekeeperNetwork = async () => {
			const gatekeeperNetwork = await getGatekeeperNetwork(connection.connection, wallet as Wallet);
			setGatekeeperNetwork(gatekeeperNetwork);
		};

		if (wallet?.publicKey && connection.connection) {
			updateGatekeeperNetwork();
		}
	}, [connection.connection, wallet]);

	const mapClusterNameToStage = (clusterName: SolanaCluster) => {
		switch(clusterName) {
			case SolanaCluster.LOCALNET: {
				return "local";
			}
			case SolanaCluster.DEVNET: {
				return "preprod";
			}
			case SolanaCluster.MAINNET: {
				return "prod";
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
					<CivicHeaderSection gatekeeperNetwork={gatekeeperNetwork} />
				}
			</GatewayProvider>
		</>
	);
};
