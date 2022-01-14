import { defaultMarketPlace as defaultMarketplace } from "consts";
import { useParams } from "react-router-dom";

export const useMarketSeed = () => {
	const params = useParams();
	const storedMarketplace = sessionStorage.getItem("marketplace");
	const paramMarketplace =
		(params.marketplace !== "help" && params.marketplace !== "credix-pass" && params.marketplace) ||
		null;

	const marketplace = paramMarketplace || storedMarketplace;

	if (storedMarketplace !== marketplace && marketplace) {
		sessionStorage.setItem("marketplace", marketplace);
	}

	return marketplace || defaultMarketplace;
};
