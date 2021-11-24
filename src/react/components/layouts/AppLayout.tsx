import React from "react";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";

interface Props {
	children?: React.ReactNode;
}

export const AppLayout = (props: Props) => (
	<>
		<Navbar />
		{props.children}
		<Footer />
	</>
);
