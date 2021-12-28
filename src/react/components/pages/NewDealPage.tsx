import { CreateDealForm } from "@components/forms/CreateDealForm";
import { DealLayout } from "@components/layouts/DealLayout";
import { PublicKey } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Path } from "types/navigation.types";

export const NewDealPage = () => {
	const [borrower, setBorrower] = useState<PublicKey | undefined>();
	const params = useParams();
	const navigate = useNavigate();

	useEffect(() => {
		if (params.borrower) {
			try {
				setBorrower(new PublicKey(params.borrower));
			} catch (e) {
				// TODO: put this in a borrower route guard or something
				navigate(Path.NOT_FOUND);
			}
		}
	}, [params.borrower, navigate]);

	return (
		<DealLayout>
			<CreateDealForm borrower={borrower} />
		</DealLayout>
	);
};
