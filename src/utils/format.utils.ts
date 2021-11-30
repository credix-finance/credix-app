import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export const formatNumber = (n: number) => (1.0 * n) / 1000000;
//export const formatBN = (n: BN) => n.mul(1.0).div(1000000);

export const mapPKToSeed = (publicKey: PublicKey) => publicKey.toBuffer().slice(0, 10);

export const encodeSeedString = (seedString: string) =>
	Buffer.from(utils.bytes.utf8.encode(seedString));
