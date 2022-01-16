import { defaultMarketPlace as defaultMarketplace, NON_MARKET_PLACE_ROUTES } from "consts";
import { useParams } from "react-router-dom";

export const useMarketSeed = () => {
	const params = useParams();
	const storedMarketplace = sessionStorage.getItem("marketplace");
	const paramMarketplace =
		params.marketplace && !NON_MARKET_PLACE_ROUTES.includes(params.marketplace)
			? params.marketplace
			: null;

	const marketplace = paramMarketplace || storedMarketplace;

	if (storedMarketplace !== marketplace && marketplace) {
		sessionStorage.setItem("marketplace", marketplace);
	}

	return marketplace || defaultMarketplace;
};
