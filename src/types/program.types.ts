import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { Credix } from "credix";

export type CredixTypes = AnchorTypes<
	Credix,
	{
		deal: Deal;
		globalMarketState: GlobalMarketState;
		borrowerInfo: BorrowerInfo;
		credixPass: CredixPass;
	},
	{ DealRepaymentType: RepaymentType }
>;

export type CredixProgram = CredixTypes["Program"];

export type Deal = CredixTypes["Accounts"]["deal"];
export type CredixPass = CredixTypes["Accounts"]["credixPass"];
export type GlobalMarketState = CredixTypes["Accounts"]["globalMarketState"];
export type BorrowerInfo = CredixTypes["Accounts"]["borrowerInfo"];

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

export type PrincipalRepaymentType = { principal: {} };
export type InterestRepaymentType = { interest: {} };

export type RepaymentType = PrincipalRepaymentType | InterestRepaymentType;
