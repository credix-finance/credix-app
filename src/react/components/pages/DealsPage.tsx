import { CreateDealButton } from "@components/buttons/CreateDealButton";
import { DealsTable } from "@components/DealsTable";
import { DealLayout } from "@components/layouts/DealLayout";
import React from "react";

export const DealsPage = () => (
	<DealLayout>
		<div style={{ display: "flex", flexDirection: "column" }}>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<h2>Deals</h2>
				<CreateDealButton />
			</div>
			<DealsTable />
		</div>
	</DealLayout>
);
