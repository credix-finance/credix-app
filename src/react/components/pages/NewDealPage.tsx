import { CreateDealForm } from "@components/forms/CreateDealForm";
import { DealLayout } from "@components/layouts/DealLayout";
import React from "react";

export const NewDealPage = () => {
	return (
		<DealLayout>
			<CreateDealForm />
		</DealLayout>
	);
};
