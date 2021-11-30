import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useEffect, useState } from "react";
import { getDealAccountData } from "store/api";
import { CreateDealForm } from "./CreateDealForm";
import "../../../styles/deals.scss";
import { DealOverview } from "@components/DealOverview";

export const DealsForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [dealExists, setDealExists] = useState<boolean>(false);

	useEffect(() => {
		(async () => {
			if (wallet) {
				try {
					await getDealAccountData(connection.connection, wallet as Wallet);
					setDealExists(true);
				} catch (err) {
					setDealExists(false);
				}
			}
		})();
	}, [connection.connection, wallet]);

	return dealExists ? <DealOverview /> : <CreateDealForm />;
};
