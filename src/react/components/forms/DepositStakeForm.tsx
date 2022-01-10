import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { serialAsync } from "utils/async.utils";
import React, { useState } from "react";
import { useRefresh } from "react/hooks/useRefresh";
import "../../../styles/depositstakeform.scss";
import { useNotify } from "../../hooks/useNotify";
import { depositInvestment } from "client/api";
import { Big } from "big.js";
import { formatUIAmount, toProgramAmount, toUIAmount } from "utils/format.utils";
import { useIntl } from "react-intl";

export const DepositStakeForm = () => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [stake, setStake] = useState<Big | undefined>();
	const notify = useNotify();
	const triggerRefresh = useRefresh();

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!stake) {
			return;
		}

		try {
			await depositInvestment(stake, connection.connection, wallet as Wallet);
			notify(
				"success",
				`Successful deposit of ${formatUIAmount(stake, Big.roundDown, intl.formatNumber)} USDC`
			);
			triggerRefresh();
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
		} finally {
			setStake(undefined);
		}
	});

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		const newStake = newValue === undefined ? newValue : toProgramAmount(new Big(newValue));
		setStake(newStake);
	};

	const canSubmit = () => !(wallet?.publicKey && stake && !stake.eq(0));

	return (
		<form onSubmit={onSubmit} className="row">
			<label className="stake-input-label">
				<input
					value={stake === undefined ? "" : toUIAmount(stake).toNumber()}
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
