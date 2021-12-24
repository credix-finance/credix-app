import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom";
import { OverviewPage } from "@components/pages/OverviewPage";
import { Path } from "types/navigation.types";
import { DealsPage } from "@components/pages/DealsPage";
import { HelpPage } from "@components/pages/HelpPage";
import { CredixPass } from "@components/pages/CredixPass";
import { DealPage } from "@components/pages/DealPage";
import { NewDealPage } from "@components/pages/NewDealPage";

export const Routes = () => (
	<BrowserRouter>
		<RouterRoutes>
			<Route path={Path.HELP} element={<HelpPage />} />
			<Route path={Path.DEALS} element={<DealsPage />} />
			<Route path={Path.NEW_DEAL} element={<NewDealPage />} />
			<Route path={Path.DEAL} element={<DealPage />} />
			<Route path={Path.OVERVIEW} element={<OverviewPage />} />
			<Route path={Path.CREDIX_PASS} element={<CredixPass />} />
			<Route path={Path.NOT_FOUND} element={<p>There is nothing here.</p>} />
		</RouterRoutes>
	</BrowserRouter>
);
