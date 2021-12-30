import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React from "react";
import { Badge, GatewayStatus, useGateway } from "@civic/solana-gateway-react";
import { PublicKey } from "@solana/web3.js";
import { config } from "../../config";
import { CivicButton } from "@components/buttons/CivicButton";

interface Props {
	gatekeeperNetwork: PublicKey;
	className?: string;
}

export const CivicHeaderSection = (props: Props) => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const { gatewayStatus, gatewayToken } = useGateway();

	return (
		<>
			{wallet?.publicKey &&
			<>
				{props.gatekeeperNetwork && <Badge
					clusterName={config.clusterConfig.name}
					gatekeeperNetwork={props.gatekeeperNetwork}
					publicKey={wallet.publicKey}
					connection={connection.connection}
				/>}
				{!gatewayToken && <CivicButton
					className={props.className}
					text={GatewayStatus[gatewayStatus]}
				/>}
			</>}
		</>
	);
};
