const CracoAlias = require("craco-alias");

module.exports = {
	plugins: [
		{
			plugin: CracoAlias,
			options: {
				source: "tsconfig",
				baseUrl: "./src",
				tsConfigPath: "./tsconfig.extend.json"
			}
		}
	],
	jest: {
		configure(config) {
			config.transformIgnorePatterns = [
				"node_modules/(@toruslabs)/",
			];
			return config;
		},
	},
};
