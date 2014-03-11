define([
    'intern!object',
    'intern/chai!assert',
    'intern/dojo/node!../../tasks/lib/normalizeConfig'
], function (registerSuite, assert, normalizeConfig) {
	var config;
    registerSuite({
        name: 'Loader config normalization',

        'baseUrl': function () {
			config = normalizeConfig.loader({});
			assert.strictEqual(config.baseUrl, "./", "default baseUrl is current directory");
			
			config = normalizeConfig.loader({baseUrl: "this/test"});
			assert.strictEqual(config.baseUrl, "this/test/", "baseUrl should end with a /");

			config = normalizeConfig.loader({baseUrl: "this\\test\\"});
			assert.strictEqual(config.baseUrl, "this/test/", "baseUrl should use / as a separator");
		},
		
		'packages': function () {
			config = normalizeConfig.loader({});
			assert.isArray(config.packages, "default packages is an array");
			assert.isObject(config.pkgs, "empty config should generate an object");
			assert.strictEqual(config.packages.length, 0, "default packages should be empty");
			
			
			config = normalizeConfig.loader({packages: []});
			assert.isObject(config.pkgs, "empty packages should generate a pkgs object");
			
			config = normalizeConfig.loader({packages: [{}]});
			assert.isUndefined(config.pkgs.undefined, "unnamed packages are not valid");

			config = normalizeConfig.loader({packages: ["test/pack"]});
			assert.strictEqual(config.pkgs["test/pack"].name, "test/pack", "name should be normalized in an object");
			assert.strictEqual(config.pkgs["test/pack"].location, "test/pack", "default location is name");
			assert.strictEqual(config.pkgs["test/pack"].main, "main", "default main is 'main'");
			
			config = normalizeConfig.loader({packages: [{name: "test/pack"}]});
			assert.strictEqual(config.pkgs["test/pack"].name, "test/pack", "name should not be changed");
			assert.strictEqual(config.pkgs["test/pack"].location, "test/pack", "default location is name");
			assert.strictEqual(config.pkgs["test/pack"].main, "main", "default main is 'main'");

			config = normalizeConfig.loader({packages: [{name: "test/pack", location: "testloc"}]});
			assert.strictEqual(config.pkgs["test/pack"].name, "test/pack", "name should not be changed");
			assert.strictEqual(config.pkgs["test/pack"].location, "testloc", "location should not be changed");
			assert.strictEqual(config.pkgs["test/pack"].main, "main", "default main is 'main'");

			config = normalizeConfig.loader({packages: [{name: "test/pack", main: "testmain"}]});
			assert.strictEqual(config.pkgs["test/pack"].name, "test/pack", "name should not be changed");
			assert.strictEqual(config.pkgs["test/pack"].location, "test/pack", "default location is name");
			assert.strictEqual(config.pkgs["test/pack"].main, "testmain", "main should not be changed");
		},
		'others': function () {
			config = normalizeConfig.loader({});
			assert.isObject(config.map, "map should be initialized like {}");
			
			config = normalizeConfig.loader({map: {"could": "be any string"}});
			assert.strictEqual(config.map["could"], "be any string", "map should just be copied");
			
			
			config = normalizeConfig.loader({});
			assert.isObject(config.paths, "paths should be initialized like {}");
			
			config = normalizeConfig.loader({paths: {"could": "be any string"}});
			assert.strictEqual(config.paths["could"], "be any string", "paths should just be copied");
			
		}
    });
	
	registerSuite({
        name: 'Build config normalization',

        'dir': function () {
			config = normalizeConfig.build({});
			assert.strictEqual(config.dir, "./tmp/", "default output directory is './dist/'");
			
			config = normalizeConfig.build({dir: "this/test"});
			assert.strictEqual(config.dir, "this/test/", "dir should end with a /");

			config = normalizeConfig.build({dir: "this\\test\\"});
			assert.strictEqual(config.dir, "this/test/", "dir should use / as a separator");
		},
		
		'layers': function () {
			config = normalizeConfig.build({});
			assert.isObject(config.layers, "empty config should generate an object");
			
			config = normalizeConfig.build({layers: {testlay: {}}});
			assert.isArray(config.layers.testlay.exclude, "empty config should generate exclude array");
			assert.isArray(config.layers.testlay.include, "empty config should generate include array");
			assert.strictEqual(config.layers.testlay.include[0], "testlay", "The layer name should be included");
			assert.strictEqual(config.layers.testlay.outputPath, "./tmp/testlay.js", "default outputPath is default dir + layer name + .js");
			assert.strictEqual(config.layers.testlay.header, "", "default header is empty");
			assert.isObject(config.layers.testlay.modules, "modules should be initialized as an empty object");
			assert.isObject(config.layers.testlay.plugins, "plugins should be initialized as an empty object");
			assert.isObject(config.layers.testlay.pluginsFiles, "pluginsFiles should be initialized as an empty object");

			config = normalizeConfig.build({layers: {testlay: {include: ["testinc"]}}});
			assert.strictEqual(config.layers.testlay.include[0], "testinc", "include should not be overwritten");
			assert.strictEqual(config.layers.testlay.include[1], "testlay", "include should contain the layer name");
			
			config = normalizeConfig.build({layers: {testlay: {exclude: ["testex"]}}});
			assert.strictEqual(config.layers.testlay.exclude[0], "testex", "exclude should not be overwritten");

			config = normalizeConfig.build({layers: {testlay: {}}, dir: "testdir"});
			assert.strictEqual(config.layers.testlay.outputPath, "testdir/testlay.js", "the outputPath is dir+layername+.js");
			
			config = normalizeConfig.build({layers: {testlay: {header: "testhead"}}});
			assert.strictEqual(config.layers.testlay.header, "testhead", "the header should not be overwritten");
		},
		'runtimePlugins': function () {
			config = normalizeConfig.build({});
			assert.isArray(config.runtimePlugins, "runtimePlugins should be initialized like []");
			
			config = normalizeConfig.build({runtimePlugins: ["testru"]});
			assert.strictEqual(config.runtimePlugins[0], "testru", "runtimePlugins should not be overwritten");
		}
    });
});