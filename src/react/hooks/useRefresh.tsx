import { useEffect } from "react";

let callbacks: Array<Function> = [];

export const useRefresh = (callback?: Function) => {
	useEffect(() => {
		if (callback) {
			callbacks.push(callback);
		}

		return () => {
			if (callback) {
				callbacks = callbacks.filter((c) => c !== callback);
			}
		};
	}, [callback]);

	const triggerRefresh = () => {
		callbacks.forEach((c) => c());
	};

	return triggerRefresh;
};
