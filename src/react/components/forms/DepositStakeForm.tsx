import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { serialAsync } from "utils/async.utils";
import React, { useState } from "react";
import { useRefresh } from "react/hooks/useRefresh";
import { createDepositor, depositInvestment, getDepositorInfoAccountData } from "store/api";
import "../../../styles/depositstakeform.scss";
import { useNotify } from "../../hooks/useNotify";

export const DepositStakeForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [stake, setStake] = useState<number | undefined>();
	const notify = useNotify();
	const triggerRefresh = useRefresh();

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!stake) {
			return;
		}

		// TODO: do some error checking before just creating a depositor \
		//  should every error result in the creation of a depositor ?
		try {
			await getDepositorInfoAccountData(connection.connection, wallet as Wallet);
		} catch {
			await createDepositor(connection.connection, wallet as Wallet);
		}

		try {
			await depositInvestment(stake, connection.connection, wallet as Wallet);
			notify("success", `Successful deposit of ${stake} USDC`);
			triggerRefresh();
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
		} finally {
			setStake(undefined);
		}
	});

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		setStake(newValue);
	};

	const canSubmit = () => !(wallet?.publicKey && stake);

	return (
		<form onSubmit={onSubmit} className="row">
			<label className="stake-input-label">
				<input
					value={stake === undefined ? "" : stake}
					type="number"
					step=".01"
					placeholder={"1000"}
					onChange={onChange}
					className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</label>
			<input
				disabled={canSubmit()}
				value="Stake USDC"
				type="submit"
				className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
			/>
		</form>
	);
};
