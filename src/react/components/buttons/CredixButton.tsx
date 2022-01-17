import React from "react";
import { Button } from "@material-ui/core";
import "../../../styles/navbar.scss";

interface Props {
	text: string;
	onClick?: () => void;
	className?: string;
	startIcon?: any;
}

export const CredixButton = (props: Props) => {
	return (
		<Button
			startIcon={props.startIcon}
			onClick={props.onClick}
			className={`MuiButton-containedPrimary balance-button credix-button ${props.className}`}
		>
			{props.text}
		</Button>
	);
};
