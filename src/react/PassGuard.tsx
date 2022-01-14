import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getCredixPassInfo } from "client/api";
import { useCallback, useEffect, useState } from "react";
import { CredixPass } from "types/program.types";
import React from "react";
import { useMarketSeed } from "./hooks/useMarketSeed";

interface Props {
	children?: React.ReactNode;
}

export const PassGuard = (props: Props) => {
	const wallet = useWallet();
	const anchorWallet = useAnchorWallet();
	const connection = useConnection();
	const [credixPass, setCredixPass] = useState<CredixPass | null>(null);
	const marketSeed = useMarketSeed();

	const getCredixPass = useCallback(async () => {
		if (!wallet.connected) {
			setCredixPass(null);
			return;
		}

		if (wallet.connected && wallet.publicKey) {
			const credixPass = await getCredixPassInfo(
				wallet.publicKey,
				connection.connection,
				anchorWallet as typeof Wallet,
				marketSeed
			);
			setCredixPass(credixPass);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connection.connection, wallet.connected, marketSeed]);

	useEffect(() => {
		getCredixPass();
	}, [getCredixPass]);

	return credixPass?.active ? (
		<>{props.children}</>
	) : (
		<div className="container">
			<div className="pass-guard-container">
				<p>{"The Credix Marketplace is now open to accredited investors and fintech lenders."}</p>
				<br />
				<p>{"You will be able to interact with the protocol if you’re whitelisted."}</p>
				<br />
				{!wallet.connected && <p>{"Please connect your wallet."}</p>}
			</div>
		</div>
	);
};
