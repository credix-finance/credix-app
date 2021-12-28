import React from "react";
import { CredixButton } from "./CredixButton";
import { IconLogo } from "@civic/solana-gateway-react/dist/cjs/button/IconLogo";

interface Props {
	className?: string;
	text: string;
	onClick: () => void;
}

export const CivicButton = (props: Props) =>
	<CredixButton
		startIcon={<IconLogo width={20}/>}
		text={props.text}
		onClick={props.onClick}
		className={props.className}
	/>;
