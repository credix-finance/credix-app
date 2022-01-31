# Credix Client

Repository containing the FE application of Credix. If you want to see the working product on Solana devnet, go to [app.dev.credix.finance](https://app.dev.credix.finance), connect your wallet, get some SOL and USDC from [the spl-token-faucet](https://spl-token-faucet.com) and connect your wallet. If you want to spin up a local clients, follow the steps as outlined below.

# Development

## Configuration

A `.env` file will be read depending on what type of build you are running (see: [custom environment variables](https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used))

### Environment Variables

- `REACT_APP_CLUSTER` Defaults to localnet. Determines which cluster the app should target. options: localnet, devnet, mainnet
- `REACT_APP_PROGRAM_ID` Required for localnet. Determines which on-chain program the app should target
- `REACT_APP_RPC_ENDPOINT` Determines which rpc endpoint will be used to communicate with the cluster

### Environments

When you deploy a new build, be sure to change the clusterconfig in `src/config.ts` to reflect the deployed program's address.

#### Localnet

When using localnet, be sure to run a local test validator + the start.sh/setup.sh script as outlined in [the credix-programs repo](https://github.com/credix-finance/credix-programs). 

#### Devnet

Program address is [CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX](https://explorer.solana.com/address/CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX?cluster=devnet)
App can be found on: [app.dev.credix.finance](https://app.dev.credix.finance)

#### Mainnet

Program address is [CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX](https://explorer.solana.com/address/CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX).
App can be found on: [app.credix.finance](https://app.credix.finance)

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
