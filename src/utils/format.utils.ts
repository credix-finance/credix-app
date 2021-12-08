import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { DECIMALS, PERCENTAGE_FACTOR } from "consts";
import { round } from "./math.utils";

export const mapPKToSeed = (publicKey: PublicKey) => publicKey.toBuffer().slice(0, 10);

export const encodeSeedString = (seedString: string) =>
	Buffer.from(utils.bytes.utf8.encode(seedString));

export const toAppAmount = (n: number) => n / Math.pow(10, DECIMALS);
export const toProgramAmount = (n: number) => n * Math.pow(10, DECIMALS);
export const toProgramPercentage = (n: number) => n * PERCENTAGE_FACTOR;
export const toAppPercentage = (n: number) => round(n / PERCENTAGE_FACTOR);

export const toUIAmount = (n: number) => round(toAppAmount(n));
export const toUIPercentage = (n: number) => round(toAppPercentage(n));
