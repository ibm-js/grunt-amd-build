define([
	'intern!object',
	'intern/chai!assert'
], function (registerSuite, assert) {
	// Workaround problem with relative paths and dojo/node
	var normalizeConfig = require.nodeRequire("../../../tasks/lib/normalizeConfig");

	var config;
	registerSuite({
		name: 'Loader config normalization',

		'baseUrl': function () {
			config = normalizeConfig.loader({});
			assert.strictEqual(config.baseUrl, "./", "default baseUrl is current directory");

			config = normalizeConfig.loader({
				baseUrl: "this/test"
			});
			assert.strictEqual(config.baseUrl, "this/test/", "baseUrl should end with a /");

			config = normalizeConfig.loader({
				baseUrl: "this\\test\\"
			});
			assert.strictEqual(config.baseUrl, "this/test/", "baseUrl should use / as a separator");
		},

		'packages': function () {
			config = normalizeConfig.loader({});
			assert.isArray(config.packages, "default packages is an array");
			assert.isObject(config.pkgs, "empty config should generate an object");
			assert.strictEqual(config.packages.length, 0, "default packages should be empty");


			config = normalizeConfig.loader({
				packages: []
			});
			assert.isObject(config.pkgs, "empty packages should generate a pkgs object");

			config = normalizeConfig.loader({
				packages: [{}]
			});
			assert.isUndefined(config.pkgs.undefined, "unnamed packages are not valid");

			config = normalizeConfig.loader({
				packages: ["test/pack"]
			});
			assert.strictEqual(config.pkgs["test/pack"], "test/pack/main", "pkgs should keep a handle to main");

			config = normalizeConfig.loader({
				packages: [{
					name: "test/pack"
				}]
			});
			assert.strictEqual(config.pkgs["test/pack"], "test/pack/main", "pkgs should keep a handle to main");

			config = normalizeConfig.loader({
				packages: [{
					name: "test/pack",
					location: "testloc"
				}]
			});
			assert.strictEqual(config.pkgs["test/pack"], "test/pack/main", "name should not be changed");
			assert.strictEqual(config.paths["test/pack"], "testloc", "location should be registered in paths");

			config = normalizeConfig.loader({
				packages: [{
					name: "test/pack",
					main: "testmain"
				}]
			});
			assert.strictEqual(config.pkgs["test/pack"], "test/pack/testmain", "name should not be changed");
		},
		'others': function () {
			config = normalizeConfig.loader({});
			assert.isObject(config.map, "map should be initialized like {}");

			config = normalizeConfig.loader({
				map: {
					"could": "be any string"
				}
			});
			assert.strictEqual(config.map.could, "be any string", "map should just be copied");


			config = normalizeConfig.loader({});
			assert.isObject(config.paths, "paths should be initialized like {}");

			config = normalizeConfig.loader({
				paths: {
					"could": "be any string"
				}
			});
			assert.strictEqual(config.paths.could, "be any string", "paths should just be copied");

		},
		'shim': function () {
			config = normalizeConfig.loader({
				shim: {
					"test": {
						deps: ["toto", "titi"]
					}
				}
			});
			assert.sameMembers(config.shim.test.deps, ["toto", "titi"], "deps should just be copied");

			config = normalizeConfig.loader({
				shim: {
					"test": {
						exports: "tata"
					}
				}
			});
			assert.strictEqual(config.shim.test.exports, "tata", "exports should just be copied");


			config = normalizeConfig.loader({
				shim: {
					"test": ["toto", "titi"]
				}
			});
			assert.sameMembers(config.shim.test.deps, ["toto", "titi"], "short notation for deps should be expanded");
		}
	});

	registerSuite({
		name: 'Build config normalization',

		'dir': function () {
			config = normalizeConfig.build({});
			assert.strictEqual(config.dir, "./tmp/", "default output directory is './dist/'");

			config = normalizeConfig.build({
				dir: "this/test"
			});
			assert.strictEqual(config.dir, "this/test/", "dir should end with a /");

			config = normalizeConfig.build({
				dir: "this\\test\\"
			});
			assert.strictEqual(config.dir, "this/test/", "dir should use / as a separator");
		},

		'layers': function () {
			config = normalizeConfig.build({});
			assert.isArray(config.layers, "empty config should generate an array");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay"
				}]
			});
			assert.isArray(config.layers[0].exclude, "empty config should generate exclude array");
			assert.isArray(config.layers[0].excludeShallow, "empty config should generate excludeShallow array");
			assert.isArray(config.layers[0].excludeFiles, "empty config should generate excludeFiles array");
			assert.isArray(config.layers[0].excludeLayers, "empty config should generate excludeLayers array");
			assert.isArray(config.layers[0].include, "empty config should generate include array");
			assert.isArray(config.layers[0].includeShallow, "empty config should generate includeShallow array");
			assert.isArray(config.layers[0].includeFiles, "empty config should generate includeFiles array");
			assert.isArray(config.layers[0].includeLayers, "empty config should generate includeLayers array");
			assert.strictEqual(config.layers[0].outputPath, "testlay.js", "default outputPath is layer name + .js");
			assert.strictEqual(config.layers[0].header, "", "default header is empty");
			assert.isObject(config.layers[0].modules, "modules should be initialized as an empty object");
			assert.isObject(config.layers[0].plugins, "plugins should be initialized as an empty object");
			assert.isObject(config.layers[0].pluginsFiles, "pluginsFiles should be initialized as an empty object");
			assert.isObject(config.layersByName, "There should be an object mapping the layers by name");
			assert.isObject(config.layersByName.testlay, "layers by name map should contain testlay");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					include: ["testinc"]
				}]
			});
			assert.strictEqual(config.layers[0].include[0], "testinc", "include should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					exclude: ["testex"]
				}]
			});
			assert.strictEqual(config.layers[0].exclude[0], "testex", "exclude should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					includeShallow: ["testinc"]
				}]
			});
			assert.strictEqual(config.layers[0].includeShallow[0], "testinc",
				"includeShallow should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					excludeShallow: ["testex"]
				}]
			});
			assert.strictEqual(config.layers[0].excludeShallow[0], "testex",
				"excludeShallow should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					includeFiles: ["testinc"]
				}]
			});
			assert.strictEqual(config.layers[0].includeFiles[0], "testinc", "includeFiles should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					excludeFiles: ["testex"]
				}]
			});
			assert.strictEqual(config.layers[0].excludeFiles[0], "testex", "excludeFiles should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					includeLayers: ["testinc"]
				}]
			});
			assert.strictEqual(config.layers[0].includeLayers[0], "testinc", "includeLayers should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					excludeLayers: ["testex"]
				}]
			});
			assert.strictEqual(config.layers[0].excludeLayers[0], "testex", "excludeLayers should not be overwritten");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay"
				}],
				dir: "testdir"
			});
			assert.strictEqual(config.layers[0].outputPath, "testlay.js", "the outputPath is layername+.js");

			config = normalizeConfig.build({
				layers: [{
					name: "testlay",
					header: "testhead"
				}]
			});
			assert.strictEqual(config.layers[0].header, "testhead", "the header should not be overwritten");
		},
		'runtimePlugins': function () {
			config = normalizeConfig.build({});
			assert.isArray(config.runtimePlugins, "runtimePlugins should be initialized with dojo plugins");

			config = normalizeConfig.build({
				runtimePlugins: ["testru"]
			});
			assert.strictEqual(config.runtimePlugins[0], "testru", "runtimePlugins should not be overwritten");
			assert.isTrue(config.runtimePlugins.indexOf("dojo/has") > 0,
				"default runtimePlugins should be merge with user provided ones.");
		},
		'buildPlugins': function () {
			config = normalizeConfig.build({});
			assert.isTrue(config.buildPlugins, "buildPlugins should be initialized with true");

			config = normalizeConfig.build({
				buildPlugins: false
			});
			assert.isFalse(config.buildPlugins, "buildPlugins should not be overwritten");
		}
	});
});
