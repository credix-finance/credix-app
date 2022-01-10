import { Button } from "@material-ui/core";
import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Big } from "big.js";
import { getPoolStats } from "client/api";
import millify from "millify";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useRefresh } from "react/hooks/useRefresh";
import { PoolStats } from "types/program.types";
import { formatNumber, formatRatio, toUIAmount } from "utils/format.utils";
import "../../styles/poolstats.scss";

export const PoolStatsDashboard = () => {
	const intl = useIntl();
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
				<div className="pool-stat">
					<div className="hover-text">
						<p>The total amount of USDC that has been provided to the credix protocol.</p>
					</div>
					<p className="pool-stat-number">
						{poolStats && millify(toUIAmount(new Big(poolStats.TVL.toNumber())).toNumber())}
					</p>
					<p className="pool-stat-title">TVL [USDC]</p>
				</div>
				<div className="pool-stat">
					<div className="hover-text">
						<p>
							The total amount of USDC that is currently supplied in credit lines to the borrowers.
						</p>
					</div>
					<p className="pool-stat-number">
						{poolStats &&
							millify(toUIAmount(new Big(poolStats.outstandingCredit.toNumber())).toNumber())}
					</p>
					<p className="pool-stat-title">Credit outstanding [USDC]</p>
				</div>
				<div className="pool-stat">
					<div className="hover-text">
						<p>
							The expected APY that investors get; calculated based on the weighted average of the
							financing fees of outstanding deals.
						</p>
					</div>
					<p className="pool-stat-number">
						{poolStats &&
							formatNumber(formatRatio(poolStats.APY), Big.roundHalfUp, intl.formatNumber)}
						%
					</p>
					<p className="pool-stat-title">Estimated APY</p>
				</div>
			</div>
		</div>
	);
};
