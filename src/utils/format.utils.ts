import { utils } from "@project-serum/anchor";
import { DECIMALS } from "consts";
import { DealStatus, Ratio } from "types/program.types";
import Big, { RoundingMode } from "big.js";
import millify from "millify";

const conversionFactor = new Big(10).pow(DECIMALS);

export const toUIAmount = (n: Big, _roundingMode: RoundingMode) =>
	millify(n.div(conversionFactor).round(2).toNumber(), { precision: 2 });

export const toProgramAmount = (n: Big) => n.mul(conversionFactor);

export const formatRatio = (r: Ratio) => {
	const numerator = new Big(r.numerator);
	const denominator = new Big(r.denominator);
	return numerator.div(denominator).mul(100);
};

export const encodeSeedString = (seedString: string) =>
	Buffer.from(utils.bytes.utf8.encode(seedString));

export const formatDealStatus = (dealStatus: DealStatus) => {
	switch (dealStatus) {
		case DealStatus.CLOSED:
			return "closed";
		case DealStatus.IN_PROGRESS:
			return "in progress";
		default:
			return "pending";
	}
};
