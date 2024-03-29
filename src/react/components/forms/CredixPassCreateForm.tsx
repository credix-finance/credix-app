import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { issueCredixPass } from "client/api";
import { useSnackbar } from "notistack";
import React, { useState } from "react";
import { useMarketSeed } from "react/hooks/useMarketSeed";
import { useNotify } from "react/hooks/useNotify";
import { serialAsync } from "utils/async.utils";
import "../../../styles/stakeform.scss";

export const CredixPassCreateForm = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const notify = useNotify();
	const { closeSnackbar } = useSnackbar();
	const marketSeed = useMarketSeed();

	const [isBorrower, setIsBorrower] = useState<boolean>(true);
	const [isUnderwriter, setIsUnderwriter] = useState<boolean>(true);
	const [passHolder, setPassHolder] = useState<string>("");

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		let snackbarKey;
		try {
			const holderPublicKey = new PublicKey(passHolder);

			const txPromise = issueCredixPass(
				holderPublicKey,
				isUnderwriter,
				isBorrower,
				connection.connection,
				wallet as Wallet,
				marketSeed
			);
			snackbarKey = notify("info", "CredixPass creation is being processed", undefined, true);
			const tx = await txPromise;
			notify("success", "CredixPass created successfully", tx);
			closeSnackbar(snackbarKey);
		} catch (err: any) {
			notify("error", `Transaction failed! ${err?.message}`);
			closeSnackbar(snackbarKey);
		}
	});

	const onChangePassHolder = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPassHolder(e.target.value);
	};

	const onChangeIsBorrower = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true" ? setIsBorrower(true) : setIsBorrower(false);
	};

	const onChangeIsUnderwriter = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true" ? setIsUnderwriter(true) : setIsUnderwriter(false);
	};

	return (
		<div>
			<h2>Issue credix pass</h2>
			<form onSubmit={onSubmit} className="row stake-form-column">
				<label className="stake-input-label">
					PassHolder Public Key
					<input
						name="holderPublicKey"
						type="text"
						value={passHolder}
						placeholder="Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL"
						onChange={onChangePassHolder}
						disabled={!wallet?.publicKey}
						className="stake-input borrower-pk credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Is Borrower
					<select
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						name="isBorrower"
						onChange={onChangeIsBorrower}
					>
						<option selected value="true">
							True
						</option>
						<option value="false">False</option>
					</select>
				</label>
				<br />
				<label className="stake-input-label">
					Is Underwriter
					<select
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						name="isUnderwriter"
						onChange={onChangeIsUnderwriter}
					>
						<option selected value="true">
							True
						</option>
						<option value="false">False</option>
					</select>
				</label>
				<br />
				<input
					type="submit"
					value={"Issue Credix Pass"}
					className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</form>
		</div>
	);
};
