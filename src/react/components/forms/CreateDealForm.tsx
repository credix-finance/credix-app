import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { serialAsync } from "utils/async.utils";
import React, { useEffect, useState } from "react";
import { useNotify } from "react/hooks/useNotify";
import { activateDeal, createDeal, getUserUSDCTokenAccount } from "store/api";
import "../../../styles/stakeform.scss";
import { PublicKey } from "@solana/web3.js";
import { useRefresh } from "react/hooks/useRefresh";

export const CreateDealForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [principal, setPrincipal] = useState<number | undefined>();
	const [financingFee, setFinancingFee] = useState<number | undefined>();
	const [timeToMaturity, setTimeToMaturity] = useState<number | undefined>();
	const [borrower, setBorrower] = useState<string>("");
	const [placeholder, setPlaceholder] = useState<string>("Connect wallet");
	const notify = useNotify();
	const triggerRefresh = useRefresh();

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			setPlaceholder("0");
			setBorrower(wallet?.publicKey.toString());
		} else {
			setPlaceholder("Connect wallet");
		}
	}, [connection.connection, wallet?.publicKey]);

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!borrower) {
			notify("error", "Need borrower to submit");
			return;
		}

		if (!principal || !financingFee) {
			notify("error", "Need principal and financing fee to submit");
			return;
		}

		if (!timeToMaturity) {
			notify("error", "Need time to maturity to submit");
			return;
		}

		if (timeToMaturity % 30) {
			notify("error", "Time to maturity needs to be a multiple of 30");
			return;
		}

		const depositorLiquidityPoolTokenAccount = await getUserUSDCTokenAccount(
			connection.connection,
			wallet as Wallet
		);

		// Can't we just create a token account using the associated token program when it doesn't exist yet?
		if (!depositorLiquidityPoolTokenAccount) {
			notify("error", "Please opt in for USDC in your wallet");
			return;
		}

		try {
			await createDeal(
				principal,
				financingFee,
				timeToMaturity,
				new PublicKey(borrower),
				connection.connection,
				wallet as Wallet
			);
			notify("success", "Deal created successfully");

			await activateDeal(connection.connection, wallet as Wallet);
			notify("success", "Deal activated successfully");
			triggerRefresh();
		} catch (err: any) {
			notify("error", `Transaction failed! ${err?.message}`);
		}
	});

	const canSubmit = () => {
		let validKey = false;

		try {
			new PublicKey(borrower);
			validKey = true;
		} catch (e) {
			validKey = false; // can't have an empty block..
		}

		return wallet?.publicKey && principal && financingFee && borrower && validKey;
	};

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

	const onChangeBorrower = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBorrower(e.target.value);
	};

	const onChangeTimeToMaturity = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setTimeToMaturity);
	};

	const onBlurTimeToMaturity = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (timeToMaturity) {
			setTimeToMaturity(Math.ceil(timeToMaturity/30)*30);
		}
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
						value={borrower}
						placeholder={placeholder}
						onChange={onChangeBorrower}
						disabled={!wallet?.publicKey}
						className="stake-input borrower-pk credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
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
					Financing fee
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
				<label className="stake-input-label">
					Time to maturity (days)
					<input
						name="timeToMaturity"
						type="number"
						step={30}
						value={timeToMaturity === undefined ? "" : timeToMaturity}
						placeholder={placeholder}
						onChange={onChangeTimeToMaturity}
						onBlur={onBlurTimeToMaturity}
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
