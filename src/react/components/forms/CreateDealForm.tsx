import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { serialAsync } from "async.utils";
import React, { useEffect, useState } from "react";
import { useNotify } from "react/hooks/useNotify";
import { activateDeal, createDeal, getDepositorLPTokenAccount } from "store/api";
import "../../../styles/stakeform.scss";

export const CreateDealForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [principal, setPrincipal] = useState<number | undefined>();
	const [financingFee, setFinancingFee] = useState<number | undefined>();
	const [placeholder, setPlaceholder] = useState<string>("Connect wallet");
	const notify = useNotify();

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			setPlaceholder("0");
		} else {
			setPlaceholder("Connect wallet");
		}
	}, [connection.connection, wallet?.publicKey]);

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!principal || !financingFee) {
			console.error("Need principal and financing fee to submit");
			return;
		}

		const depositorLPTokenAccount = await getDepositorLPTokenAccount(
			connection.connection,
			wallet as Wallet
		);

		// Can't we just create a token account using the associated token program when it doesn't exist yet?
		if (!depositorLPTokenAccount) {
			notify("error", "Please opt in for USDC in your wallet");
			return;
		}

		try {
			await createDeal(principal, financingFee, connection.connection, wallet as Wallet);
			notify("success", "Deal created successfully");

			await activateDeal(connection.connection, wallet as Wallet);
			notify("success", "Deal activated successfully");
		} catch (err: any) {
			notify("error", `Transaction failed! ${err?.message}`);
		}
	});

	const canSubmit = () => wallet?.publicKey && principal && financingFee;

	const onChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		setter: (val: number | undefined) => any
	) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		setter(newValue);
	};

	const onChangePrincipal = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setPrincipal);
	};

	const onChangeFinancingFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setFinancingFee);
	};

	return (
		<div>
			<h2>New Deal</h2>
			<form onSubmit={onSubmit} className="row stake-form-column">
				<label className="stake-input-label">
					Borrower Public Key
					<input
						name="borrowerPublicKey"
						type="text"
						readOnly={true}
						disabled={true}
						value={wallet?.publicKey.toString() || ""}
						placeholder={placeholder}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Principal
					<input
						name="principal"
						type="number"
						value={principal === undefined ? "" : principal}
						placeholder={placeholder}
						onChange={onChangePrincipal}
						disabled={!wallet?.publicKey}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Financing Fee
					<input
						name="financingFee"
						type="number"
						value={financingFee === undefined ? "" : financingFee}
						placeholder={placeholder}
						onChange={onChangeFinancingFee}
						disabled={!wallet?.publicKey}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<input
					type="submit"
					disabled={!canSubmit()}
					value="Create Deal"
					className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</form>
		</div>
	);
};
