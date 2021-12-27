import { Balance } from "@components/Balance";
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";
import React from "react";
import "../../styles/navbar.scss";
import logo from "../../assets/credix_logo_zwart.svg";
import { FaucetButton } from "./buttons/FaucetButton";
import { Identity } from "@components/Identity";

export const Navbar = () => (
	<div className="navbar-container">
		<div className="logo-and-tag-line">
			<img src={logo} alt="" className="logo" />
			<span className="tag-line">Credit investing democratized</span>
		</div>
		<div className="balance-wallet-container">
			<Identity />
			<WalletMultiButton className="navbar-button credix-button" />
			<FaucetButton text="Get USDC" className="navbar-button" />
			<Balance />
		</div>
	</div>
);
