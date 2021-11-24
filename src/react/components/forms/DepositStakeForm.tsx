import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { serialAsync } from "async.utils";
import React, { useState } from "react";
import { createDepositorAccounts, depositInvestment, getDepositorInfoAccountData } from "store/api";
import "../../../styles/depositstakeform.scss";
import { useNotify } from "../../hooks/useNotify";

export const DepositStakeForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [stake, setStake] = useState<number>(0);
	const notify = useNotify();

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();
		// TODO: do some error checking before just creating a depositor \
		//  should every error result in the creation of a depositor ?
		try {
			await getDepositorInfoAccountData(connection.connection, wallet as Wallet);
		} catch {
			await createDepositorAccounts(connection.connection, wallet as Wallet);
		}

		try {
			await depositInvestment(stake, connection.connection, wallet as Wallet);
			notify("success", `Successful deposit of ${stake} USDC`);
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
		}
	});

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setStake(Number(e.target.value));
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
				value="Stake USDC"
				type="submit"
				className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
			/>
		</form>
	);
};
