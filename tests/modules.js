define([
	'intern!object',
	'intern/chai!assert',
	'intern/dojo/node!fs'
], function (registerSuite, assert, fs) {
	// Workaround problem with relative paths and dojo/node
	var getUtils = require.nodeRequire("../../../tasks/lib/utils");
	var getModules = require.nodeRequire("../../../tasks/lib/modules");

	var utils = getUtils({
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
			var lib = getModules(utils, console.log);
			assert.strictEqual(lib.getNormalize()("./toto"),
				"toto",
				"./ is top level");
			assert.strictEqual(lib.getNormalize()("toto!"),
				"toto!",
				"empty resource so nothing to normalize.");
			assert.strictEqual(lib.getNormalize()("modules/noNorm!./test"),
				"modules/noNorm!./test",
				"Plugin should not be normalized yet.");
		},

		'with reference': function () {
			var lib = getModules(utils, console.log);
			assert.strictEqual(lib.getNormalize("titi/blabla")("./toto"),
				"titi/toto",
				"./ is relative to titi");
			assert.strictEqual(lib.getNormalize("titi/blabla")("../toto"),
				"toto",
				"../ is sibling of titi");
			assert.strictEqual(lib.getNormalize("titi/blabla")("modules/noNorm!./test"),
				"modules/noNorm!./test",
				"Plugin should not be normalized yet");
		}
	});

	registerSuite({
		name: 'others',

		'getModuleFromMid': function () {
			var lib = getModules(utils, console.log);
			var mod1 = lib.getModuleFromMid("modules/custNorm");
			assert.strictEqual(mod1.mid,
				"modules/custNorm",
				"Just the mid");
			assert.strictEqual(mod1.filepath,
				"./tests/modules/custNorm.js",
				"Packages should be applied");
			assert.strictEqual(mod1.content,
				contentCustNorm,
				"The file should be found");

			var mod2 = lib.getModuleFromMid("modules/custNorm");
			assert.strictEqual(mod1,
				mod2,
				"Second time, the module should come from cache");
		},

		'getModuleFromPath': function () {
			var lib = getModules(utils, console.log);
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

			var mod2 = lib.getModuleFromPath(path);
			assert.strictEqual(mod1,
				mod2,
				"Second time, the module should come from cache");
		},

		'splitPluginMid': function () {
			var lib = getModules(utils, console.log);
			var input = ["myapp/plugin", "myapp/plugin!", "myapp/plugin!resource", "myapp/plugin!otherPlugin!resource"];
			var expected = [
				{
					mid: "myapp/plugin",
					resource: undefined
				}, {
					mid: "myapp/plugin",
					resource: ""
				}, {
					mid: "myapp/plugin",
					resource: "resource"
				}, {
					mid: "myapp/plugin",
					resource: "otherPlugin!resource"
				}
			];
			var result = input.map(lib.splitPluginMid);

			result.forEach(function (name, index) {
				assert.strictEqual(name.mid, expected[index].mid, "The mid should be extracted correctly");
				assert.strictEqual(name.resource, expected[index].resource,
					"The resource should be extracted correctly");
			});
		},

		'filterMids': function () {
			var lib = getModules(utils, console.log);
			var input = [
				"myapp/toto",
				"myapp/toto",
				"myapp/plugin!",
				"myapp/titi",
				"myapp/otherPlugin!resource",
				"myapp/plugin!otherPlugin!resource",
				"myapp/tata"
			];
			var expected = {
				modules: [
					"myapp/toto",
					"myapp/toto",
					"myapp/titi",
					"myapp/tata"
				],
				plugins: [{
					mid: "myapp/plugin",
					resource: ""
				}, {
					mid: "myapp/otherPlugin",
					resource: "resource"
				}, {
					mid: "myapp/plugin",
					resource: "otherPlugin!resource"
				}]
			};
			var result = lib.filterMids(input);

			assert.sameMembers(result.modules, expected.modules, "The modules list is wrong");

			result.plugins.forEach(function (name, index) {
				var ref = expected.plugins[index];
				assert.strictEqual(name.mid, ref.mid, "The mid should be extracted correctly");
				assert.strictEqual(name.resource, ref.resource,
					"The resource should be extracted correctly");
			});
		}
	});
});
