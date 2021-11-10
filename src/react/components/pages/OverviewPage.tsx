import { AppLayout } from "@components/AppLayout";
import { PoolStatsDashboard } from "@components/PoolStatsDashboard";
import React from "react";

export const OverviewPage = () => {
	return (
		<AppLayout>
			<p>Credix - Overview</p>
			<PoolStatsDashboard />
		</AppLayout>
	);
};
