import React from "react";
import { PassGuard } from "react/PassGuard";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";

interface Props {
	children?: React.ReactNode;
}

export const AppLayout = (props: Props) => (
	<>
		<Navbar />
		<PassGuard>{props.children}</PassGuard>
		<Footer />
	</>
);
