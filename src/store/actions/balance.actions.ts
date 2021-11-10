import { createAction } from "@reduxjs/toolkit";

enum BalanceActionTypes {
	USDC_BALANCE_RECEIVED = "[Balance] Balance received",
	ASYNC_ACTION = "async action",
	SYN = "asdf",
}

export const usdcBalanceReceivedActionCreator = createAction<number>(
	BalanceActionTypes.USDC_BALANCE_RECEIVED
);

export const asyncActionCreator = createAction<string>(BalanceActionTypes.ASYNC_ACTION);
export const asyncAction2Creator = createAction<string>(BalanceActionTypes.SYN);
