import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom";
import { OverviewPage } from "@components/pages/OverviewPage";
import { Path } from "types/navigation.types";

export const Routes = () => (
	<BrowserRouter>
		<RouterRoutes>
			<Route path={Path.OVERVIEW} element={<OverviewPage />} />
		</RouterRoutes>
	</BrowserRouter>
);
