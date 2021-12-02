import { Button } from "@material-ui/core";
import "../../styles/navbar.scss";

interface Props {
	text: string;
}

export const FaucetButton = (props: Props) => {
	const onClick = () => {
		window.open("https://spl-token-faucet.com/?token-name=USDC", "_blank")?.focus();
	};

	return (
		<Button
			onClick={onClick}
			className="MuiButton-containedPrimary balance-button credix-button navbar-button"
		>
			{props.text}
		</Button>
	);
};
