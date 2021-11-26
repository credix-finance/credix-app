import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom";
import { OverviewPage } from "@components/pages/OverviewPage";
import { Path } from "types/navigation.types";
import { DealsPage } from "@components/pages/DealsPage";
import { HelpPage } from "@components/pages/HelpPage";

export const Routes = () => (
	<BrowserRouter>
		<RouterRoutes>
			<Route path={Path.HELP} element={<HelpPage />} />
			<Route path={Path.DEALS} element={<DealsPage />} />
			<Route path={Path.OVERVIEW} element={<OverviewPage />} />
		</RouterRoutes>
	</BrowserRouter>
);
