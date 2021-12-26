import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useEffect, useState } from "react";
import { Badge, GatewayProvider, useGateway } from "@civic/solana-gateway-react";
import { getGatekeeperNetwork } from "../../client/api";
import { Wallet } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { config } from "../../config";
import { CredixButton } from "@components/buttons/CredixButton";

interface Props {
	text: string;
	className?: string;
}

export const Identity = (props: Props) => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const { requestGatewayToken } = useGateway();

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
				{wallet?.publicKey &&
					<>
						{ gatekeeperNetwork && <Badge
							clusterName={config.clusterConfig.name}
							gatekeeperNetwork={gatekeeperNetwork}
							publicKey={wallet.publicKey}
						/> }
						<CredixButton text={props.text} onClick={requestGatewayToken} className={props.className} />
					</>
				}
			</GatewayProvider>
		</>
	);
};
