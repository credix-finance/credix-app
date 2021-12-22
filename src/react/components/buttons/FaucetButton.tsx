import "../../../styles/navbar.scss";
import { CredixButton } from "@components/buttons/CredixButton";
import React from "react";

interface Props {
	text: string;
	className?: string;
}

export const FaucetButton = (props: Props) => {
	const onClick = () => {
		window.open("https://spl-token-faucet.com/?token-name=USDC", "_blank")?.focus();
	};

	return <CredixButton text={props.text} onClick={onClick} className={props.className} />;
};
