import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { DepositStakeForm } from "./DepositStakeForm";
import { WithdrawStakeForm } from "./WithdrawStakeForm";
import "../../../styles/stakeform.scss";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Wallet } from "@project-serum/anchor";
import { Button } from "@material-ui/core";
import { useRefresh } from "react/hooks/useRefresh";
import { getLPTokenBaseBalance } from "client/api";
import { Big } from "big.js";
import { ZERO } from "utils/math.utils";
import { formatUIAmount } from "utils/format.utils";
import { useMarketSeed } from "react/hooks/useMarketSeed";

export const StakeForm = () => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [stake, setStake] = useState<Big>(ZERO);
	const marketSeed = useMarketSeed();

	const checkStake = useCallback(async () => {
		if (wallet) {
			const stake = await getLPTokenBaseBalance(
				connection.connection,
				wallet as Wallet,
				marketSeed
			);
			setStake(stake);
		}
	}, [connection.connection, wallet, marketSeed]);

	useRefresh(checkStake);

	useEffect(() => {
		checkStake();
	}, [checkStake]);

	return (
		<div className="stake-and-withdraw-container">
			<div className="row">
				<h1>{`Your stake: ${formatUIAmount(stake, Big.roundDown, intl.formatNumber)} USDC`}</h1>
				<Button
					variant="contained"
					className="MuiButton-containedPrimary stake-button credix-button"
					onClick={checkStake}
					disabled={!wallet}
				>
					Check stake
				</Button>
			</div>
			<hr />
			<div>
				<DepositStakeForm />
				<WithdrawStakeForm />
			</div>
		</div>
	);
};
