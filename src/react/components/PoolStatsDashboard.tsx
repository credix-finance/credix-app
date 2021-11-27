import { Button } from "@material-ui/core";
import millify from "millify";
import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useState } from "react";
import { getPoolStats } from "store/api";
import { PoolStats } from "types/program.types";
import "../../styles/poolstats.scss";
import { useRefresh } from "react/hooks/useRefresh";

export const PoolStatsDashboard = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();

	const [poolStats, setPoolstats] = useState<PoolStats | undefined>();

	const updatePoolStats = useCallback(async () => {
		const poolStats = await getPoolStats(connection.connection, wallet as Wallet);
		setPoolstats(poolStats);
		// whether the wallet is connected or not is irrelevant for this component so not including the wallet as a dependency \
		//  avoids unnecessary rerenders
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connection.connection]);

	useRefresh(updatePoolStats);

	useEffect(() => {
		updatePoolStats();
	}, [updatePoolStats]);

	return (
		<div className="pool-container">
			<div className="row">
				<h2>Pool statistics</h2>
				<Button
					variant="contained"
					className="refresh-stats MuiButton-containedPrimary balance-button credix-button"
					onClick={updatePoolStats}
				>
					Refresh statistics
				</Button>
			</div>
			<div className="pool-box">
				<div className="pool-stat pool-stat-tl">
					<div className="hover-text">
						<p>The total amount of USDC that has been provided to the credix protocol.</p>
					</div>
					<p className="pool-stat-number">{poolStats && millify(poolStats.TVL)}</p>
					<p className="pool-stat-title">TVL [USDC]</p>
				</div>
				<div className="pool-stat pool-stat-tr">
					<div className="hover-text">
						<p>The expected APY that investors get; given the current deals and pool size.</p>
					</div>
					<p className="pool-stat-number">{poolStats && Math.round(poolStats.APY * 100)}%</p>
					<p className="pool-stat-title">estimated APY</p>
				</div>
				<div className="pool-stat pool-stat-bl">
					<div className="hover-text">
						<p>
							The total amount of USDC that is currently supplied in credit lines to the borrowers.
						</p>
					</div>
					<p className="pool-stat-number">{poolStats && millify(poolStats.outstandingCredit)}</p>
					<p className="pool-stat-title">Credit outstanding [USDC]</p>
				</div>
				<div className="pool-stat pool-stat-br">
					<div className="hover-text">
						<p>Non-allocated capital is activated by staking it in Solend.</p>
					</div>
					<p className="pool-stat-number">{poolStats && millify(poolStats.solendBuffer)}</p>
					<p className="pool-stat-title">Solend buffer [USDC]</p>
				</div>
			</div>
		</div>
	);
};
