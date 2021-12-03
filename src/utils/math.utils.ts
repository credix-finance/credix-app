export const round = (n: number) => {
	const m = Number((Math.abs(n) * 100).toPrecision(15));
	return (Math.round(m) / 100) * Math.sign(n);
};
