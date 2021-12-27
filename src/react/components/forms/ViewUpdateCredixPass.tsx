import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getCredixPassInfo, updateCredixPass } from "client/api";
import React, { useCallback, useEffect, useState } from "react";
import { useNotify } from "react/hooks/useNotify";
import { CredixPass } from "types/program.types";
import { serialAsync } from "utils/async.utils";
import "../../../styles/stakeform.scss";

export const ViewUpdateCredixPass = () => {
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const notify = useNotify();

	const [isBorrower, setIsBorrower] = useState<boolean>(false);
	const [isUnderwriter, setIsUnderwriter] = useState<boolean>(false);
	const [isActive, setIsActive] = useState<boolean>(false);

	const [passHolder, setPassHolder] = useState<string>("");
	const [credixPass, setCredixPass] = useState<CredixPass | null>();

	const fetchAndSetPassData = useCallback(
		async (publicKey: PublicKey) => {
			const credixPass = await getCredixPassInfo(
				publicKey,
				connection.connection,
				wallet as Wallet
			);
			setCredixPass(credixPass);
		},
		[connection.connection, wallet]
	);

	useEffect(() => {
		try {
			const passholderKey = new PublicKey(passHolder);
			fetchAndSetPassData(passholderKey);
			// eslint-disable-next-line no-empty
		} catch (e) {
			setCredixPass(null);
		}
	}, [passHolder, fetchAndSetPassData]);

	useEffect(() => {
		setIsActive(!!credixPass?.active);
		setIsBorrower(!!credixPass?.isBorrower);
		setIsUnderwriter(!!credixPass?.isUnderwriter);
	}, [credixPass]);

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		try {
			const holderPublicKey = new PublicKey(passHolder);

			await updateCredixPass(
				holderPublicKey,
				isActive,
				isUnderwriter,
				isBorrower,
				connection.connection,
				wallet as Wallet
			);
			notify("success", "CredixPass updated successfully");
		} catch (err: any) {
			notify("error", `Transaction failed! ${err?.message}`);
		}
	});

	const onPassHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		console.log("passholder", typeof passHolder);
		console.log("on change", e.target.value, typeof e.target.value);
		setPassHolder(e.target.value);
	};

	const onActiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true" ? setIsActive(true) : setIsActive(false);
	};

	const onBorrowerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true" ? setIsBorrower(true) : setIsBorrower(false);
	};

	const onUnderwriterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		e.target.value === "true" ? setIsUnderwriter(true) : setIsUnderwriter(false);
	};

	const submitButtonDisabled = () =>
		!!(
			credixPass &&
			credixPass.active === isActive &&
			credixPass.isBorrower === isBorrower &&
			credixPass.isUnderwriter === isUnderwriter
		);

	return (
		<div>
			<h2>Update credix pass</h2>
			<form onSubmit={onSubmit} className="row stake-form-column">
				<label className="stake-input-label">
					PassHolder Public Key
					<input
						name="holderPublicKey"
						type="text"
						value={passHolder}
						placeholder="CONNECT WALLET"
						onChange={onPassHolderChange}
						disabled={!wallet?.publicKey}
						className="stake-input borrower-pk credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Is Active
					<select
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						name="isActive"
						onChange={onActiveChange}
					>
						{isActive ? (
							<option selected value="true">
								True
							</option>
						) : (
							<option value="true">True</option>
						)}
						{isActive ? (
							<option value="false">False</option>
						) : (
							<option selected value="false">
								False
							</option>
						)}
						{credixPass === undefined ? (
							<option selected value="none">
								None
							</option>
						) : (
							<></>
						)}
					</select>
				</label>
				<br />
				<label className="stake-input-label">
					Is Borrower
					<select
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						name="isBorrower"
						onChange={onBorrowerChange}
					>
						{isBorrower ? (
							<option selected value="true">
								True
							</option>
						) : (
							<option value="true">True</option>
						)}
						{isBorrower ? (
							<option value="false">False</option>
						) : (
							<option selected value="false">
								False
							</option>
						)}
						{credixPass === undefined ? (
							<option selected value="none">
								None
							</option>
						) : (
							<></>
						)}
					</select>
				</label>
				<br />
				<label className="stake-input-label">
					Is Underwriter
					<select
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
						name="isUnderwriter"
						onChange={onUnderwriterChange}
					>
						{isUnderwriter ? (
							<option selected value="true">
								True
							</option>
						) : (
							<option value="true">True</option>
						)}
						{isUnderwriter ? (
							<option value="false">False</option>
						) : (
							<option selected value="false">
								False
							</option>
						)}
						{credixPass === undefined ? (
							<option selected value="none">
								None
							</option>
						) : (
							<></>
						)}
					</select>
				</label>
				<br />
				<input
					type="submit"
					value={"Update Credix Pass"}
					disabled={submitButtonDisabled()}
					className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</form>
		</div>
	);
};
