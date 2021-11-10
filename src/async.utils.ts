import { stringify } from "flatted";

export const multiAsync = <F extends (...args: any[]) => any>(
	func: F
): ((...funcArgs: Parameters<F>) => ReturnType<F>) => {
	let promises: Record<string, any> = {};

	return (...args: Parameters<F>): ReturnType<any> => {
		const key = stringify(args);

		if (!promises[key]) {
			promises[key] = func(...args).finally(() => {
				promises[key] = undefined;
			});
		}

		return promises[key];
	};
};
