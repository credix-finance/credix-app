import React, { useMemo } from "react";
import { Provider } from "react-redux";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { store } from "store/index";
import { Routes } from "react/Routes";
import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";
import {
	getMathWallet,
	getPhantomWallet,
	getSolflareWallet,
	getSolletWallet,
} from "@solana/wallet-adapter-wallets";
import { IntlProvider } from "react-intl";
import { config } from "config";

function CredixApp() {
	const wallets = useMemo(
		() => [getPhantomWallet(), getSolflareWallet(), getMathWallet(), getSolletWallet()],
		[]
	);

	return (
		<IntlProvider locale="en">
			<ConnectionProvider endpoint={config.clusterConfig.RPCEndpoint}>
				<WalletProvider wallets={wallets}>
					<WalletDialogProvider>
						<Provider store={store}>
							<Routes />
						</Provider>
					</WalletDialogProvider>
				</WalletProvider>
			</ConnectionProvider>
		</IntlProvider>
	);
}

export default CredixApp;
