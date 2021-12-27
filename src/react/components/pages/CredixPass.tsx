import { IssueCredixPass } from "@components/forms/IssueCredixPass";
import { AppLayout } from "@components/layouts/AppLayout";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { MANAGEMENT_KEYS } from "consts";
import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/credixpass.scss";
import { Path } from "types/navigation.types";
import { ViewUpdateCredixPass } from "@components/forms/ViewUpdateCredixPass";
import { CredixButton } from "@components/buttons/CredixButton";

export const CredixPass = () => {
	const wallet = useAnchorWallet();
	const navigate = useNavigate();
	const [issueCredixPass, setIssueCredixPass] = useState<boolean>(true);
	useEffect(() => {
		if (wallet?.publicKey) {
			if (!MANAGEMENT_KEYS.includes(wallet.publicKey.toString())) {
				navigate(Path.OVERVIEW);
			}
		}
	}, [wallet?.publicKey]);

	return (
		<AppLayout>
			<div className="row credixpass-view-switch">
				<CredixButton text="Create Credix Pass" onClick={() => setIssueCredixPass(true)} />
				<CredixButton text="Update CredixPass" onClick={() => setIssueCredixPass(false)} />
			</div>
			<div className="credix-pass-containter">
				{issueCredixPass ? <IssueCredixPass /> : <ViewUpdateCredixPass />}
			</div>
		</AppLayout>
	);
};
