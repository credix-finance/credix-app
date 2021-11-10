export const multiAsync = <F extends (...args: any[]) => any>(
	func: F
): ((...funcArgs: Parameters<F>) => ReturnType<F>) => {
	let promise: ReturnType<any> | undefined;

	return (...args: Parameters<F>): ReturnType<any> => {
		if (!promise) {
			promise = func(...args);
		}

		return promise.finally(() => {
			promise = undefined;
		});
	};
};
