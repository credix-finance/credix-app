import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useState } from "react";
import { useRefresh } from "react/hooks/useRefresh";
import "../../../styles/depositstakeform.scss";
import { useNotify } from "../../hooks/useNotify";
import { Big } from "big.js";
import { formatUIAmount, toProgramAmount, toUIAmount } from "utils/format.utils";
import { getFee, ZERO } from "utils/math.utils";
import { getLPTokenBaseBalance, getWithdrawFeePercentage, withdrawInvestment } from "client/api";
import { useIntl } from "react-intl";
import { useMarketSeed } from "react/hooks/useMarketSeed";
import { useSnackbar } from "notistack";

export const WithdrawStakeForm = () => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [withdrawAmount, setWithdrawAmount] = useState<Big | undefined>();
	const { closeSnackbar } = useSnackbar();
	const notify = useNotify();
	const triggerRefresh = useRefresh();
	const marketSeed = useMarketSeed();

	const setMaxAmount = async () => {
		if (wallet) {
			const stake = await getLPTokenBaseBalance(
				connection.connection,
				wallet as Wallet,
				marketSeed
			);
			setWithdrawAmount(stake.round(-1, Big.roundDown));
		}
	};

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!withdrawAmount || withdrawAmount.eq(ZERO)) {
			return;
		}

		const withdrawFeePercentage = await getWithdrawFeePercentage(
			connection.connection,
			wallet as Wallet,
			marketSeed
		);
		const withdrawFee = getFee(withdrawAmount, withdrawFeePercentage);
		let snackbarKey;

		try {
			const txPromise = withdrawInvestment(
				withdrawAmount,
				connection.connection,
				wallet as Wallet,
				marketSeed
			);
			snackbarKey = notify(
				"info",
				`Withdraw of ${formatUIAmount(
					withdrawAmount,
					Big.roundDown,
					intl.formatNumber
				)} USDC with a ${formatUIAmount(
					withdrawFee,
					Big.roundDown,
					intl.formatNumber
				)} USDC fee is being processed`,
				undefined,
				true
			);
			const tx = await txPromise;
			notify(
				"success",
				`Successful withdraw of ${formatUIAmount(
					withdrawAmount,
					Big.roundDown,
					intl.formatNumber
				)} USDC with a ${formatUIAmount(withdrawFee, Big.roundDown, intl.formatNumber)} USDC fee`,
				tx
			);
			closeSnackbar(snackbarKey);
			triggerRefresh();
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
			closeSnackbar(snackbarKey);
		} finally {
			setWithdrawAmount(undefined);
		}
	};

	const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		const newWithdrawAmount =
			newValue === undefined ? newValue : toProgramAmount(new Big(newValue));
		setWithdrawAmount(newWithdrawAmount);
	};

	const canSubmit = () => !(wallet?.publicKey && withdrawAmount);

	return (
		<div className="deposit-withdraw-row">
			<span className="max-button" onClick={setMaxAmount}>
				max
			</span>
			<form onSubmit={onSubmit} className="row">
				<label className="stake-input-label">
					<input
						placeholder={"1000"}
						value={withdrawAmount === undefined ? "" : toUIAmount(withdrawAmount).toNumber()}
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
		</div>
	);
};
