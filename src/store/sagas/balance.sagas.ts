import { asyncAction2Creator, asyncActionCreator } from "@actions/balance.actions";
import { put, call, takeLeading } from "@redux-saga/core/effects";

const asyncFn = () => new Promise((resolve) => setTimeout(() => resolve("done"), 1000));

const multiAsync = (asyncFn: () => Promise<any>) => {
	let promise: Promise<any> | undefined;

	return () => {
		if (!promise) {
			console.log("call async");
			promise = asyncFn();
		}

		return promise.finally(() => {
			promise = undefined;
		});
	};
};

const bla = multiAsync(asyncFn);

const b1 = async () => {
	console.log("b1 start");
	const v = await bla();
	console.log("b1", v);
};

const b2 = async () => {
	console.log("b2 start");
	const v = await bla();
	console.log("b2", v);
};

export function* test(action: ReturnType<typeof asyncActionCreator>) {
	yield call(b1);
	// yield call(b2);
}

export function* test2(action: ReturnType<typeof asyncAction2Creator>) {
	// yield call(b1);
	yield call(b2);
	yield put(asyncActionCreator("asdf"));
}

export function* balanceSaga() {
	yield takeLeading(asyncActionCreator.type, test);
	yield takeLeading(asyncAction2Creator.type, test2);
}
