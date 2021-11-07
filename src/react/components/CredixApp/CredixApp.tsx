import React from "react";
import { Provider } from "react-redux";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { store } from "store/index";
import { Routes } from "react/Routes";
import { clusterConfig } from "config";

function CredixApp() {
	console.log(clusterConfig);

	return (
		<ConnectionProvider endpoint={clusterConfig.RPCEndpoint}>
			<Provider store={store}>
				<Routes/>
			</Provider>
		</ConnectionProvider>
	);
}

export default CredixApp;
