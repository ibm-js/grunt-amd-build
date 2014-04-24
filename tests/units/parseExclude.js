define([
	'intern!object',
	'intern/chai!assert',
	'intern/dojo/node!../../tasks/lib/parseExclude'
], function (registerSuite, assert, getParseExclude) {
	var parseExclude;
	registerSuite({
		name: 'parseExclude',

		'init': function () {
			parseExclude = getParseExclude();
			assert.isFalse(parseExclude.isMidToInclude("require"),
				"require is a special dependency and should be excluded");
			assert.isFalse(parseExclude.isMidToInclude("exports"),
				"exports is a special dependency and should be excluded");
			assert.isFalse(parseExclude.isMidToInclude("module"),
				"module is a special dependency and should be excluded");
		},

		'excludeArray': function () {
			parseExclude = getParseExclude();
			parseExclude.excludeArray(["module\/test1", "test2"]);
			assert.isFalse(parseExclude.isMidToInclude("module\/test1"),
				"specified modules should be excluded");
			assert.isFalse(parseExclude.isMidToInclude("test2"),
				"specified modules should be excluded");
			assert.isTrue(parseExclude.isMidToInclude("test"),
				"not specified modules should not be excluded");
		},

		'excludeArray Plugins': function () {
			parseExclude = getParseExclude();
			parseExclude.excludeArray(["module\/test1!toto"]);
			assert.isFalse(parseExclude.isMidToInclude("module\/test1"),
				"specified modules should be excluded");
			assert.isFalse(parseExclude.isMidToInclude("module\/test1!other"),
				"The function should not care about the plugin resource.");
		},

		'processLayerDependencies': function () {
			var layersMap = {
				layerA: {
					name: "layerA",
					modules: [{
						mid: "moduleA"
					}, {
						mid: "moduleB"
					}, ]
				},
				layerB: {
					name: "layerB",
					modules: [{
						mid: "moduleC"
					}, {
						mid: "moduleD"
					}, ]
				}
			};
			var exclude = ["module1", "layerA"];
			parseExclude = getParseExclude();
			exclude = parseExclude.excludeLayerDeps(exclude, layersMap);
			parseExclude.excludeArray(exclude);
			assert.isFalse(parseExclude.isMidToInclude("module1"),
				"specified modules should be excluded");
			assert.isFalse(parseExclude.isMidToInclude("moduleA"),
				"specified modules should be excluded");
			assert.isFalse(parseExclude.isMidToInclude("moduleB"),
				"specified modules should be excluded");
			assert.isTrue(parseExclude.isMidToInclude("moduleC"),
				"not specified modules should not be excluded");
			assert.isTrue(parseExclude.isMidToInclude("moduleD"),
				"not specified modules should not be excluded");

		}
	});
});
