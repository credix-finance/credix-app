import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useState } from "react";
import { getClusterTime, getDealAccountData } from "store/api";
import { Deal, DealStatus } from "types/program.types";
import { mapDealToStatus } from "utils/deal.utils";
import { formatNumber } from "utils/format.utils";
import "../../styles/stakeform.scss";

export const DealOverview = () => {
	const wallet = useAnchorWallet();
	const [placeholder, setPlaceholder] = useState<string>("Connect wallet");
	const connection = useConnection();
	const [financingFee, setFinancingFee] = useState<number | undefined>();
	const [principal, setPrincipal] = useState<number | undefined>();
	const [dealStatus, setDealStatus] = useState<DealStatus | undefined>();
	const [repaymentAmount, setRepaymentAmount] = useState<number | undefined>();

	const fetchDealData = useCallback(async () => {
		const _clusterTime = getClusterTime(connection.connection);
		const _dealData = getDealAccountData(connection.connection, wallet as Wallet) as Promise<Deal>;

		const [clusterTime, deal] = await Promise.all([_clusterTime, _dealData]);

		const principal = formatNumber(deal.principal);

		setPrincipal(principal);
		setFinancingFee(deal.financingFeePercentage);

		const repaymentAmount = principal * (1 + deal.financingFeePercentage / 100);
		setRepaymentAmount(repaymentAmount);

		if (!clusterTime) {
			// TODO: DO SOMETHING
			throw Error("Could not fetch cluster time");
		}

		const dealStatus = mapDealToStatus(deal, clusterTime);
		setDealStatus(dealStatus);
	}, [connection.connection, wallet]);

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

	const onSubmit = () => {};

	const canSubmit = () => wallet?.publicKey && dealStatus !== DealStatus.CLOSED;

	const getButtonText = () => (dealStatus === DealStatus.CLOSED ? "Deal repaid" : "Make repayment");

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
						value={principal && Math.round(principal)}
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
					(principal + interest)
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
