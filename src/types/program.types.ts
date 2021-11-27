export interface PoolStats {
	TVL: number;
	APY: number;
	outstandingCredit: number;
	solendBuffer: number;
}

export enum DealStatus {
	CLOSED = "closed",
}
