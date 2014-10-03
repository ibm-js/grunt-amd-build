require.config({
	baseUrl: "./build/bower_components/",

	packages: [{
		name: "myapp",
		location: "../myapp"
	},{
		name: "mypackage",
		location: "../mylocalpackage"
	}],

	map: {
		"mypackage/foo": {
			"mypackage/bar": "../bar-mapped"
		}
	},

	paths: {
		"css": "../css",
		"mypackage/foo": "../patch/foo"
	},

	config: {
		"requirejs-dplugins/i18n": {
			locale: "fr-fr"
		}
	}
});