import { Table, TableHead, TableBody, TableCell, TableRow, TableContainer } from "@mui/material";
import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useState } from "react";
import { getDealAccounts } from "client/api";
import { Deal } from "types/program.types";
import { useNavigate } from "react-router-dom";
import { Path } from "types/navigation.types";

export const DealsTable = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [deals, setDeals] = useState<any>([]);
	const navigate = useNavigate();

	const getDeals = useCallback(async () => {
		const deals = await getDealAccounts(connection.connection, wallet as Wallet);
		setDeals(deals);
	}, [connection.connection, wallet]);

	useEffect(() => {
		if (wallet) {
			getDeals();
		}
	}, [wallet, getDeals]);

	const tableRow = (deal: Deal, key: any) => (
		<TableRow
			key={key}
			hover
			onClick={() => navigate(Path.DEAL.replace(":deal", deal.dealNumber.toString()))}
		>
			<TableCell align="center">{deal.createdAt.toString()}</TableCell>
			<TableCell align="center">{deal.financingFeePercentage}</TableCell>
			<TableCell align="center">{deal.goLiveAt.toString()}</TableCell>
			<TableCell align="center">{deal.interestAmountRepaid.toString()}</TableCell>
			<TableCell align="center">{deal.principal.toString()}</TableCell>
			<TableCell align="center">{deal.principalAmountRepaid.toString()}</TableCell>
			<TableCell align="center">{deal.timeToMaturityDays}</TableCell>
		</TableRow>
	);

	return (
		<div style={{ border: "1px solid black" }}>
			<TableContainer>
				<Table sx={{ fontFamily: "IBM Plex Mono" }}>
					<TableHead>
						<TableRow onClick={console.log}>
							<TableCell>Created at</TableCell>
							<TableCell>Financing fee %</TableCell>
							<TableCell>Go live at</TableCell>
							<TableCell>Interest repaid</TableCell>
							<TableCell>Principal</TableCell>
							<TableCell>Principal amount repaid</TableCell>
							<TableCell>Time to maturity (days)</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>{deals.map((deal: any) => tableRow(deal.account, deal.publicKey))}</TableBody>
				</Table>
			</TableContainer>
		</div>
	);
};
