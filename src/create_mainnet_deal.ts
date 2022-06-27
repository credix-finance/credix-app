import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import Big from "big.js";
import {
	getAssociatedBaseTokenAddressPK,
	getBaseMintPK,
	getGatekeeperNetwork,
	getLiquidityPoolAssociatedBaseTokenAddressPK,
	getTreasuryPoolTokenAccountPK,
} from "client/api";
import * as anchor from "@project-serum/anchor";
import {
	findBorrowerInfoPDA,
	findCredixPassPDA,
	findDealPDA,
	findGlobalMarketStatePDA,
	findSigningAuthorityPDA,
} from "client/pda";
import { multiAsync } from "utils/async.utils";
import { findGatewayToken } from "@identity.com/solana-gateway-ts";
import { newCredixProgram } from "client/program";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

interface DealData {
	dealPubkey: string;
	name: string;
	borrowerPubkey: string;
	principal: number;
	financingFeePercentage: string;
	principalAmountRepaid: number;
	interestAmountRepaid: number;
	timeToMaturityDays: number;
	goLiveAt: string;
}

const data: DealData[] = [
	{
		dealPubkey: "BLwUyuQFArLdg9P46fEo4gbSho1B3AkKvtZacsdQ4yJA",
		name: "Tecredi - deal 1",
		borrowerPubkey: "7WEAxvYXpvZzn7Cucd3Xr8ayAjVGiS8hWkKBFC9QQLLJ",
		principal: 250000,
		financingFeePercentage: "15/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 12500,
		timeToMaturityDays: 360,
		goLiveAt: "2/15/2022",
	},
	{
		dealPubkey: "6p6Hmbja9gy6h1EUvjYcWYCZsTjRGkdmVvJgGwVTWqZY",
		name: "A55 - deal 3",
		borrowerPubkey: "HyoSgmZkU1XYhrjpXLVS53jZ1dxchyctvM4xEQK9AyfR",
		principal: 5000000,
		financingFeePercentage: "15/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 0,
		timeToMaturityDays: 1080,
		goLiveAt: "6/13/2022",
	},
	{
		dealPubkey: "93wWYXWF52jA8nTqse1NxqXXJE4ASLzb3wmmLdHBiqbj",
		name: "Descontanet - deal 1",
		borrowerPubkey: "AryLKp7Tda9UjJXe7q27T8w2ERYA9WiSWmw67yiYq2K2",
		principal: 200000,
		financingFeePercentage: "15/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 2500,
		timeToMaturityDays: 360,
		goLiveAt: "5/13/2022",
	},
	{
		dealPubkey: "EnMa4fdxLkHdTRdaqLbjVPSxLWvq9n68YzK8RYZWFuoP",
		name: "Tecredi - deal 3",
		borrowerPubkey: "7WEAxvYXpvZzn7Cucd3Xr8ayAjVGiS8hWkKBFC9QQLLJ",
		principal: 750000,
		financingFeePercentage: "14/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 8750,
		timeToMaturityDays: 1080,
		goLiveAt: "5/17/2022",
	},
	{
		dealPubkey: "8Kxo7tYgekW2Un1PToTwbo2xpPE2N72JzE8bkf7zAgFb",
		name: "Provi - deal 1",
		borrowerPubkey: "751seYkN3K5sHaKn2YPq9ZDxes84StwKt81fRmYtRDwB",
		principal: 2000000,
		financingFeePercentage: "14/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 0,
		timeToMaturityDays: 720,
		goLiveAt: "6/8/2022",
	},
	{
		dealPubkey: "7wTEo6A78a3izB4rUMxjQYrh3Rub6QPkRYqQ9aKfxZ1M",
		name: "Adiante - deal 1",
		borrowerPubkey: "C7H8BLVMZWH2KXKWsCmfbaxBF6r2B9eW8A7DbknoxUhC",
		principal: 3000000,
		financingFeePercentage: "15/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 0,
		timeToMaturityDays: 720,
		goLiveAt: "6/2/2022",
	},
	{
		dealPubkey: "3mVaW3tQV7NSYipz4qMyHva2DFG5Y1Wgd72mkRR9ZYmD",
		name: "A55 - deal 2",
		borrowerPubkey: "HyoSgmZkU1XYhrjpXLVS53jZ1dxchyctvM4xEQK9AyfR",
		principal: 3000000,
		financingFeePercentage: "15/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 75000,
		timeToMaturityDays: 1080,
		goLiveAt: "4/9/2022",
	},
	{
		dealPubkey: "GAZv6Nivo8AcAc5bBYsdC8yvgwoJzUtMKNPr8RkgZtVX",
		name: "Tecredi - deal 2",
		borrowerPubkey: "7WEAxvYXpvZzn7Cucd3Xr8ayAjVGiS8hWkKBFC9QQLLJ",
		principal: 750000,
		financingFeePercentage: "14/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 17500,
		timeToMaturityDays: 1080,
		goLiveAt: "4/7/2022",
	},
	{
		dealPubkey: "6C3uNRc8doSXS5DKSh7gj7ThmvUuChczcGJuWm7i6pmD",
		name: "A55 - Deal 1",
		borrowerPubkey: "HyoSgmZkU1XYhrjpXLVS53jZ1dxchyctvM4xEQK9AyfR",
		principal: 500000,
		financingFeePercentage: "15/100",
		principalAmountRepaid: 0,
		interestAmountRepaid: 18750,
		timeToMaturityDays: 360,
		goLiveAt: "2/16/2022",
	},
];

