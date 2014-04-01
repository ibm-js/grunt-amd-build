module.exports = function (grunt) {

	"use strict";

	var libDir = "./lib/",
		lang = require(libDir + "lang"),
		normalizeCfg = require(libDir + "normalizeConfig");

	grunt.registerTask("amdserialize", function (layerName, buildCfg, outputProp) {
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg)),
			layerConfig = buildConfig.layersByName[layerName],
			dir = buildConfig.dir,
			modulesFiles = {
				abs: [],
				rel: []
			},
			pluginsFiles = {
				abs: [],
				rel: []
			};

		lang.forEachModules(layerConfig.modules, layerName, function (module) {
			var path = dir + module.filepath;
			grunt.file.write(path, module.content);
			modulesFiles.abs.push(path);
			modulesFiles.rel.push(module.mid + ".js");
		});

		lang.eachProp(layerConfig.pluginsFiles, function (filepath, content) {
			grunt.file.write(filepath, content);
			pluginsFiles.abs.push(filepath);
			pluginsFiles.rel.push(filepath.replace(new RegExp("^(?:.\/)?" + dir), ""));
		});

		outputProp = outputProp || "amdoutput";

		// Reset output
		grunt.config(outputProp, {});

		grunt.config([outputProp, "header"], layerConfig.header);
		grunt.config([outputProp, "modules"], modulesFiles);
		grunt.config([outputProp, "plugins"], pluginsFiles);
		grunt.config([outputProp, "layerName"], layerName);
		grunt.config([outputProp, "layerPath"], layerConfig.outputPath);
	});
};
