import { MenuItem } from "@material-ui/core";
import { Select } from "@mui/material";
import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import {
	getClusterTime,
	repayDeal,
	getDealAccountData,
	getInterestFeePercentage,
} from "client/api";
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
	getTotalInterest
} from "utils/deal.utils";
import "../../styles/stakeform.scss";
import "../../styles/deals.scss";
import { PublicKey } from "@solana/web3.js";
import { Big } from "big.js";
import { getFee, min, ZERO } from "utils/math.utils";
import { formatRatio, formatUIAmount, toProgramAmount, toUIAmount } from "utils/format.utils";
import { useIntl } from "react-intl";
import { useMarketSeed } from "react/hooks/useMarketSeed";
import { navigationHelper } from "utils/navigation.utils";
import { useSnackbar } from "notistack";

export const DealOverview = () => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [deal, setDeal] = useState<Deal | undefined>();
	const [dealStatus, setDealStatus] = useState<DealStatus | undefined>();
	const [amountToRepay, setAmountToRepay] = useState<Big | undefined>();
	const [totalAmountToRepay, setTotalAmountToRepay] = useState<Big | undefined>();
	const [repaymentAmount, setRepaymentAmount] = useState<Big | undefined>();
	const [daysRemaining, setDaysRemaining] = useState<number | string>("X");
	const [repaymentSelectValue, setRepaymentSelectValue] = useState<string>("interest");
	const [dealNumber, setDealNumber] = useState<number>(0);
	const [borrower, setBorrower] = useState<PublicKey | undefined>();
	const notify = useNotify();
	const { closeSnackbar } = useSnackbar();
	const params = useParams();
	const navigate = useNavigate();
	const marketSeed = useMarketSeed();

	const fetchDealData = useCallback(async () => {
		if (!borrower) {
			return;
		}

		const _clusterTime = getClusterTime(connection.connection);
		const _dealData = getDealAccountData(
			connection.connection,
			wallet as Wallet,
			borrower,
			dealNumber,
			marketSeed
		);

		const [clusterTime, deal] = await Promise.all([_clusterTime, _dealData]);

		if (!deal) {
			return;
		}

		setDeal(deal);

		const dealStatus = mapDealToStatus(deal, clusterTime);
		setDealStatus(dealStatus);

		const daysRemaining = getDaysRemaining(deal, clusterTime, dealStatus);
		setDaysRemaining(daysRemaining);
	}, [connection.connection, wallet, borrower, dealNumber, marketSeed]);

	const triggerRefresh = useRefresh(fetchDealData);

	const determineRepaymentType = useCallback(() => {
		if (!deal) {
			return;
		}

		const interestToRepay = getInterestToRepay(deal);

		setRepaymentSelectValue(
			repaymentSelectValue === "interest" && !interestToRepay.eq(ZERO) ? "interest" : "principal"
		);
	}, [deal, repaymentSelectValue]);

	const calculateAmountToRepay = useCallback(() => {
		if (!deal) {
			return;
		}
		switch (repaymentSelectValue) {
			case "interest": {
				setAmountToRepay(getInterestToRepay(deal));
				setTotalAmountToRepay(getTotalInterest(deal));
				break;
			}
			default:
				setAmountToRepay(getPrincipalToRepay(deal));
				setTotalAmountToRepay(new Big(deal.principal.toNumber()));
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
		if (!wallet) {
			return;
		}

		try {
			const borrowerKey = new PublicKey(params.borrower || "");
			if (!borrowerKey.equals(wallet.publicKey)) {
				navigationHelper(navigate, Path.DEALS, marketSeed);
				return;
			}
			setBorrower(borrowerKey);
		} catch (e) {
			navigate(Path.NOT_FOUND);
		}
	}, [params.borrower, navigate, wallet, marketSeed]);

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			fetchDealData();
		}
	}, [wallet, connection.connection, fetchDealData]);

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

		let snackbarKey;
		try {
			calculateAmountToRepay();
			const repaymentTypeObj =
				repaymentSelectValue === "interest"
					? createInterestRepaymentType()
					: createPrincipalRepaymentType();

			const txPromise = repayDeal(
				repaymentAmount,
				repaymentTypeObj,
				dealNumber,
				connection.connection,
				wallet as Wallet,
				marketSeed
			);
			const showFeeNotification = repaymentSelectValue === "interest";

			const repaidAmount = min(repaymentAmount, amountToRepay);
			const paymentNotification = `${formatUIAmount(
				repaidAmount,
				Big.roundUp,
				intl.formatNumber
			)} USDC`;

			const interestFeePercentage = await getInterestFeePercentage(
				connection.connection,
				wallet as Wallet,
				marketSeed
			);

			const fee = getFee(repaidAmount, interestFeePercentage);
			const feeNotification = ` with a ${formatUIAmount(
				fee,
				Big.roundDown,
				intl.formatNumber
			)} USDC fee`;

			snackbarKey = notify(
				"info",
				`Repayment of ${paymentNotification}${
					showFeeNotification ? feeNotification : ""
				} is being processed`,
				undefined,
				true
			);
			const tx = await txPromise;
			notify(
				"success",
				`Successfully repaid ${paymentNotification}${showFeeNotification ? feeNotification : ""}`,
				tx
			);
			closeSnackbar(snackbarKey);
			setRepaymentAmount(undefined);
			triggerRefresh();
		} catch (e: any) {
			notify("error", `Transaction failed! ${e?.message}`);
			closeSnackbar(snackbarKey);
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

	const onChangeRepaymentAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		const newRepaymentAmount =
			newValue === undefined ? newValue : toProgramAmount(new Big(newValue));
		setRepaymentAmount(newRepaymentAmount);
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
							className="deal-input stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						/>
					</label>
					<br />
					<label className="stake-input-label">
						Principal
						<p>The total amount of USDC borrowed</p>
						<input
							name="principal"
							readOnly={true}
							disabled={true}
							value={
								(deal?.principal &&
									formatUIAmount(
										new Big(deal.principal.toNumber()),
										Big.roundUp,
										intl.formatNumber
									)) ||
								""
							}
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
							disabled={true}
							value={
								deal?.financingFeePercentage === undefined
									? ""
									: formatRatio(deal.financingFeePercentage).toNumber()
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
							<MenuItem
								value="principal"
								disabled={!deal || !getPrincipalToRepay(deal) || !!getInterestToRepay(deal)}
							>
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
						<p>
							{`Repaid: ${(amountToRepay === undefined || totalAmountToRepay === undefined) ? "" : formatUIAmount(totalAmountToRepay?.sub(amountToRepay), Big.roundUp, intl.formatNumber)}
							/ ${totalAmountToRepay === undefined ? "" : formatUIAmount(totalAmountToRepay, Big.roundUp, intl.formatNumber)} USDC`}
						</p>
						{repaymentSelectValue === "interest" ?
							<p>
								{`Monthly repayment: ${
									(deal?.principal &&
										formatUIAmount(
											new Big(getTotalInterest(deal).toNumber()/(deal.timeToMaturityDays/30)),
											Big.roundUp,
											intl.formatNumber
										))
								} USDC`}
							</p> : <p></p>
						}
						<input
							disabled={!wallet?.publicKey}
							name="repayment"
							type="number"
							onChange={onChangeRepaymentAmount}
							value={repaymentAmount === undefined ? "" : toUIAmount(repaymentAmount).toNumber()}
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
