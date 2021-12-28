export enum Path {
	OVERVIEW = "/",
	DEALS = "/deals",
	DEALS_NEW = "/deals/new",
	DEALS_BORROWER = "/deals/:borrower",
	DEALS_BORROWER_NEW = "/deals/:borrower/new",
	DEALS_DETAIL = "/deals/:borrower/:deal",
	HELP = "/help",
	CREDIX_PASS = "/credix-pass",
	NOT_FOUND = "/*",
}
