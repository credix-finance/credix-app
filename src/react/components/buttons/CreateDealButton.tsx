import { PublicKey } from "@solana/web3.js";
import { useNavigate } from "react-router-dom";
import { Path } from "types/navigation.types";
import { CredixButton } from "./CredixButton";

interface Props {
	borrower?: PublicKey;
}

export const CreateDealButton = (props: Props) => {
	const navigate = useNavigate();

	const targetRoute = props.borrower
		? Path.DEALS_BORROWER_NEW.replace(":borrower", props.borrower.toString())
		: Path.DEALS_NEW;

	return <CredixButton text="Create deal" onClick={() => navigate(targetRoute)} />;
};
