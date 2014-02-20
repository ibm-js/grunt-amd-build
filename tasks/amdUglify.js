module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/",
		forEachModules = require(libDir + "lang").forEachModules,
		normalizeCfg = require(libDir + "normalizeConfig");



	grunt.registerTask("amdUglify", function (layerName, buildCfg) {
		var sourceMap = (grunt.config(["uglify", "options"]) || {}).sourceMap,
			buildConfig = normalizeCfg.build(grunt.config(buildCfg)),
			layerConfig = buildConfig.layers[layerName],
			dir = buildConfig.dir,
			tmpDir = dir + "sourceMap/",
			layerPath = layerConfig.outputPath,
			deps = [],
			banner = (grunt.config(["uglify", layerName, "options", "banner"]) ||
				grunt.config(["uglify", "options", "banner"]) ||
				"") + layerConfig.header,
			tasks = ["uglify:" + layerName],

			addToDeps = function (path, content) {
				path = tmpDir + path;
				grunt.file.write(path, content);
				deps.push(path);
			};

		forEachModules(layerConfig.modules, layerName, function (module) {
			addToDeps(module.mid + ".js", module.content);
		});

		layerConfig.pluginsFiles.forEach(function (o) {
			grunt.file.write(o.filepath, o.content);
		});

		grunt.config(["uglify", layerName, "options", "banner"], banner);


		grunt.config(["uglify", layerName, "files", layerPath], deps);

		if (!sourceMap) {
			tasks.push("cleanAmdUglify:" + tmpDir);
		}
		grunt.task.run(tasks);
	});

	grunt.registerTask("cleanAmdUglify", function (tmpDir) {
		grunt.file.delete(tmpDir);
	});
};
