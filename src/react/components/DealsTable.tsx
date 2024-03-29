import { Table, TableHead, TableBody, TableCell, TableRow, TableContainer } from "@mui/material";
import { BN, Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useState } from "react";
import { getClusterTime, getDealAccounts } from "client/api";
import { Deal, DealStatus } from "types/program.types";
import { useNavigate } from "react-router-dom";
import { Path } from "types/navigation.types";
import "../../styles/dealstable.scss";
import { formatDealStatus, formatRatio, formatUIAmount } from "utils/format.utils";
import { getDaysRemaining, mapDealToStatus } from "utils/deal.utils";
import { PublicKey } from "@solana/web3.js";
import Big from "big.js";
import { useIntl } from "react-intl";
import { navigationHelper } from "utils/navigation.utils";
import { useMarketSeed } from "react/hooks/useMarketSeed";
import { CredixButton } from "./buttons/CredixButton";

interface Props {
	borrower?: PublicKey;
}

export const DealsTable = (props: Props) => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [deals, setDeals] = useState<any>([]);
	const [clusterTime, setClusterTime] = useState<number>(Date.now() * 1000);
	const navigate = useNavigate();
	const marketSeed = useMarketSeed();

	const getDeals = useCallback(async () => {
		const _deals = getDealAccounts(
			connection.connection,
			wallet as Wallet,
			marketSeed,
			props.borrower
		);
		const _clusterTime = getClusterTime(connection.connection);

		const [deals, clusterTime] = await Promise.all([_deals, _clusterTime]);

		setDeals(deals);
		setClusterTime(clusterTime);
	}, [connection.connection, wallet, props.borrower, marketSeed]);

	useEffect(() => {
		if (wallet) {
			getDeals();
		}
	}, [wallet, getDeals]);

	const formatBorrowerKey = (key: PublicKey) => {
		const keyString = key.toString();
		return `${keyString.slice(0, 4)}..${keyString.slice(-4)}`;
	};

	const tableRow = (deal: Deal, key: any) => {
		const createdAt = new Date(deal.createdAt.mul(new BN(1000)).toNumber());
		const goLiveAt =
			deal.goLiveAt.bitLength() < 53
				? new Date(deal.goLiveAt.mul(new BN(1000)).toNumber())
				: undefined;

		const dealStatus = mapDealToStatus(deal, clusterTime);
		const daysRemaining = getDaysRemaining(deal, clusterTime, dealStatus);

		const targetRoute = Path.DEALS_DETAIL.replace(":borrower", deal.borrower.toString()).replace(
			":deal",
			(deal.dealNumber + 1).toString()
		);

		const userDeal = wallet?.publicKey && deal.borrower.equals(wallet?.publicKey);
		const showRepayButton = userDeal && dealStatus === DealStatus.IN_PROGRESS;

		return (
			<TableRow
				key={key}
				hover={userDeal}
				onClick={() => userDeal && navigationHelper(navigate, targetRoute, marketSeed)}
			>
				<TableCell className={"deal-name"}>{deal.name}</TableCell>
				<TableCell>{formatBorrowerKey(deal.borrower)}</TableCell>
				<TableCell>{createdAt.toUTCString()}</TableCell>
				<TableCell>{(goLiveAt && goLiveAt.toUTCString()) || "-"}</TableCell>
				<TableCell>
					{intl.formatNumber(formatRatio(deal.financingFeePercentage).toNumber())}%
				</TableCell>
				<TableCell>
					{formatUIAmount(new Big(deal.principal.toNumber()), Big.roundUp, intl.formatNumber)}
				</TableCell>
				<TableCell>
					{formatUIAmount(
						new Big(deal.principalAmountRepaid.toNumber()),
						Big.roundUp,
						intl.formatNumber
					)}
				</TableCell>
				<TableCell>
					{formatUIAmount(
						new Big(deal.interestAmountRepaid.toNumber()),
						Big.roundUp,
						intl.formatNumber
					)}
				</TableCell>
				<TableCell>{`${daysRemaining} / ${deal.timeToMaturityDays}`}</TableCell>
				<TableCell>{`${formatDealStatus(dealStatus)}`}</TableCell>
				<TableCell>{showRepayButton && <CredixButton text="repay" />}</TableCell>
			</TableRow>
		);
	};

	return (
		<div style={{ border: "1px solid black", maxWidth: "90vw" }}>
			<TableContainer sx={{ maxHeight: "60vh" }}>
				<Table stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>Deal Name</TableCell>
							<TableCell>Borrower</TableCell>
							<TableCell>Created at</TableCell>
							<TableCell>Go live at</TableCell>
							<TableCell>Financing fee</TableCell>
							<TableCell>Principal</TableCell>
							<TableCell>Principal repaid</TableCell>
							<TableCell>Interest repaid</TableCell>
							<TableCell>Days remaining</TableCell>
							<TableCell>Status</TableCell>
							<TableCell></TableCell>
						</TableRow>
					</TableHead>
					<TableBody>{deals.map((deal: any) => tableRow(deal.account, deal.publicKey))}</TableBody>
				</Table>
			</TableContainer>
		</div>
	);
};
