import { CreateDealButton } from "@components/buttons/CreateDealButton";
import { DealsTable } from "@components/DealsTable";
import { DealLayout } from "@components/layouts/DealLayout";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Path } from "types/navigation.types";

export const DealsPage = () => {
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
			<div style={{ display: "flex", flexDirection: "column" }}>
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					<h2>Deals</h2>
					<CreateDealButton borrower={borrower} />
				</div>
				<DealsTable borrower={borrower} />
			</div>
		</DealLayout>
	);
};
