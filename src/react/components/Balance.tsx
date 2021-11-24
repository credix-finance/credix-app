import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { MESSAGES } from "messages";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { getBalance } from "store/api";
import { Button } from "@material-ui/core";

export const Balance = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const intl = useIntl();
	const [balance, setBalance] = useState<number>(0);

	const checkBalance = useCallback(async () => {
		if (wallet) {
			const balance = await getBalance(connection.connection, wallet as Wallet);
			setBalance(balance);
		}
	}, [connection.connection, wallet]);

	useEffect(() => {
		checkBalance();
	}, [checkBalance]);

	return (
		<>
			<Button
				variant="contained"
				className="MuiButton-containedPrimary balance-button credix-button"
				onClick={checkBalance}
				disabled={!wallet}
			>
				Check balance
			</Button>
			<div className="balance-and-pk">
				<h1>{intl.formatMessage(MESSAGES.balance, { balance })}</h1>
			</div>
		</>
	);
};
