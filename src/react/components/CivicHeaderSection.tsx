import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React from "react";
import { Badge, IdentityButton, useGateway } from "@civic/solana-gateway-react";
import { PublicKey } from "@solana/web3.js";
import { config } from "../../config";

interface Props {
	gatekeeperNetwork: PublicKey;
}

export const CivicHeaderSection = (props: Props) => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const { gatewayToken } = useGateway();

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
				{!gatewayToken && <div className={"navbar-button"}>
					<IdentityButton />
				</div>}
			</>}
		</>
	);
};
