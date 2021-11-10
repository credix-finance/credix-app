import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { MESSAGES } from "messages";
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { getBalance } from "store/api";

export const Balance = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const intl = useIntl();
	const [balance, setBalance] = useState<number>(0);

	useEffect(() => {
		(async () => {
			if (wallet) {
				const balance = await getBalance(connection.connection, wallet as Wallet);
				setBalance(balance);
			}
		})();
	}, [connection.connection, wallet]);

	return (
		<div>
			<h1>{intl.formatMessage(MESSAGES.balance, { balance })}</h1>
		</div>
	);
};
