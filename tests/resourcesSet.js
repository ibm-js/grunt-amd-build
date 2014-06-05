define([
	'intern!object',
	'intern/chai!assert'
], function (registerSuite, assert) {
	// Workaround problem with relative paths and dojo/node
	var getResourcesSet = require.nodeRequire("../../../tasks/lib/resourcesSet");

	var resourcesSet;
	registerSuite({
		name: 'resourcesSet',

		'basic': function () {
			resourcesSet = getResourcesSet();
			assert.isTrue(resourcesSet.isEmpty(),
				"resourcesSet should be empty at the beginning.");

			resourcesSet.push({
				mid: "module1",
				resources: ["res1"]
			});
			assert.isFalse(resourcesSet.isEmpty(),
				"resourcesSet should be not be empty since we added a module.");

			var module = resourcesSet.pop();
			assert.strictEqual(module.mid,
				"module1",
				"pop() should return the last module.");
			assert.strictEqual(module.resources[0],
				"res1",
				"resource should not be filtered out.");

		},

		'doublePush': function () {
			resourcesSet = getResourcesSet();
			assert.isTrue(resourcesSet.isEmpty(),
				"resourcesSet should be empty at the beginning.");

			var module = {
				mid: "module2",
				resources: ["res1", "res2", "res1", "res3"]
			};
			resourcesSet.push(module);
			resourcesSet.push(module);
			resourcesSet.push({
				mid: "module2",
				resources: ["res2", "res4"]
			});
			resourcesSet.push({
				mid: "module3",
				resources: ["res1", "res2"]
			});
			assert.isFalse(resourcesSet.isEmpty(),
				"resourcesSet should be not be empty since we added two modules.");

			module = resourcesSet.pop();
			assert.strictEqual(module.mid,
				"module3",
				"last module pushed");
			assert.sameMembers(module.resources, ["res1", "res2"],
				"all resources should be here");
			assert.strictEqual(module.resources.length,
				2,
				"there should be two resources to process");
			assert.isFalse(resourcesSet.isEmpty(),
				"resourcesSet should be not be empty since we added two modules.");

			module = resourcesSet.pop();
			assert.strictEqual(module.mid,
				"module2",
				"first module pushed");
			assert.sameMembers(module.resources, ["res1", "res2", "res3", "res4"],
				"all resources should be here");
			assert.strictEqual(module.resources.length,
				4,
				"there should be four resources to process");

			assert.isTrue(resourcesSet.isEmpty(),
				"Now the resourcesSet should be empty since we added twice the same module.");
		},

		'process': function () {
			resourcesSet = getResourcesSet();
			assert.isTrue(resourcesSet.isEmpty(),
				"resourcesSet should be empty at the beginning.");

			resourcesSet.push({
				mid: "module1",
				resources: ["res1", "res2"]
			});
			resourcesSet.push({
				mid: "module2",
				resources: ["res1"]
			});
			resourcesSet.push({
				mid: "module3",
				resources: ["res2"]
			});

			resourcesSet.process(function (module) {
				switch (module.mid) {
				case "module1":
					assert.sameMembers(module.resources, ["res1", "res2"],
						"all resources should be here");
					assert.strictEqual(module.resources.length,
						2,
						"there should be four resources to process");
					break;
				case "module2":
					assert.sameMembers(module.resources, ["res1"],
						"all resources should be here");
					assert.strictEqual(module.resources.length,
						1,
						"there should be one resource to process");
					break;
				case "module3":
					assert.sameMembers(module.resources, ["res2"],
						"all resources should be here");
					assert.strictEqual(module.resources.length,
						1,
						"there should be one resource to process");
					break;
				default:
					assert.isTrue(false, "there should not be other modules");
				}
			});

			assert.isTrue(resourcesSet.isEmpty(),
				"resourcesSet should be empty since after process");

			resourcesSet.push({
				mid: "module1",
				resources: ["res1", "res2"]
			});
			resourcesSet.push({
				mid: "module2",
				resources: ["res2"]
			});
			resourcesSet.push({
				mid: "module3",
				resources: ["res1"]
			});
			resourcesSet.process(function (module) {
				switch (module.mid) {
				case "module2":
					assert.sameMembers(module.resources, ["res2"],
						"all resources should be here");
					assert.strictEqual(module.resources.length,
						1,
						"there should be one resource to process");
					break;
				case "module3":
					assert.sameMembers(module.resources, ["res1"],
						"all resources should be here");
					assert.strictEqual(module.resources.length,
						1,
						"there should be one resource to process");
					break;
				default:
					assert.isTrue(false, "there should not be other modules");
				}
			});

			assert.isTrue(resourcesSet.isEmpty(),
				"resourcesSet should be empty since after process");

		}
	});
});
