import { Deal, DealStatus } from "types/program.types";

export const mapDealToStatus = (deal: Deal, clusterTime: number): DealStatus => {
	const { amountRepaid, principal, financingFeePercentage, goLiveAt } = deal;

	if (amountRepaid === principal * (1 + financingFeePercentage / 100)) {
		return DealStatus.CLOSED;
	}

	if (goLiveAt >= clusterTime) {
		return DealStatus.IN_PROGRESS;
	}

	return DealStatus.PENDING;
};
