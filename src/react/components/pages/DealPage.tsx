import { DealsForm } from "@components/forms/DealsForm";
import { AppLayout } from "@components/layouts/AppLayout";
import React from "react";

export const DealPage = () => (
	<AppLayout>
		<div className="container-deals">
			<DealsForm />
		</div>
	</AppLayout>
);
