import React from "react";
import { CredixButton } from "./CredixButton";

interface Props {
	className?: string;
	text: string;
	onClick: () => void;
}

export const CivicButton = (props: Props) =>
	<CredixButton
		text={props.text}
		onClick={props.onClick}
		className={props.className}
	/>;
