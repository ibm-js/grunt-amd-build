module.exports = function (grunt) {

	"use strict";

	var libDir = "./lib/",
		lang = require(libDir + "lang"),
		normalizeCfg = require(libDir + "normalizeConfig");

	function removeTraillingComa(content) {
		if (content.charAt(content.length - 2) === ",") {
			content = content.slice(0, -2) + content.charAt(content.length - 1);
		}
		return content;
	}

	grunt.registerTask("amdreportjson", function (buildCfg) {
		var config = grunt.config(this.name) || {};
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg));

		var content = "{\n";
		lang.eachProp(buildConfig.layersByName, function (name, layer) {
			content += '\t"' + name + '": {\n';
			Object.keys(layer.modules).sort().forEach(function (module) {
				content += '\t\t"' + module + '": true,\n';
			});

			content = removeTraillingComa(content) + '\t},\n';
		});

		content = removeTraillingComa(content) + '}\n';

		var dir = normalizeCfg.normalizeUrl(config.dir || "./");
		grunt.file.write(dir + "buildReport.json", content);
	});
};
