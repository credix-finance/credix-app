import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { serialAsync } from "utils/async.utils";
import React, { useEffect, useState } from "react";
import { useNotify } from "react/hooks/useNotify";
import { activateDeal, createDeal, getLiquidityPoolBalance } from "store/api";
import { toUIAmount } from "utils/format.utils";
import "../../../styles/stakeform.scss";
import { PublicKey } from "@solana/web3.js";
import { useRefresh } from "react/hooks/useRefresh";

interface Props {
	disabled?: boolean;
}

export const CreateDealForm = (props: Props) => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [principal, setPrincipal] = useState<number | undefined>();
	const [liquidityPoolBalance, setLiquidityPoolBalance] = useState<number>(0);
	const [financingFee, setFinancingFee] = useState<number | undefined>();
	const [timeToMaturity, setTimeToMaturity] = useState<number | undefined>();
	const [borrower, setBorrower] = useState<string>("");
	const [placeholder, setPlaceholder] = useState<string>("CONNECT WALLET");
	const notify = useNotify();
	const triggerRefresh = useRefresh();

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			setPlaceholder("0");
			setBorrower(wallet?.publicKey.toString());
			updateLiquidityPoolBalance();
		} else {
			setPlaceholder("Connect wallet");
		}
	}, [connection.connection, wallet?.publicKey]);

	const updateLiquidityPoolBalance = async () => {
		const balance = await getLiquidityPoolBalance(connection.connection, wallet as Wallet);
		setLiquidityPoolBalance(toUIAmount(balance));
	};

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

			await activateDeal(
				new PublicKey(borrower),
				connection.connection,
				wallet as Wallet);
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

		return (
			wallet?.publicKey &&
			principal &&
			financingFee &&
			borrower &&
			validKey &&
			!props.disabled &&
			timeToMaturity &&
			!(timeToMaturity % 30)
		);
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

	const onBlurPrincipal = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (principal && principal > liquidityPoolBalance) {
			setPrincipal(liquidityPoolBalance);
		}
	};

	const onBlurTimeToMaturity = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (timeToMaturity) {
			setTimeToMaturity(Math.ceil(timeToMaturity / 30) * 30);
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
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input borrower-pk credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Principal
					<p>The total amount of USDC to borrow, borrow limit: {liquidityPoolBalance} USDC</p>
					<input
						name="principal"
						type="number"
						value={principal === undefined ? "" : principal}
						placeholder={placeholder}
						onChange={onChangePrincipal}
						onBlur={onBlurPrincipal}
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Financing fee %
					<p>The percentage on top of the principal that needs to be repaid as interest</p>
					<input
						name="financingFee"
						type="number"
						value={financingFee === undefined ? "" : financingFee}
						placeholder={placeholder}
						onChange={onChangeFinancingFee}
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Time to maturity (days)
					<p>How many days before you have to pay back the principal</p>
					<input
						name="timeToMaturity"
						type="number"
						step={30}
						value={timeToMaturity === undefined ? "" : timeToMaturity}
						placeholder={placeholder}
						onChange={onChangeTimeToMaturity}
						onBlur={onBlurTimeToMaturity}
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<input
					type="submit"
					disabled={!canSubmit()}
					value={props.disabled ? "Max deals reached" : "Create Deal"}
					className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</form>
		</div>
	);
};
