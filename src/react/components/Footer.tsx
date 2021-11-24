import React from "react";
import { Link } from "react-router-dom";
import "../../styles/footer.scss";

export const Footer = () => (
	<div>
		<div className="footer footer-left">
			<Link to="/">Pool</Link>
			<Link to="/deals">Deals</Link>
			<Link to="/help" className="start-here animated bounce">
				Start here
			</Link>
		</div>
		<div className="footer footer-right">
			<a
				className="green"
				href="https://explorer.solana.com/address/7xxjTaGoqD9vTGGD2sr4krbKBozKrwQSB4GLsXsV5SYW?cluster=testnet"
				target="_blank"
				rel="noreferrer"
			>
				live on Solana testnet
			</a>
			<a href="https://credix.gitbook.io/credix" target="_blank" rel="noreferrer">
				docs
			</a>
		</div>
	</div>
);