const privateKey = [
	188, 227, 51, 171, 192, 121, 203, 161, 240, 238, 33, 254, 39, 135, 42, 186, 145, 154, 44, 203,
	236, 180, 154, 213, 243, 172, 85, 141, 248, 16, 18, 50, 203, 239, 246, 206, 237, 181, 107, 147,
	188, 108, 195, 140, 194, 3, 127, 246, 142, 0, 227, 22, 144, 227, 109, 194, 211, 124, 66, 44, 147,
	237, 9, 63,
];

const developmentKey = Keypair.fromSecretKey(Uint8Array.from(privateKey));

export const createMainnetDeals = async (connection: Connection) => {
	console.log(data.length);
	for (let i = 0; i < data.length; i++) {
		const deal = data[i];
		console.log("creating " + deal.name);
		const principal = new Big(deal.principal * 1000_000);
		const timeToMaturity = deal.timeToMaturityDays;
		const borrower = developmentKey.publicKey;
		console.log(borrower.toString());
		const dealName = deal.name;
		const globalMarketSeed = "credix-marketplace";
		const wallet = new NodeWallet(developmentKey);

		const _dealPDA = findDealPDA(borrower, i, globalMarketSeed);
		const _globalMarketStatePDA = findGlobalMarketStatePDA(globalMarketSeed);
		const _getCredixPassPDA = findCredixPassPDA(borrower, globalMarketSeed);
		const _borrowerInfoPDA = findBorrowerInfoPDA(borrower, globalMarketSeed);
		const _getGatewayToken = getGatewayToken(connection, wallet, borrower, globalMarketSeed);
		const _signingAuthorityPDA = findSigningAuthorityPDA(globalMarketSeed);
		const _liquidityPoolAssociatedBaseTokenAddressPK = getLiquidityPoolAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			globalMarketSeed
		);
		const _userAssociatedBaseTokenAddressPK = getAssociatedBaseTokenAddressPK(
			connection,
			wallet,
			borrower,
			false,
			globalMarketSeed
		);
		const _baseMintPK = getBaseMintPK(connection, wallet, globalMarketSeed);
		const _treasuryPoolTokenAccountPK = getTreasuryPoolTokenAccountPK(
			connection,
			wallet,
			globalMarketSeed
		);

		const [
			dealPDA,
			globalMarketStatePDA,
			borrowerInfoPDA,
			gatewayToken,
			credixPass,
			signingAuthorityPDA,
			baseMintPK,
			userAssociatedBaseTokenAddressPK,
			liquidityPoolAssociatedBaseTokenAddressPK,
			treasuryPoolTokenAccountPK,
		] = await Promise.all([
			_dealPDA,
			_globalMarketStatePDA,
			_borrowerInfoPDA,
			_getGatewayToken,
			_getCredixPassPDA,
			_signingAuthorityPDA,
			_baseMintPK,
			_userAssociatedBaseTokenAddressPK,
			_liquidityPoolAssociatedBaseTokenAddressPK,
			_treasuryPoolTokenAccountPK,
		]);

		const program = newCredixProgram(connection, wallet);

		const principalAmount = new anchor.BN(principal.toNumber());

		await program.rpc.createDeal(
			principalAmount,
			{
				numerator: parseInt(deal.financingFeePercentage.split("/")[0]),
				denominator: parseInt(deal.financingFeePercentage.split("/")[1]),
			},
			0,
			0,
			timeToMaturity,
			dealName,
			{
				accounts: {
					owner: wallet.publicKey,
					gatewayToken: gatewayToken.publicKey,
					borrower: borrower,
					borrowerInfo: borrowerInfoPDA[0],
					globalMarketState: globalMarketStatePDA[0],
					credixPass: credixPass[0],
					deal: dealPDA[0],
					systemProgram: SystemProgram.programId,
				},
			}
		);

		await program.rpc.activateDeal({
			accounts: {
				owner: wallet.publicKey,
				gatewayToken: gatewayToken.publicKey,
				globalMarketState: globalMarketStatePDA[0],
				signingAuthority: signingAuthorityPDA[0],
				deal: dealPDA[0],
				liquidityPoolTokenAccount: liquidityPoolAssociatedBaseTokenAddressPK,
				borrower: borrower,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				borrowerTokenAccount: userAssociatedBaseTokenAddressPK,
				credixPass: credixPass[0],
				baseTokenMint: baseMintPK,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: anchor.web3.SYSVAR_RENT_PUBKEY,
			},
		});

		const repayAmount = new anchor.BN(deal.interestAmountRepaid * 1000_000);
		await program.rpc.makeDealRepayment(
			repayAmount,
			{ interest: {} },
			{
				accounts: {
					borrower: wallet.publicKey,
					gatewayToken: gatewayToken.publicKey,
					globalMarketState: globalMarketStatePDA[0],
					borrowerTokenAccount: userAssociatedBaseTokenAddressPK,
					deal: dealPDA[0],
					liquidityPoolTokenAccount: liquidityPoolAssociatedBaseTokenAddressPK,
					treasuryPoolTokenAccount: treasuryPoolTokenAccountPK,
					signingAuthority: signingAuthorityPDA[0],
					baseTokenMint: baseMintPK,
					credixPass: credixPass[0],
					tokenProgram: TOKEN_PROGRAM_ID,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				},
			}
		);
	}
};

const getGatewayToken = multiAsync(
	async (
		connection: Connection,
		wallet: anchor.Wallet,
		userPK: PublicKey,
		globalMarketSeed: string
	) => {
		const gatekeeperNetwork = await getGatekeeperNetwork(
			connection,
			wallet as anchor.Wallet,
			globalMarketSeed
		);
		const gatewayToken = await findGatewayToken(connection, userPK, gatekeeperNetwork);

		if (!gatewayToken) {
			throw Error("No valid Civic gateway token found");
		}

		return gatewayToken;
	}
);
