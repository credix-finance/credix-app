import { PublicKey } from "@solana/web3.js";

export interface PoolStats {
	TVL: number;
	APY: number;
	outstandingCredit: number;
	solendBuffer: number;
}

export enum DealStatus {
	CLOSED,
	IN_PROGRESS,
	PENDING,
}

export type Deal = {
	borrower: PublicKey;
	principal: number;
	financingFeePercentage: number;
	amountRepaid: number;
	timeToMaturityDays: number;
	goLiveAt: number;
	createdAt: number;
	leverageRatio: number;
	underwriterPerformanceFeePercentage: number;
};
