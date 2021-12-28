import { Table, TableHead, TableBody, TableCell, TableRow, TableContainer } from "@mui/material";
import { BN, Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useState } from "react";
import { getClusterTime, getDealAccounts } from "client/api";
import { Deal } from "types/program.types";
import { useNavigate } from "react-router-dom";
import { Path } from "types/navigation.types";
import "../../styles/dealstable.scss";
import { formatDealStatus, toUIAmount, toUIPercentage } from "utils/format.utils";
import { getDaysRemaining, mapDealToStatus } from "utils/deal.utils";
import millify from "millify";
import { PublicKey } from "@solana/web3.js";

interface Props {
	borrower?: PublicKey;
}

export const DealsTable = (props: Props) => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [deals, setDeals] = useState<any>([]);
	const [clusterTime, setClusterTime] = useState<number | null>(null);
	const navigate = useNavigate();

	const getDeals = useCallback(async () => {
		const _deals = getDealAccounts(connection.connection, wallet as Wallet, props.borrower);
		const _clusterTime = getClusterTime(connection.connection);

		const [deals, clusterTime] = await Promise.all([_deals, _clusterTime]);

		setDeals(deals);
		setClusterTime(clusterTime);
	}, [connection.connection, wallet, props.borrower]);

	useEffect(() => {
		if (wallet) {
			getDeals();
		}
	}, [wallet, getDeals]);

	const tableRow = (deal: Deal, key: any) => {
		const createdAt = new Date(deal.createdAt.mul(new BN(1000)).toNumber());
		const goLiveAt =
			deal.goLiveAt.bitLength() < 53
				? new Date(deal.goLiveAt.mul(new BN(1000)).toNumber())
				: undefined;

		const dealStatus = clusterTime && mapDealToStatus(deal, clusterTime);
		const daysRemaining =
			dealStatus && clusterTime && getDaysRemaining(deal, clusterTime, dealStatus);

		const targetRoute = Path.DEALS_DETAIL.replace(":borrower", deal.borrower.toString()).replace(
			":deal",
			(deal.dealNumber + 1).toString()
		);

		return (
			<TableRow key={key} hover onClick={() => navigate(targetRoute)}>
				<TableCell>{deal.name}</TableCell>
				<TableCell>{createdAt.toUTCString()}</TableCell>
				<TableCell>{(goLiveAt && goLiveAt.toUTCString()) || "-"}</TableCell>
				<TableCell>{millify(toUIAmount(deal.principal.toNumber()))}</TableCell>
				<TableCell>{toUIPercentage(deal.financingFeePercentage)}%</TableCell>
				<TableCell>{millify(toUIAmount(deal.principalAmountRepaid.toNumber()))}</TableCell>
				<TableCell>{millify(toUIAmount(deal.interestAmountRepaid.toNumber()))}</TableCell>
				<TableCell>{`${daysRemaining} / ${deal.timeToMaturityDays}`}</TableCell>
				<TableCell>{`${dealStatus !== null && formatDealStatus(dealStatus)}`}</TableCell>
			</TableRow>
		);
	};

	return (
		<div style={{ border: "1px solid black", maxWidth: "90vw" }}>
			<TableContainer>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Deal Name</TableCell>
							<TableCell>Created at</TableCell>
							<TableCell>Go live at</TableCell>
							<TableCell>Principal</TableCell>
							<TableCell>Financing fee</TableCell>
							<TableCell>Principal repaid</TableCell>
							<TableCell>Interest repaid</TableCell>
							<TableCell>Days remaining</TableCell>
							<TableCell>Status</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>{deals.map((deal: any) => tableRow(deal.account, deal.publicKey))}</TableBody>
				</Table>
			</TableContainer>
		</div>
	);
};
