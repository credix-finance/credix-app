import { MESSAGES } from "messages";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { DepositStakeForm } from "./DepositStakeForm";
import { WithdrawStakeForm } from "./WithdrawStakeForm";
import "../../../styles/stakeform.scss";
import { getInvestorTokenUSDCBalance } from "store/api";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Wallet } from "@project-serum/anchor";
import { Button } from "@material-ui/core";

export const StakeForm = () => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [stake, setStake] = useState<number>(0);

	const checkStake = useCallback(async () => {
		if (wallet) {
			const stake = await getInvestorTokenUSDCBalance(connection.connection, wallet as Wallet);
			setStake(stake);
		}
	}, [connection.connection, wallet]);

	useEffect(() => {
		checkStake();
	}, [checkStake]);

	return (
		<div className="stake-and-withdraw-container">
			<div className="row">
				<h1>{intl.formatMessage(MESSAGES.stake, { stake })}</h1>
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