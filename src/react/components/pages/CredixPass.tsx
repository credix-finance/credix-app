import { CredixPassCreateForm } from "@components/forms/CredixPassCreateForm";
import { AppLayout } from "@components/layouts/AppLayout";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { config } from "config";
import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/credixpass.scss";
import { Path } from "types/navigation.types";
import { CredixPassUpdateForm } from "@components/forms/CredixPassUpdateForm";
import { CredixButton } from "@components/buttons/CredixButton";
import { useMarketSeed } from "react/hooks/useMarketSeed";
import { navigationHelper } from "utils/navigation.utils";

export const CredixPassPage = () => {
	const wallet = useAnchorWallet();
	const navigate = useNavigate();
	const [issueCredixPass, setIssueCredixPass] = useState<boolean>(true);
	const marketSeed = useMarketSeed();

	useEffect(() => {
		if (wallet?.publicKey) {
			if (!config.managementKeys.includes(wallet.publicKey.toString())) {
				navigationHelper(navigate, Path.OVERVIEW, marketSeed);
			}
		}
	}, [wallet?.publicKey, navigate, marketSeed]);

	return (
		<AppLayout>
			<div className="row credixpass-view-switch">
				<CredixButton text="Create Credix Pass" onClick={() => setIssueCredixPass(true)} />
				<CredixButton text="Update CredixPass" onClick={() => setIssueCredixPass(false)} />
			</div>
			<div className="credix-pass-containter">
				{issueCredixPass ? <CredixPassCreateForm /> : <CredixPassUpdateForm />}
			</div>
		</AppLayout>
	);
};
