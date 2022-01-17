import { HashRouter, Navigate, Route, Routes as RouterRoutes } from "react-router-dom";
import { OverviewPage } from "@components/pages/OverviewPage";
import { Path } from "types/navigation.types";
import { DealsPage } from "@components/pages/DealsPage";
import { HelpPage } from "@components/pages/HelpPage";
import { CredixPassPage } from "@components/pages/CredixPass";
import { DealPage } from "@components/pages/DealPage";
import { NewDealPage } from "@components/pages/NewDealPage";
import { defaultMarketPlace } from "consts";

export const Routes = () => (
	<HashRouter>
		<RouterRoutes>
			<Route path={Path.OVERVIEW} element={<OverviewPage />} />
			<Route path={Path.DEALS} element={<DealsPage />} />
			<Route path={Path.DEALS_BORROWER} element={<DealsPage />} />
			<Route path={Path.DEALS_NEW} element={<NewDealPage />} />
			<Route path={Path.DEALS_BORROWER_NEW} element={<NewDealPage />} />
			<Route path={Path.DEALS_DETAIL} element={<DealPage />} />
			<Route path={Path.HELP} element={<HelpPage />} />
			<Route path={Path.CREDIX_PASS} element={<CredixPassPage />} />
			<Route
				path={Path.ROOT}
				element={<Navigate to={Path.OVERVIEW.replace(":marketplace", defaultMarketPlace)} />}
			/>
			<Route path={Path.NOT_FOUND} element={<p>There is nothing here.</p>} />
			<Route path={"*"} element={<p>There is nothing here.</p>} />
		</RouterRoutes>
	</HashRouter>
);
