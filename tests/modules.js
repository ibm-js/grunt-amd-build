define([
	'intern!object',
	'intern/chai!assert',
	'intern/dojo/node!../../tasks/lib/utils',
	'intern/dojo/node!../../tasks/lib/modules',
	'intern/dojo/node!requirejs',
	'intern/dojo/node!fs'
], function (registerSuite, assert, getUtils, getModules, requirejs, fs) {

	var utils = getUtils({
		baseUrl: "./",
		packages: [{
			name: "modules",
			location: "tests/modules"
		}]
	});
	requirejs.config({
		baseUrl: "./",
		packages: [{
			name: "modules",
			location: "tests/modules"
		}]
	});
	var contentCustNorm = fs.readFileSync("tests/modules/custNorm.js").toString();


	registerSuite({
		name: 'normalize',

		'no reference': function () {
			var lib = getModules(requirejs, utils);
			assert.strictEqual(lib.getNormalize()("./toto"),
				"toto",
				"./ is top level");
			assert.strictEqual(lib.getNormalize()("toto!"),
				"toto",
				"empty resource so nothing to normalize.");
			// No plugin normalize
			assert.strictEqual(lib.getNormalize()("modules/noNorm!./test"),
				"modules/noNorm!test",
				"./ is top level");
			// Default normalize
			assert.strictEqual(lib.getNormalize()("modules/defNorm!./test"),
				"modules/defNorm!test",
				"./ is top level");
			// Custom normalize
			assert.strictEqual(lib.getNormalize()("modules/custNorm!test"),
				"modules/custNorm!custom/test",
				"Should use the plugin provided normalize");
		},

		'with reference': function () {
			var lib = getModules(requirejs, utils);
			assert.strictEqual(lib.getNormalize("titi/blabla")("./toto"),
				"titi/toto",
				"./ is relative to titi");
			assert.strictEqual(lib.getNormalize("titi/blabla")("../toto"),
				"toto",
				"../ is sibling of titi");
			// No plugin normalize
			assert.strictEqual(lib.getNormalize("titi/blabla")("modules/noNorm!./test"),
				"modules/noNorm!titi/test",
				"./ is relative to titi");
			assert.strictEqual(lib.getNormalize("titi/blabla")("modules/noNorm!../test"),
				"modules/noNorm!test",
				"../ is sibling of titi");
			// Default normalize
			assert.strictEqual(lib.getNormalize("titi/blabla")("modules/defNorm!./test"),
				"modules/defNorm!titi/test",
				"./ is relative to titi");
			assert.strictEqual(lib.getNormalize("titi/blabla")("modules/defNorm!../test"),
				"modules/defNorm!test",
				"../ is sibling of titi");
			// Custom normalize
			assert.strictEqual(lib.getNormalize("titi/blabla")("modules/custNorm!test"),
				"modules/custNorm!custom/test",
				"Should use the plugin provided normalize");
		}
	});

	registerSuite({
		name: 'others',

		'addPluginResources': function () {
			var plugins = {};
			var lib = getModules(requirejs, utils, {
				runtimePlugins: ["notRT"]
			});
			lib.addPluginResources({
				mid: "plugA",
				resources: ["toto", "toto", "titi"]
			}, plugins);
			lib.addPluginResources({
				mid: "plugB",
				resources: ["titi"]
			}, plugins);
			lib.addPluginResources({
				mid: "notRT",
				resources: ["tata"]
			}, plugins);

			assert.strictEqual(plugins.notRT,
				undefined,
				"notRT should not be process");
			assert.isArray(plugins.plugA,
				"Plugin plug A should have an array of resource");
			assert.isArray(plugins.plugB,
				"Plugin plug B should have an array of resource");
			assert.strictEqual(plugins.plugA.length,
				2,
				"2 elts toto and titi");
			assert.strictEqual(plugins.plugB.length,
				1,
				"1 elts titi");
			assert.strictEqual(plugins.plugA[0],
				"toto",
				"first resource is toto");
			assert.strictEqual(plugins.plugA[1],
				"titi",
				"2nd resource is titi");
			assert.strictEqual(plugins.plugB[0],
				"titi",
				"first resource is titi");
		},

		'getModuleFromMid': function () {
			var lib = getModules(requirejs, utils, null, function () {});
			var mod1 = lib.getModuleFromMid("modules/custNorm!toto");
			assert.strictEqual(mod1.mid,
				"modules/custNorm",
				"Just the mid");
			assert.strictEqual(mod1.filepath,
				"./tests/modules/custNorm.js",
				"Packages should be applied");
			assert.strictEqual(mod1.content,
				contentCustNorm,
				"The file should be found");
			assert.strictEqual(mod1.resources[0],
				"toto",
				"There is a toto resource");

			var mod2 = lib.getModuleFromMid("modules/custNorm!titi");
			assert.strictEqual(mod1,
				mod2,
				"Second time, the module should come from cache");
			assert.strictEqual(mod1.resources[0],
				"toto",
				"Resources are additives");
			assert.strictEqual(mod1.resources[1],
				"titi",
				"Resources are additives");
		},

		'getModuleFromPath': function () {
			var lib = getModules(null, null, null, function () {});
			var path = "tests/modules/custNorm.js";
			var mod1 = lib.getModuleFromPath(path);
			assert.strictEqual(mod1.mid,
				"tests/modules/custNorm",
				"Just the mid, but no reverse path/package should be done");
			assert.strictEqual(mod1.filepath,
				path,
				"it should preserve the path");
			assert.strictEqual(mod1.content,
				contentCustNorm,
				"The file should be found");
			assert.strictEqual(mod1.resources.length,
				0,
				"There is no resource");

			var mod2 = lib.getModuleFromPath(path);
			assert.strictEqual(mod1,
				mod2,
				"Second time, the module should come from cache");
		}
	});
});
