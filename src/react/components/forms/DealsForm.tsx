import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import React, { useCallback, useEffect, useState } from "react";
import { CreateDealForm } from "./CreateDealForm";
import "../../../styles/deals.scss";
import { DealOverview } from "@components/DealOverview";
import { useRefresh } from "react/hooks/useRefresh";
import { mapDealToStatus } from "utils/deal.utils";
import { Deal, DealStatus } from "types/program.types";
import { serialAsync } from "utils/async.utils";
import { getClusterTime, getDealAccountData } from "client/api";

export const DealsForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [dealExists, setDealExists] = useState<boolean>(false);
	const [closedDealExists, setClosedDealExists] = useState<boolean>(false);

	const checkDealExists = useCallback(
		serialAsync(async () => {
			try {
				const _dealData = getDealAccountData(connection.connection, wallet as Wallet);
				const _clusterTime = getClusterTime(connection.connection);

				const [dealData, clusterTime] = await Promise.all([_dealData, _clusterTime]);

				if (!clusterTime) {
					throw Error("Could not fetch cluster time");
				}

				const status = mapDealToStatus(dealData as Deal, clusterTime);
				setDealExists(status !== DealStatus.CLOSED);
				setClosedDealExists(status === DealStatus.CLOSED);
			} catch (err) {
				setDealExists(false);
			}
		}),
		[connection.connection, wallet]
	);

	useRefresh(checkDealExists);

	useEffect(() => {
		if (wallet) {
			checkDealExists();
		}
	}, [checkDealExists, wallet]);

	return dealExists ? <DealOverview /> : <CreateDealForm disabled={closedDealExists} />;
};
