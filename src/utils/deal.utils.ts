import {
	Deal,
	DealStatus,
	InterestRepaymentType,
	PrincipalRepaymentType,
} from "types/program.types";
import { percentage } from "./math.utils";

export const mapDealToStatus = (deal: Deal, clusterTime: number): DealStatus => {
	const principalToPay = getPrincipalToRepay(deal);
	const interestToPay = getInterestToRepay(deal);

	if (!principalToPay && !interestToPay) {
		return DealStatus.CLOSED;
	}

	if (deal.goLiveAt.toNumber() <= clusterTime) {
		return DealStatus.IN_PROGRESS;
	}

	return DealStatus.PENDING;
};

export const getTotalInterest = (deal: Deal) => {
	return percentage(deal.principal.toNumber(), deal.financingFeePercentage);
};

export const getPrincipalToRepay = (deal: Deal) => {
	return deal.principal.toNumber() - deal.principalAmountRepaid.toNumber();
};

export const getInterestToRepay = (deal: Deal) => {
	const totalInterest = getTotalInterest(deal);
	return totalInterest - deal.interestAmountRepaid.toNumber();
};

export const createPrincipalRepaymentType = (): PrincipalRepaymentType => ({ principal: {} });
export const createInterestRepaymentType = (): InterestRepaymentType => ({ interest: {} });
