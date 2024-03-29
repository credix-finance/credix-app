import { Balance } from "@components/Balance";
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";
import React from "react";
import "../../styles/navbar.scss";
import logo from "../../assets/credix_logo_zwart.svg";
import { FaucetButton } from "./buttons/FaucetButton";
import { Identity } from "@components/Identity";
import { config } from "../../config";
import { SolanaCluster } from "../../types/solana.types";

export const Navbar = () => (
	<div className="navbar-container">
		<div className="logo-and-tag-line">
			<img src={logo} alt="" className="logo" />
			<span className="tag-line">Credit investing democratized</span>
		</div>
		<div className="balance-wallet-container">
			{config.clusterConfig.name !== SolanaCluster.LOCALNET && <Identity />}
			<WalletMultiButton className="header-button credix-button" />
			{config.clusterConfig.name !== SolanaCluster.MAINNET && (
				<FaucetButton text="Get USDC" className="header-button" />
			)}
			<Balance />
		</div>
	</div>
);
