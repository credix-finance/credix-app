import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useEffect, useState } from "react";
import { GatewayProvider } from "@civic/solana-gateway-react";
import { getGatekeeperNetwork } from "../../client/api";
import { Wallet } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { config } from "../../config";
import { Gateway } from "@components/Gateway";

interface Props {
	text: string;
	className?: string;
}

export const Identity = (props: Props) => {
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

	return (
		<>
			<GatewayProvider
				wallet={wallet}
				gatekeeperNetwork={gatekeeperNetwork}
				clusterUrl={config.clusterConfig.RPCEndpoint}
			>
				{ gatekeeperNetwork &&
					<Gateway gatekeeperNetwork={gatekeeperNetwork} className={props.className} />
				}
			</GatewayProvider>
		</>
	);
};
