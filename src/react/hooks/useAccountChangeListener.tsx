import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AccountChangeCallback } from "@solana/web3.js";
import { useEffect, useState } from "react";

export const useAccountChangeListener = (callback: AccountChangeCallback) => {
	const connection = useConnection();
	const wallet = useWallet();
	const [subscription, setSubscription] = useState<number | undefined>();

	useEffect(() => {
		console.log("run", subscription);
		if (wallet.publicKey) {
			console.log("run", callback, subscription);
			const s = connection.connection.onAccountChange(wallet.publicKey, callback);
			setSubscription(s);
		}

		return () => {
			console.log("run remove", subscription);
			if (subscription) {
				console.log("remove sub", subscription);
				connection.connection.removeAccountChangeListener(subscription);
				setSubscription(undefined);
			}
		};
	}, [callback, connection.connection, wallet]);
};
