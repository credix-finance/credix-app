import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useState } from "react";
import { withdrawInvestment } from "store/api";
import "../../../styles/depositstakeform.scss";

export const WithdrawStakeForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
	// const notify = useNotify();

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await withdrawInvestment(withdrawAmount, connection.connection, wallet as Wallet);
		} catch (e: any) {
			// notify("error", `Transaction failed! ${e?.message}`);
		}
	};

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setWithdrawAmount(Number(e.target.value));
	};

	return (
		<form onSubmit={onSubmit} className="row">
			<label className="stake-input-label">
				<input
					type="number"
					step=".01"
					onChange={onChange}
					className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</label>
			<input
				disabled={!wallet}
				value="Withdraw USDC"
				type="submit"
				className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
			/>
		</form>
	);
};
