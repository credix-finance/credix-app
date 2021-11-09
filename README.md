# Credix Client

Repository containing the FE application of Credix. If you want to see the working product on Solana testnet, go to [app.credix.finance](https://app.credix.finance), connect your wallet, get some SOL from [this faucet](https://www.solfaucet.com), get some USDC from [this faucet](https://www.usdcfaucet.com) and connect your wallet. If you want to spin up a local clients, follow the steps as outlined below.

# Development

## Configuration

A `.env` file will be read depending on what type of build you are running (see: [custom environment variables](https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used))

### Environment Variables

- `REACT_APP_CLUSTER` Defaults to localnet. Determines which cluster the app should target. options: localnet, testnet
- `REACT_APP_PROGRAM_ID` Required for localnet. Determines which on-chain program the app should target
- `REACT_APP_RPC_ENDPOINT` Determines which rpc endpoint will be used to communicate with the cluster

### Environments

#### Localnet

When using localnet, be sure to run

```sh
$ solana-test-validator
```

This will spin up a local validator that our client interacts with. More info on setting up a local validator can be found [here](https://docs.solana.com/developing/test-validator).

#### Testnet

Our program is also deployed on testnet. The program address is `7xxjTaGoqD9vTGGD2sr4krbKBozKrwQSB4GLsXsV5SYW`. When you deploy a new build to testnet, be sure to change the testnet clusterconfig in `src/config.ts` to reflect the deployed program's address.

The request limits on testnet are the following.

```
Maximum number of requests per 10 seconds per IP: 100
Maximum number of requests per 10 seconds per IP for a single RPC: 40
Maximum concurrent connections per IP: 40
Maximum connection rate per 10 seconds per IP: 40
```

## Editors

We use eslint and prettier to lint and format our codebase. An editorconfig file is also provided.

### Visual Studio Code

#### Extensions

- [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

##### Optional but recommended

- [Formatting Toggle](https://marketplace.visualstudio.com/items?itemName=tombonnike.vscode-status-bar-format-toggle) A VS Code extension that allows you to toggle formatting settings ON and OFF with a simple click.

# Usage

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

:warning: Ejecting should not be necessary as we are using [craco](https://github.com/risenforces/craco-alias) to override configs.
