import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom";
import { OverviewPage } from "@components/pages/OverviewPage";
import { Path } from "types/navigation.types";
import { DealsPage } from "@components/pages/DealsPage";
import { HelpPage } from "@components/pages/HelpPage";
import { DealPage } from "@components/pages/DealPage";
import { NewDealPage } from "@components/pages/NewDealPage";

export const Routes = () => (
	<BrowserRouter>
		<RouterRoutes>
			<Route path={Path.HELP} element={<HelpPage />} />

			<Route path={Path.DEALS} element={<DealsPage />} />
			<Route path={Path.DEALS_BORROWER} element={<DealsPage />} />
			<Route path={Path.DEALS_NEW} element={<NewDealPage />} />
			<Route path={Path.DEALS_BORROWER_NEW} element={<NewDealPage />} />
			<Route path={Path.DEALS_DETAIL} element={<DealPage />} />

			<Route path={Path.OVERVIEW} element={<OverviewPage />} />
			<Route path={Path.NOT_FOUND} element={<p>There is nothing here.</p>} />
		</RouterRoutes>
	</BrowserRouter>
);
