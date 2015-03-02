define({
	loader: {
		baseUrl: "./",
	},

	useLoader: {
		"host-node": "requirejs"
	},

	// Non-functional test suite(s) to run in nodeJS.
	suites: [
		"tests/config",
		"tests/modulesStack",
		"tests/modules"
	],

	// A regular expression matching URLs to files that should not be included in code coverage analysis
	excludeInstrumentation: /^(?:tests|node_modules)/
});
