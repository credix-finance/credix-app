export enum Path {
	ROOT = "/",
	OVERVIEW = "/:marketplace",
	DEALS = "/:marketplace/deals",
	DEALS_NEW = "/:marketplace/deals/new",
	DEALS_BORROWER = "/:marketplace/deals/:borrower",
	DEALS_BORROWER_NEW = "/:marketplace/deals/:borrower/new",
	DEALS_DETAIL = "/:marketplace/deals/:borrower/:deal",
	HELP = "/help",
	CREDIX_PASS = "/credix-pass",
	NOT_FOUND = "*",
}
