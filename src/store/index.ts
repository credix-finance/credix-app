import createSagaMiddleware from "@redux-saga/core";
import { configureStore } from "@reduxjs/toolkit";
import { CurriedGetDefaultMiddleware } from "@reduxjs/toolkit/dist/getDefaultMiddleware";
import { SESSION_STORAGE } from "constants/sessionStorage.constants";

const storedState = sessionStorage.getItem(SESSION_STORAGE.STATE);
const initialState = (storedState && JSON.parse(storedState)) || undefined;

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
	reducer: {},
	middleware: (getDefaultMiddleware: CurriedGetDefaultMiddleware) =>
		getDefaultMiddleware().concat(sagaMiddleware),
	preloadedState: initialState,
});

// This allows us to retain state between refreshes
store.subscribe(() => {
	sessionStorage.setItem(SESSION_STORAGE.STATE, JSON.stringify(store.getState()));
});
