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
import { SnackbarProvider } from "notistack";

function CredixApp() {
	const wallets = useMemo(
		() => [getPhantomWallet(), getSolflareWallet(), getMathWallet(), getSolletWallet()],
		[]
	);

	return (
		<SnackbarProvider>
			<IntlProvider locale="en">
				<ConnectionProvider
					endpoint={config.clusterConfig.RPCEndpoint}
					config={{ commitment: config.confirmOptions.commitment }}
				>
					<WalletProvider wallets={wallets}>
						<WalletDialogProvider>
							<Provider store={store}>
								<Routes />
							</Provider>
						</WalletDialogProvider>
					</WalletProvider>
				</ConnectionProvider>
			</IntlProvider>
		</SnackbarProvider>
	);
}

export default CredixApp;
