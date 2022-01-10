import { Wallet } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { serialAsync } from "utils/async.utils";
import React, { useCallback, useEffect, useState } from "react";
import { useNotify } from "react/hooks/useNotify";
import "../../../styles/stakeform.scss";
import { PublicKey } from "@solana/web3.js";
import { useRefresh } from "react/hooks/useRefresh";
import {
	activateDeal,
	createDeal,
	getBorrowerInfoAccountData,
	getLiquidityPoolBalance,
} from "client/api";
import { useNavigate } from "react-router-dom";
import { Path } from "types/navigation.types";
import Big from "big.js";
import { ZERO } from "utils/math.utils";
import { formatUIAmount, toProgramAmount, toUIAmount } from "utils/format.utils";
import { config } from "../../../config";
import { SolanaCluster } from "../../../types/solana.types";
import { useIntl } from "react-intl";

interface Props {
	borrower?: PublicKey;
	disabled?: boolean;
}

export const CreateDealForm = (props: Props) => {
	const intl = useIntl();
	const wallet = useAnchorWallet();
	const connection = useConnection();
	const [principal, setPrincipal] = useState<Big | undefined>();
	const [liquidityPoolBalance, setLiquidityPoolBalance] = useState<Big>(ZERO);
	const [financingFee, setFinancingFee] = useState<number | undefined>();
	const [timeToMaturity, setTimeToMaturity] = useState<number | undefined>();
	const [borrower, setBorrower] = useState<string>("");
	const [dealname, setDealName] = useState<string>("");
	const [placeholder, setPlaceholder] = useState<string>("CONNECT WALLET");
	const [dealNamePlaceholder, setDealNamePlaceholder] = useState<string>("CONNECT WALLET");
	const [publicKeyPlaceholder, setPublicKeyPlaceholder] = useState<string>("CONNECT WALLET");
	const notify = useNotify();
	const triggerRefresh = useRefresh();
	const navigate = useNavigate();

	const updateLiquidityPoolBalance = useCallback(async () => {
		const balance = await getLiquidityPoolBalance(connection.connection, wallet as Wallet);
		setLiquidityPoolBalance(balance);
	}, [connection.connection, wallet]);

	useEffect(() => {
		if (wallet?.publicKey && connection.connection) {
			setPlaceholder("0");
			setPublicKeyPlaceholder(wallet.publicKey.toString());
			setDealNamePlaceholder("SERIES A");

			updateLiquidityPoolBalance();
		} else {
			setPlaceholder("CONNECT WALLET");
			setPublicKeyPlaceholder("CONNECT WALLET");
			setDealNamePlaceholder("CONNECT WALLET");
		}
	}, [connection.connection, wallet?.publicKey, updateLiquidityPoolBalance]);

	const onSubmit = serialAsync(async (e: React.SyntheticEvent) => {
		e.preventDefault();

		if (!borrower) {
			notify("error", "Need borrower to submit");
			return;
		}

		if (!principal || principal.eq(ZERO)) {
			notify("error", "Need principal to submit");
			return;
		}

		if (!financingFee) {
			notify("error", "Need financing fee to submit");
			return;
		}

		if (!timeToMaturity) {
			notify("error", "Need time to maturity to submit");
			return;
		}

		if (timeToMaturity % 30) {
			notify("error", "Time to maturity needs to be a multiple of 30");
			return;
		}

		try {
			const borrowerPK = new PublicKey(borrower);

			// TODO: move this into the createDeal function?
			const borrowerInfoAccountData = await getBorrowerInfoAccountData(
				connection.connection,
				wallet as Wallet,
				borrowerPK
			);

			const dealNumber = (borrowerInfoAccountData && borrowerInfoAccountData.numOfDeals) || 0;

			await createDeal(
				principal,
				financingFee,
				timeToMaturity,
				borrowerPK,
				dealNumber,
				dealname,
				connection.connection,
				wallet as Wallet
			);
			notify("success", "Deal created successfully");

			// only automatically activate deal on localnet
			if (config.clusterConfig.name === SolanaCluster.LOCALNET) {
				await activateDeal(borrowerPK, dealNumber, connection.connection, wallet as Wallet);
				notify("success", "Deal activated successfully");
			}

			triggerRefresh();
			navigate(Path.DEALS);
		} catch (err: any) {
			notify("error", `Transaction failed! ${err?.message}`);
		}
	});

	const canSubmit = () => {
		let validKey = false;

		try {
			new PublicKey(borrower);
			validKey = true;
		} catch (e) {
			validKey = false; // can't have an empty block..
		}

		return (
			wallet?.publicKey &&
			principal &&
			financingFee &&
			borrower &&
			validKey &&
			!props.disabled &&
			timeToMaturity &&
			!(timeToMaturity % 30)
		);
	};

	const onChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		setter: (val: number | undefined) => any
	) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		setter(newValue);
	};

	const onChangePrincipal = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value === "" ? undefined : Number(e.target.value);
		const newPrincipal = newValue === undefined ? newValue : toProgramAmount(new Big(newValue));

		setPrincipal(newPrincipal);
	};

	const onChangeFinancingFee = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setFinancingFee);
	};

	const onChangeBorrower = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBorrower(e.target.value);
	};

	const onChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDealName(e.target.value);
	};

	const onChangeTimeToMaturity = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e, setTimeToMaturity);
	};

	const onBlurPrincipal = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (principal) {
			if (principal.gt(liquidityPoolBalance)) {
				setPrincipal(liquidityPoolBalance);
			}
		}
	};

	const onBlurTimeToMaturity = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (timeToMaturity) {
			setTimeToMaturity(Math.ceil(timeToMaturity / 30) * 30);
		}
	};

	return (
		<div>
			<h2>New Deal</h2>
			<form onSubmit={onSubmit} className="row stake-form-column">
				<label className="stake-input-label">
					Borrower Public Key
					<input
						name="borrowerPublicKey"
						type="text"
						value={props.borrower?.toString() || borrower}
						placeholder={publicKeyPlaceholder}
						onChange={onChangeBorrower}
						disabled={!wallet?.publicKey || props.disabled || !!props.borrower}
						className="stake-input borrower-pk credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Deal Name
					<input
						name="dealName"
						type="text"
						value={dealname}
						placeholder={dealNamePlaceholder}
						onChange={onChangeName}
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input borrower-pk credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Principal
					<p>
						The total amount of USDC to borrow, borrow limit:{" "}
						{formatUIAmount(liquidityPoolBalance, Big.roundDown, intl.formatNumber)} USDC
					</p>
					<input
						name="principal"
						type="number"
						value={principal === undefined ? "" : toUIAmount(principal).toNumber()}
						placeholder={placeholder}
						onChange={onChangePrincipal}
						onBlur={onBlurPrincipal}
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Financing fee %
					<p>The percentage on top of the principal that needs to be repaid as interest (APR)</p>
					<input
						name="financingFee"
						type="number"
						value={financingFee === undefined ? "" : financingFee}
						placeholder={placeholder}
						onChange={onChangeFinancingFee}
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<label className="stake-input-label">
					Time to maturity (days)
					<p>How many days before you have to pay back the principal</p>
					<input
						name="timeToMaturity"
						type="number"
						step={30}
						value={timeToMaturity === undefined ? "" : timeToMaturity}
						placeholder={placeholder}
						onChange={onChangeTimeToMaturity}
						onBlur={onBlurTimeToMaturity}
						disabled={!wallet?.publicKey || props.disabled}
						className="stake-input credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
					/>
				</label>
				<br />
				<input
					type="submit"
					disabled={!canSubmit()}
					value={props.disabled ? "Max deals reached" : "Create Deal"}
					className="stake-submit credix-button MuiButtonBase-root MuiButton-root MuiButton-contained MuiButton-containedPrimary balance-button"
				/>
			</form>
		</div>
	);
};
