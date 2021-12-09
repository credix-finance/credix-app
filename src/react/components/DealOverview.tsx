import { MenuItem } from "@material-ui/core";
import { Select } from "@mui/material";
import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { FEES } from "consts";
import React, { useCallback, useEffect, useState } from "react";
import { useNotify } from "react/hooks/useNotify";
import { useRefresh } from "react/hooks/useRefresh";
import { getClusterTime, getDealAccountData, repayDeal } from "store/api";
import { Deal, DealStatus } from "types/program.types";
import {
	createInterestRepaymentType,
	createPrincipalRepaymentType,
	getInterestToRepay,
	getPrincipalToRepay,
	mapDealToStatus,
} from "utils/deal.utils";
import { toUIAmount, toUIPercentage } from "utils/format.utils";
import "../../styles/stakeform.scss";

export const DealOverview = () => {
	const wallet = useAnchorWallet();
	const [placeholder, setPlaceholder] = useState<string>("Connect wallet");
	const connection = useConnection();
	const [deal, setDeal] = useState<Deal | undefined>();
	const [dealStatus, setDealStatus] = useState<DealStatus | undefined>();
	const [repaymentAmount, setRepaymentAmount] = useState<number | undefined>();
	const [repaymentSelectValue, setRepaymentSelectValue] = useState<string>("interest");
	const notify = useNotify();

	const fetchDealData = useCallback(async () => {
		const _clusterTime = getClusterTime(connection.connection);
		const _dealData = getDealAccountData(connection.connection, wallet as Wallet) as Promise<Deal>;

		const [clusterTime, deal] = await Promise.all([_clusterTime, _dealData]);

		setDeal(deal);

		if (!clusterTime) {
			// TODO: DO SOMETHING
			throw Error("Could not fetch cluster time");
		}

		const dealStatus = mapDealToStatus(deal, clusterTime);
		setDealStatus(dealStatus);
	}, [connection.connection, wallet]);

	const triggerRefresh = useRefresh(fetchDealData);

	const determineRepaymentType = useCallback(() => {
		if (!deal) {
			return;
		}

		const interestToRepay = getInterestToRepay(deal);

		setRepaymentSelectValue(
			repaymentSelectValue === "interest" && interestToRepay ? "interest" : "principal"
		);
	}, [deal, repaymentSelectValue]);

	const calculateRepaymentAmount = useCallback(() => {
		if (!deal) {
			setRepaymentAmount(0);
			return;
		}

		switch (repaymentSelectValue) {
			case "interest": {
				setRepaymentAmount(getInterestToRepay(deal));
				break;
			}
			default:
				setRepaymentAmount(getPrincipalToRepay(deal));
		}
	}, [repaymentSelectValue, deal]);

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

	useEffect(() => {
		determineRepaymentType();
	}, [determineRepaymentType]);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!repaymentAmount) {
			return;
		}

		try {
			const repaymentTypeObj =
				repaymentSelectValue === "interest"
					? createInterestRepaymentType()
					: createPrincipalRepaymentType();
			await repayDeal(repaymentAmount, repaymentTypeObj, connection.connection, wallet as Wallet);
			const showFeeNotification = repaymentSelectValue === "interest";
			const paymentNotification = `Successfully repaid ${toUIAmount(repaymentAmount)} USDC`;
			const feeNotification = ` with a ${toUIAmount(
				repaymentAmount * FEES.INTEREST_PAYMENT
			)} USDC fee`;
			notify("success", `${paymentNotification}${showFeeNotification ? feeNotification : ""}`);
			triggerRefresh();
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
		}
	};

	const canSubmit = () =>
		wallet?.publicKey && dealStatus === DealStatus.IN_PROGRESS && repaymentAmount;

	const getButtonText = () => (dealStatus === DealStatus.CLOSED ? "Deal repaid" : "Make repayment");

	const onRepaymentTypeChange = (e: any) => {
		if (repaymentSelectValue !== e.target.value) {
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
						value={(deal?.principal && toUIAmount(deal.principal.toNumber())) || ""}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Financing Fee %
					<input
						name="financingFee"
						type="number"
						readOnly={true}
						placeholder={placeholder}
						disabled={true}
						value={
							deal?.financingFeePercentage === undefined
								? ""
								: toUIPercentage(deal.financingFeePercentage)
						}
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
						<MenuItem value="principal" disabled={!deal || !getPrincipalToRepay(deal)}>
							Principal
						</MenuItem>
						<MenuItem value="interest" disabled={!deal || !getInterestToRepay(deal)}>
							Interest
						</MenuItem>
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
						value={repaymentAmount === undefined ? "" : toUIAmount(repaymentAmount)}
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
