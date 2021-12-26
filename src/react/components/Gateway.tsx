import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React from "react";
import { Badge, GatewayStatus, useGateway } from "@civic/solana-gateway-react";
import { PublicKey } from "@solana/web3.js";
import { config } from "../../config";
import { CredixButton } from "@components/buttons/CredixButton";

interface Props {
	gatekeeperNetwork: PublicKey;
	className?: string;
}

export const Gateway = (props: Props) => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const { gatewayStatus, requestGatewayToken, gatewayToken } = useGateway();

	return (
		<>
			{ wallet?.publicKey &&
				<>
					{props.gatekeeperNetwork && <Badge
						clusterName={config.clusterConfig.name}
						gatekeeperNetwork={props.gatekeeperNetwork}
						publicKey={wallet.publicKey}
						connection={connection.connection}
					/>}
					{!gatewayToken && <CredixButton
						text={`CIVIC: ${GatewayStatus[gatewayStatus]}`}
						onClick={requestGatewayToken}
						className={props.className}
					/>}
				</>
			}
		</>
	);
};
