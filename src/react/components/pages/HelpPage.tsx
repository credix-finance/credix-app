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
						{" "}
						This demo is live on Solana Testnet. To interact with Credix:{" "}
						<a href="https://www.solfaucet.com" target="_blank" rel="noreferrer">
							get some SOL
						</a>
						,
						<a href="https://www.usdcfaucet.com" target="_blank" rel="noreferrer">
							get some USDC
						</a>{" "}
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
