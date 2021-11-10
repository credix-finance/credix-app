import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";
import React from "react";
import { Balance } from "@components/Balance";

export const Navbar = () => (
	<div>
		<WalletMultiButton></WalletMultiButton>
		<Balance />
		<Balance />
		<Balance />
	</div>
);
