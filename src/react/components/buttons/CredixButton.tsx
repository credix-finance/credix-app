import React from "react";
import { Button } from "@material-ui/core";
import "../../../styles/navbar.scss";

interface Props {
	text: string;
	onClick: () => void;
	className?: string;
}

export const CredixButton = (props: Props) => {
	return (
		<Button
			onClick={props.onClick}
			className={`MuiButton-containedPrimary balance-button credix-button ${props.className}`}
		>
			{props.text}
		</Button>
	);
};
