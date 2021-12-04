import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useState } from "react";
import { useRefresh } from "react/hooks/useRefresh";
import { withdrawInvestment } from "store/api";
import "../../../styles/depositstakeform.scss";
import { useNotify } from "../../hooks/useNotify";

export const WithdrawStakeForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [withdrawAmount, setWithdrawAmount] = useState<number | undefined>();
	const notify = useNotify();
	const triggerRefresh = useRefresh();

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!withdrawAmount) {
			console.error("Need withdraw value to submit");
			return;
		}

		const withdrawAmountFee = withdrawAmount * 0.005; // 0.5 percent fee;

		try {
			await withdrawInvestment(withdrawAmount, connection.connection, wallet as Wallet);
			notify("success", `Successful withdraw of ${withdrawAmount} USDC with a ${withdrawAmountFee} USDC fee`);
			triggerRefresh();
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
		} finally {
			setWithdrawAmount(undefined);
		}
	};

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		setWithdrawAmount(newValue);
	};

	const canSubmit = () => !(wallet?.publicKey && withdrawAmount);

	return (
		<form onSubmit={onSubmit} className="row">
			<label className="stake-input-label">
				<input
					placeholder={"1000"}
					value={withdrawAmount === undefined ? "" : withdrawAmount}
					type="number"
					step=".01"
					onChange={onChange}
					className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</label>
			<input
				disabled={canSubmit()}
				value="Withdraw USDC"
				type="submit"
				className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
			/>
		</form>
	);
};
