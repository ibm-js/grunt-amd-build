module.exports = function (grunt) {

	"use strict";

	var libDir = "./lib/",
		lang = require(libDir + "lang"),
		normalizeCfg = require(libDir + "normalizeConfig");

	grunt.registerTask("amdSerialize", function (layerName, buildCfg, output) {
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg)),
			layerConfig = buildConfig.layers[layerName],
			dir = buildConfig.dir,
			modulesFiles = [],
			pluginsFiles = [];

		lang.forEachModules(layerConfig.modules, layerName, function (module) {
			var path = dir + module.mid + ".js";
			grunt.file.write(path, module.content);
			modulesFiles.push(path);
		});

		lang.eachProp(layerConfig.pluginsFiles, function (filepath, content) {
			grunt.file.write(filepath, content);
			pluginsFiles.push(filepath);
		});

		grunt.config([output, "header"], layerConfig.header);
		grunt.config([output, "modules"], modulesFiles);
		grunt.config([output, "plugins"], pluginsFiles);
		grunt.config([output, "layer"], layerName);
	});
};
