import React from "react";
import { CredixButton } from "./CredixButton";
import { IconLogo } from "@civic/solana-gateway-react/dist/cjs/button/IconLogo";
import { useGateway } from "@civic/solana-gateway-react";

interface Props {
	className?: string;
	text: string;
}

export const CivicButton = (props: Props) => {
	const { requestGatewayToken } = useGateway();

	return <CredixButton
		startIcon={<IconLogo width={20} />}
		text={props.text}
		onClick={requestGatewayToken}
		className={props.className}
	/>;
};
