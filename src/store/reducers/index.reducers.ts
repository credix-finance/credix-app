import { combineReducers } from "redux";
import { ApplicationState } from "types/state.types";
import { usdcBalanceReducer } from "./balance.reducers";

export const rootReducer = combineReducers<ApplicationState>({
	usdcBalance: usdcBalanceReducer,
});
