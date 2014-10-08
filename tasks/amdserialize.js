module.exports = function (grunt) {

	"use strict";

	var libDir = "./lib/",
		lang = require(libDir + "lang"),
		normalizeCfg = require(libDir + "normalizeConfig");

	grunt.registerTask("amdserialize", function (layerName, buildCfg, outputProp) {
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg));
		var layerConfig = buildConfig.layersByName[layerName];
		var dir = buildConfig.dir;
		var modulesFiles = {
			abs: [],
			rel: []
		};
		var pluginsFiles = {
			abs: [],
			rel: []
		};

		layerConfig.shim.forEach(function (shim) {
			var absPath = dir + shim.filepath;

			grunt.file.write(absPath, shim.content);
			modulesFiles.abs.push(absPath);
			modulesFiles.rel.push(shim.filepath);
		});

		lang.forEachModules(layerConfig.modules, layerName, function (module) {
			if (!module.filepath) {
				grunt.fail.warn("Undefined Path " + module.mid);
			}

			var path = dir + module.filepath;
			grunt.file.write(path, module.content);
			modulesFiles.abs.push(path);
			modulesFiles.rel.push(module.filepath);
		});

		lang.eachProp(layerConfig.pluginsFiles, function (filepath, content) {
			var absPath = dir + filepath;

			// Process images included in css with url() param.
			if (/.css$/.test(filepath)) {
				var fileDir = filepath.replace(/[^\/]*$/, "");
				var urlRE = /url\(['"]?([^\)'"]*)/g;
				var match = null;
				// Extra parenthesis in the while condition to silence jshint.
				// The assignment is required here to access the matched groups of a global regexp.
				while ((match = urlRE.exec(content))) {
					var src = fileDir + match[1];
					grunt.file.copy(src, dir + src, {
						encoding: null
					});
					pluginsFiles.abs.push(dir + src);
					pluginsFiles.rel.push(src);
				}
			}

			grunt.file.write(absPath, content);
			pluginsFiles.abs.push(absPath);
			pluginsFiles.rel.push(filepath);
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
