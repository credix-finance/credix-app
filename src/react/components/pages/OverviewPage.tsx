import { AppLayout } from "@components/layouts/AppLayout";
import { PoolStatsDashboard } from "@components/PoolStatsDashboard";
import { StakeForm } from "@components/forms/StakeForm";
import React from "react";

export const OverviewPage = () => {
	return (
		<AppLayout>
			<div className="container">
				<div className="pool-and-stake-withdraw-wrapper">
					<div className="pool-and-stake-withdraw-container">
						<PoolStatsDashboard />
						<StakeForm />
					</div>
				</div>
			</div>
		</AppLayout>
	);
};
