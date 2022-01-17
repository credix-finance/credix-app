import { Path } from "types/navigation.types";

export const navigationHelper = (navigate: Function, path: Path | string, market?: string) => {
	const route = market ? path.replace(":marketplace", market) : path;
	navigate(route);
};
