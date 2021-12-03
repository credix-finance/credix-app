import {
	Deal,
	DealStatus,
	InterestRepaymentType,
	PrincipalRepaymentType,
} from "types/program.types";

export const mapDealToStatus = (deal: Deal, clusterTime: number): DealStatus => {
	const { amountRepaid, principal, financingFeePercentage, goLiveAt } = deal;

	if (amountRepaid.toNumber() >= principal.toNumber() * (1 + financingFeePercentage / 100)) {
		return DealStatus.CLOSED;
	}

	if (goLiveAt.toNumber() <= clusterTime) {
		return DealStatus.IN_PROGRESS;
	}

	return DealStatus.PENDING;
};

export const createPrincipalRepaymentType = (): PrincipalRepaymentType => ({ principal: {} });
export const createInterestRepaymentType = (): InterestRepaymentType => ({ interest: {} });
