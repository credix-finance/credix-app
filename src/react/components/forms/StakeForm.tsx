import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { DepositStakeForm } from "./DepositStakeForm";
import { WithdrawStakeForm } from "./WithdrawStakeForm";
import "../../../styles/stakeform.scss";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Wallet } from "@project-serum/anchor";
import { Button } from "@material-ui/core";
import { useRefresh } from "react/hooks/useRefresh";
import { getLPTokenUSDCBalance } from "client/api";
import { Big } from "big.js";
import { ZERO } from "utils/math.utils";
import { formatUIAmount } from "utils/format.utils";

export const StakeForm = () => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [stake, setStake] = useState<Big>(ZERO);

	const checkStake = useCallback(async () => {
		if (wallet) {
			const stake = await getLPTokenUSDCBalance(connection.connection, wallet as typeof Wallet);
			setStake(stake);
		}
	}, [connection.connection, wallet]);

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
