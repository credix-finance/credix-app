import { FaucetButton } from "@components/FaucetButton";
import { AppLayout } from "@components/layouts/AppLayout";
import { Youtube } from "@components/Youtube";
import "../../../styles/help.scss";

export const HelpPage = () => {
	return (
		<AppLayout>
			<div className="help-container">
				<div className="help-wrapper">
					<h3> 1 | Watch the walk-through </h3>
					<Youtube embedId={"P7xDt1wJe4A"} />
					<h3> 2 | Get yourself SOL and USDC </h3>
					<p>
						<br />
						This demo is live on Solana Devnet. To interact with Credix:
						<br />
						<br />
						<FaucetButton text="Get SOL & USDC" />
						<br />
						<br />
						and connect your wallet.
						<br />
						<br />
						Any questions, remarks, ideas?
						<br />
						Get in touch: <a href="mailto:info@credix.finance">info@credix.finance</a>
					</p>
				</div>
			</div>
		</AppLayout>
	);
};
