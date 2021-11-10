import { usdcBalanceReceivedActionCreator } from "@actions/balance.actions";
import { createReducer } from "@reduxjs/toolkit";

export const usdcBalanceReducer = createReducer<number>(0, (builder) => {
	builder.addCase(usdcBalanceReceivedActionCreator, (_, action) => action.payload);
});
