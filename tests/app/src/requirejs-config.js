require.config({
	baseUrl: "./bower_components/",
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
		"mypackage/foo": "../patch/foo",
		"angular": "angular/angular",
		"angular-loader": "angular-loader/angular-loader"
	},
	shim: {
		'angular': {
			exports: 'angular',
			deps: ['angular-loader']
		},
		'angular-loader': {
		}
	},
	
	config: {
		"requirejs-dplugins/i18n": {
			locale: "fr-fr"
		}
	}
});