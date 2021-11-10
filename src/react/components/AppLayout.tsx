import React from "react";
import { Navbar } from "./Navbar";

interface Props {
	children?: React.ReactNode;
}

export const AppLayout = (props: Props) => (
	<>
		<Navbar />
		{props.children}
	</>
);
