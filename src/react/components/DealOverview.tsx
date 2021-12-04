import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useState } from "react";
import { useNotify } from "react/hooks/useNotify";
import { useRefresh } from "react/hooks/useRefresh";
import { getClusterTime, getDealAccountData, repayDeal } from "store/api";
import { Deal, DealStatus, RepaymentType } from "types/program.types";
import {
	createInterestRepaymentType,
	createPrincipalRepaymentType,
	mapDealToStatus,
} from "utils/deal.utils";
import { formatNumber } from "utils/format.utils";
import { round } from "utils/math.utils";
import "../../styles/stakeform.scss";
import { Select } from "@mui/material";
import { MenuItem } from "@material-ui/core";

// TODO: store deal in state instead of every property separately
export const DealOverview = () => {
	const wallet = useAnchorWallet();
	const [placeholder, setPlaceholder] = useState<string>("Connect wallet");
	const connection = useConnection();
	const [financingFee, setFinancingFee] = useState<number | undefined>();
	const [principal, setPrincipal] = useState<number | undefined>();
	const [dealStatus, setDealStatus] = useState<DealStatus | undefined>();
	const [timeToMaturity, setTimeToMaturity] = useState<number | undefined>();
	const [repaymentAmount, setRepaymentAmount] = useState<number | undefined>();
	const [repaymentAmountFee, setRepaymentAmountFee] = useState<number | undefined>();
	const [repaymentType, setRepaymentType] = useState<RepaymentType>(createInterestRepaymentType());
	const [repaymentSelectValue, setRepaymentSelectValue] = useState<string>("interest");
	const notify = useNotify();
	const triggerRefresh = useRefresh();

	const fetchDealData = useCallback(async () => {
		const _clusterTime = getClusterTime(connection.connection);
		const _dealData = getDealAccountData(connection.connection, wallet as Wallet) as Promise<Deal>;

		const [clusterTime, deal] = await Promise.all([_clusterTime, _dealData]);

		const principal = formatNumber(deal.principal.toNumber());

		setPrincipal(principal);
		setFinancingFee(deal.financingFeePercentage);
		setTimeToMaturity(deal.timeToMaturityDays);

		if (!clusterTime) {
			// TODO: DO SOMETHING
			throw Error("Could not fetch cluster time");
		}

		const dealStatus = mapDealToStatus(deal, clusterTime);
		setDealStatus(dealStatus);
	}, [connection.connection, wallet]);

	// (principal * financing_fee) / time_to_maturity_days / 30
	const calculateInterest = useCallback(() => {
		if (!principal || !financingFee || !timeToMaturity) {
			return 0;
		}

		return round((principal * (financingFee / 100)) / (timeToMaturity / 30));
	}, [principal, financingFee, timeToMaturity]);

	const calculateRepaymentAmount = useCallback(() => {
		switch (repaymentSelectValue) {
			case "interest": {
				const interest = calculateInterest();
				const repayAmountFee = interest * 0.10; // 10 percent fee
				setRepaymentAmount(interest);
				setRepaymentAmountFee(repayAmountFee);
				break;
			}
			default:
				setRepaymentAmount(principal);
				setRepaymentAmountFee(0);
		}
	}, [principal, repaymentSelectValue, calculateInterest]);

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			setPlaceholder("0");
		} else {
			setPlaceholder("Connect wallet");
		}

		if (wallet?.publicKey && connection.connection) {
			fetchDealData();
		}
	}, [connection.connection, wallet?.publicKey, fetchDealData]);

	useEffect(() => {
		calculateRepaymentAmount();
	}, [calculateRepaymentAmount]);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!repaymentAmount) {
			return;
		}

		try {
			await repayDeal(repaymentAmount, repaymentType, connection.connection, wallet as Wallet);
			if (repaymentAmountFee === 0) {
				notify("success", `Successfully repaid ${repaymentAmount} USDC with a ${repaymentAmountFee} fee`);
			} else {
				notify("success", `Successfully repaid ${repaymentAmount} USDC`);
			}
			triggerRefresh();
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
		}
	};

	const canSubmit = () => wallet?.publicKey && dealStatus !== DealStatus.CLOSED;

	const getButtonText = () => (dealStatus === DealStatus.CLOSED ? "Deal repaid" : "Make repayment");

	const onRepaymentTypeChange = (e: any) => {
		if (repaymentSelectValue !== e.target.value) {
			switch (e.target.value) {
				case "interest":
					setRepaymentType(createInterestRepaymentType());
					break;
				default:
					setRepaymentType(createPrincipalRepaymentType());
			}
			setRepaymentSelectValue(e.target.value);
		}
	};

	return (
		<div>
			<h2>Your deal</h2>
			<form onSubmit={onSubmit} className="row stake-form-column">
				<label className="stake-input-label">
					Borrower Public Key
					<input
						name="borrowerPublicKey"
						type="text"
						readOnly={true}
						disabled={true}
						value={wallet?.publicKey.toString()}
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
						readOnly={true}
						placeholder={placeholder}
						disabled={true}
						value={(principal && Math.round(principal)) || ""}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Financing Fee
					<input
						name="financingFee"
						type="number"
						readOnly={true}
						placeholder={placeholder}
						disabled={true}
						value={financingFee === undefined ? "" : financingFee}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Select repayment type
					<Select
						onChange={onRepaymentTypeChange}
						value={repaymentSelectValue}
						className="repayment-select credix-button MuiButton-root"
					>
						<MenuItem value="principal">Principal</MenuItem>
						<MenuItem value="interest">Interest</MenuItem>
					</Select>
				</label>
				<br />
				<label className="stake-input-label">
					USDC amount
					<input
						name="repayment"
						type="number"
						disabled={!canSubmit()}
						readOnly={true}
						placeholder={placeholder}
						value={repaymentAmount === undefined ? "" : repaymentAmount}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<input
					type="submit"
					disabled={!canSubmit()}
					value={getButtonText()}
					className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</form>
		</div>
	);
};
