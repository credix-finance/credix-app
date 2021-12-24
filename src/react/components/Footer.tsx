import { config } from "config";
import { Link } from "react-router-dom";
import { Path } from "types/navigation.types";
import "../../styles/footer.scss";
import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { MANAGEMENT_KEYS } from "consts";

export const Footer = () => {
	const [showAdminOptions, setshowAdminOptions] = useState<boolean>(false);
	const wallet = useAnchorWallet();

	useEffect(() => {
		if (MANAGEMENT_KEYS.includes(wallet?.publicKey.toString() ?? "")) {
			setshowAdminOptions(true);
		}
	}, [wallet]);

	return (
		<div>
			<div className="footer footer-left">
				<Link to={Path.OVERVIEW}>Invest</Link>
				<Link to={Path.DEALS}>Borrow/Repay</Link>
				<Link to={Path.HELP} className="start-here animated bounce">
					Start here
				</Link>
				{showAdminOptions ? <Link to={Path.CREDIX_PASS}>Credix Pass</Link> : <div></div>}
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
};
