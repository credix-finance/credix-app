import { MenuItem } from "@material-ui/core";
import { Select } from "@mui/material";
import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getClusterTime, repayDeal, getDealAccountData } from "client/api";
import { FEES } from "consts";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useNotify } from "react/hooks/useNotify";
import { useRefresh } from "react/hooks/useRefresh";
import { Path } from "types/navigation.types";
import { Deal, DealStatus } from "types/program.types";
import {
	createInterestRepaymentType,
	createPrincipalRepaymentType,
	getInterestToRepay,
	getPrincipalToRepay,
	mapDealToStatus,
	getDaysRemaining,
} from "utils/deal.utils";
import { toUIAmount, toUIPercentage, toProgramAmount } from "utils/format.utils";
import "../../styles/stakeform.scss";
import "../../styles/deals.scss";
import { PublicKey } from "@solana/web3.js";

export const DealOverview = () => {
	const wallet = useAnchorWallet();
	const [placeholder, setPlaceholder] = useState<string>("CONNECT WALLET");
	const connection = useConnection();
	const [deal, setDeal] = useState<Deal | undefined>();
	const [dealStatus, setDealStatus] = useState<DealStatus | undefined>();
	const [amountToRepay, setAmountToRepay] = useState<number | undefined>();
	const [repaymentAmount, setRepaymentAmount] = useState<number | undefined>();
	const [daysRemaining, setDaysRemaining] = useState<number | string>("X");
	const [repaymentSelectValue, setRepaymentSelectValue] = useState<string>("interest");
	const [dealNumber, setDealNumber] = useState<number>(0);
	const [borrower, setBorrower] = useState<PublicKey | undefined>();
	const notify = useNotify();
	const params = useParams();
	const navigate = useNavigate();

	const fetchDealData = useCallback(async () => {
		if (!borrower) {
			return;
		}

		const _clusterTime = getClusterTime(connection.connection);
		const _dealData = getDealAccountData(
			connection.connection,
			wallet as Wallet,
			borrower,
			dealNumber
		);

		const [clusterTime, deal] = await Promise.all([_clusterTime, _dealData]);

		if (!deal) {
			return;
		}

		setDeal(deal);

		if (!clusterTime) {
			// TODO: DO SOMETHING
			throw Error("Could not fetch cluster time");
		}

		const dealStatus = mapDealToStatus(deal, clusterTime);
		setDealStatus(dealStatus);

		const daysRemaining = getDaysRemaining(deal, clusterTime, dealStatus);
		setDaysRemaining(daysRemaining);
	}, [connection.connection, wallet, borrower, dealNumber]);

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

	const calculateAmountToRepay = useCallback(() => {
		if (!deal) {
			return;
		}
		switch (repaymentSelectValue) {
			case "interest": {
				setAmountToRepay(getInterestToRepay(deal));
				break;
			}
			default:
				setAmountToRepay(getPrincipalToRepay(deal));
		}
	}, [repaymentSelectValue, deal]);

	useEffect(() => {
		const dealNumber = params.deal && parseInt(params.deal) - 1;

		if ((!dealNumber && dealNumber !== 0) || dealNumber < 0) {
			navigate(Path.NOT_FOUND);
			return;
		}

		setDealNumber(dealNumber);
	}, [params.deal, wallet, connection.connection, navigate]);

	useEffect(() => {
		try {
			setBorrower(new PublicKey(params.borrower || ""));
		} catch (e) {
			navigate(Path.NOT_FOUND);
		}
	}, [params.borrower, navigate]);

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			fetchDealData();
		}
	}, [wallet, connection.connection, fetchDealData]);

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			setPlaceholder("0");
		} else {
			setPlaceholder("Connect wallet");
		}
	}, [connection.connection, wallet?.publicKey]);

	useEffect(() => {
		calculateAmountToRepay();
	}, [calculateAmountToRepay]);

	useEffect(() => {
		determineRepaymentType();
	}, [determineRepaymentType]);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!repaymentAmount || !amountToRepay) {
			return;
		}

		try {
			calculateAmountToRepay();
			const repaymentTypeObj =
				repaymentSelectValue === "interest"
					? createInterestRepaymentType()
					: createPrincipalRepaymentType();
			await repayDeal(
				repaymentAmount,
				repaymentTypeObj,
				dealNumber,
				connection.connection,
				wallet as Wallet
			);
			const showFeeNotification = repaymentSelectValue === "interest";
			const paymentNotification = `Successfully repaid ${toUIAmount(
				Math.min(repaymentAmount, amountToRepay)
			)} USDC`;
			const feeNotification = ` with a ${toUIAmount(
				Math.min(repaymentAmount, amountToRepay) * FEES.INTEREST_PAYMENT
			)} USDC fee`;
			notify("success", `${paymentNotification}${showFeeNotification ? feeNotification : ""}`);
			setRepaymentAmount(undefined);
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
			setRepaymentAmount(undefined);
		}
	};

	const onChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		setter: (val: number | undefined) => any
	) => {
		const newValue = e.target.value === "" ? undefined : toProgramAmount(Number(e.target.value));
		setter(newValue);
	};

	const onChangeRepaymentAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setRepaymentAmount);
	};

	return (
		<div>
			<h2>
				{deal?.name}, [{daysRemaining} / {deal?.timeToMaturityDays}] days remaining
			</h2>
			<form onSubmit={onSubmit} className="row stake-form-column deal-info-repayment">
				<div className="deal-info">
					<label className="stake-input-label">
						Borrower Public Key
						<input
							name="borrowerPublicKey"
							type="text"
							readOnly={true}
							disabled={true}
							value={deal?.borrower.toString() || ""}
							placeholder={placeholder}
							className="deal-input stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						/>
					</label>
					<br />
					<label className="stake-input-label">
						Principal
						<p>The total amount of USDC borrowed</p>
						<input
							name="principal"
							type="number"
							readOnly={true}
							placeholder={placeholder}
							disabled={true}
							value={(deal?.principal && toUIAmount(deal.principal.toNumber())) || ""}
							className="deal-input stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						/>
					</label>
					<br />
					<label className="stake-input-label">
						Financing Fee %
						<p>The percentage on top of the principal that needs to be repaid as interest (APR)</p>
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
							className="deal-input stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						/>
					</label>
				</div>
				<div className="deal-repayment">
					<label className="stake-input-label">
						Select repayment type
						<br />
						<Select
							disabled={!wallet?.publicKey}
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
						<p>To repay: {amountToRepay === undefined ? "" : toUIAmount(amountToRepay)} USDC</p>
						<input
							disabled={!wallet?.publicKey}
							name="repayment"
							type="number"
							placeholder={placeholder}
							onChange={onChangeRepaymentAmount}
							value={repaymentAmount === undefined ? "" : toUIAmount(repaymentAmount)}
							className="deal-input stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						/>
					</label>
					<br />
					<input
						type="submit"
						disabled={!canSubmit()}
						value={getButtonText()}
						className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</div>
			</form>
		</div>
	);
};
