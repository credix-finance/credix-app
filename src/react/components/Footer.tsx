import { config } from "config";
import React from "react";
import { Link } from "react-router-dom";
import { Path } from "types/navigation.types";
import "../../styles/footer.scss";

export const Footer = () => (
	<div>
		<div className="footer footer-left">
			<Link to={Path.OVERVIEW}>Invest</Link>
			<Link to={Path.DEALS}>Borrow/Repay</Link>
			<Link to={Path.HELP} className="start-here animated bounce">
				Start here
			</Link>
		</div>
		<div className="footer footer-right">
			<a
				className="green"
				href={`https://explorer.solana.com/address/${config.clusterConfig.programId.toString()}?cluster=${
					config.clusterConfig.name
				}`}
				target="_blank"
				rel="noreferrer"
			>
				live on Solana devnet
			</a>
			<a href="https://credix.gitbook.io/credix" target="_blank" rel="noreferrer">
				docs
			</a>
		</div>
	</div>
);
