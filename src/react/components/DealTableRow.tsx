import React from "react";
import { Deal } from "types/program.types";

interface Props {
	deal: Deal;
}

export const DealTableRow = (props: Props) => {
	return (
		<tr>
			<td>{props.deal.createdAt.toString()}</td>
			<td>{props.deal.financingFeePercentage}</td>
			<td>{props.deal.goLiveAt.toString()}</td>
			<td>{props.deal.interestAmountRepaid.toString()}</td>
			<td>{props.deal.leverageRatio}</td>
			<td>{props.deal.principal.toString()}</td>
			<td>{props.deal.principalAmountRepaid.toString()}</td>
			<td>{props.deal.timeToMaturityDays}</td>
			<td>{props.deal.underwriterPerformanceFeePercentage}</td>
		</tr>
	);
};
