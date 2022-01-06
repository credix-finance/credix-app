import type { AnchorTypes } from "@saberhq/anchor-contrib";
import Big from "big.js";
import { Credix } from "credix";

export type CredixTypes = AnchorTypes<
	Credix,
	{
		deal: Deal;
		globalMarketState: GlobalMarketState;
		borrowerInfo: BorrowerInfo;
		credixPass: CredixPass;
	},
	{ DealRepaymentType: RepaymentType; Ratio: Ratio }
>;

export type CredixProgram = CredixTypes["Program"];

export type Deal = CredixTypes["Accounts"]["Deal"];
export type CredixPass = CredixTypes["Accounts"]["CredixPass"];
export type GlobalMarketState = CredixTypes["Accounts"]["GlobalMarketState"];
export type BorrowerInfo = CredixTypes["Accounts"]["BorrowerInfo"];

export type Ratio = {
	numerator: number;
	denominator: number;
};

export type PrincipalRepaymentType = { principal: {} };
export type InterestRepaymentType = { interest: {} };

export type RepaymentType = PrincipalRepaymentType | InterestRepaymentType;

export interface PoolStats {
	TVL: Big;
	APY: Big;
	outstandingCredit: Big;
}

export enum DealStatus {
	CLOSED,
	IN_PROGRESS,
	PENDING,
}
