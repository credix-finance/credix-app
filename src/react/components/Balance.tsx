import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { MESSAGES } from "messages";
import React, { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Button } from "@material-ui/core";
import { useRefresh } from "react/hooks/useRefresh";
import { getUserUSDCBalance } from "client/api";
import { Big } from "big.js";
import { ZERO } from "utils/math.utils";
import { formatUIAmount } from "utils/format.utils";

export const Balance = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const intl = useIntl();
	const [balance, setBalance] = useState<Big>(ZERO);

	const checkBalance = useCallback(async () => {
		if (wallet) {
			const balance = await getUserUSDCBalance(connection.connection, wallet as typeof Wallet);
			setBalance(balance);
		}
	}, [connection.connection, wallet]);

	useRefresh(checkBalance);

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
				<h1>
					{intl.formatMessage(MESSAGES.balance, {
						balance: formatUIAmount(balance, Big.roundDown, intl.formatNumber),
					})}
				</h1>
			</div>
		</>
	);
};
