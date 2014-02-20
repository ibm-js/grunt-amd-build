module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/",
		forEachModules = require(libDir + "lang").forEachModules,
		normalizeCfg = require(libDir + "normalizeConfig");

	grunt.registerTask("amdConcat", function (layerName, buildCfg) {
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg)),
			layerConfig = buildConfig.layers[layerName],
			buffer = layerConfig.header;

		layerConfig.pluginsFiles.forEach(function (o) {
			grunt.file.write(o.filepath, o.content);
		});

		forEachModules(layerConfig.modules, layerName, function (module) {
			buffer += module.content + ";";
		});

		grunt.file.write(layerConfig.outputPath, buffer);
		grunt.log.write("Writing the layer " + layerConfig.outputPath + "...").ok();
	});
};
