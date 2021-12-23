import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { config } from "config";
import { SEEDS } from "consts";
import { PdaSeeds } from "types/solana.types";
import { multiAsync } from "utils/async.utils";
import { encodeSeedString } from "utils/format.utils";

const findPDA = multiAsync(async (seeds: PdaSeeds) => {
	const programId = config.clusterConfig.programId;
	return PublicKey.findProgramAddress(seeds, programId);
});

export const findGlobalMarketStatePDA = multiAsync(async () => {
	const seed = encodeSeedString(SEEDS.GLOBAL_MARKET_STATE_PDA);
	return findPDA([seed]);
});

export const findSigningAuthorityPDA = multiAsync(async () => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA();
	const seeds: PdaSeeds = [globalMarketStatePDA[0].toBuffer()];
	return findPDA(seeds);
});

export const findDealPDA = multiAsync(async (publicKey: PublicKey, dealNumber: number) => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA();

	const globalMarketStateSeed = globalMarketStatePDA[0].toBuffer();
	const borrowerSeed = publicKey.toBuffer();
	const dealInfo = encodeSeedString(SEEDS.DEAL_INFO);
	const dealNumberBN = new BN(dealNumber);

	const seeds: PdaSeeds = [
		globalMarketStateSeed,
		borrowerSeed,
		dealInfo,
		dealNumberBN.toArrayLike(Buffer, "le", 2),
	];
	return findPDA(seeds);
});

export const findBorrowerInfoPDA = multiAsync(async (borrowerPK: PublicKey) => {
	const globalMarketStatePDA = await findGlobalMarketStatePDA();
	const borrowerInfoSeed = encodeSeedString(SEEDS.BORROWER_INFO);
	const seeds: PdaSeeds = [
		borrowerInfoSeed,
		globalMarketStatePDA[0].toBuffer(),
		borrowerPK.toBuffer(),
	];

	return findPDA(seeds);
});
