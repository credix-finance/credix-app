import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useEffect, useState } from "react";
import { getPoolStats } from "store/api";
import { PoolStats } from "types/program.types";

export const PoolStatsDashboard = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();

	const [poolStats, setPoolstats] = useState<PoolStats | undefined>();

	useEffect(() => {
		(async () => {
			if (wallet) {
				const poolStats = await getPoolStats(connection.connection, wallet as Wallet);
				setPoolstats(poolStats);
			}
		})();
	}, [connection.connection, wallet]);

	if (!poolStats) {
		return null;
	}

	return (
		<div>
			<p>TVL: {poolStats.TVL}</p>
			<p>APY: {poolStats.APY}</p>
			<p>Outstanding Credit: {poolStats.outstandingCredit}</p>
			<p>Solend buffer: {poolStats.solendBuffer}</p>
		</div>
	);
};
