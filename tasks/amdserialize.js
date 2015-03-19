module.exports = function (grunt) {

	"use strict";

	var libDir = "./lib/",
		lang = require(libDir + "lang"),
		normalizeCfg = require(libDir + "normalizeConfig");

	// Trim the leading dots to avoid writing files outside of dir if baseUrl start with ../
	// Since all paths should start with baseUrl their should be no collision.
	function getTrimBaseUrlLeadingDots(baseUrl) {
		var trimmedBaseUrl = baseUrl.replace(/^(\.\/)*(\.\.\/)*/, "");
		return function (string) {
			// match baseUrl and replace with the trimmed baseUrl
			return string.replace(baseUrl, trimmedBaseUrl);
		};
	}

	grunt.registerTask("amdserialize", function (layerName, buildCfg, loaderCfg, outputProp) {
		var loaderConfig = normalizeCfg.loader(grunt.config(loaderCfg));
		var baseUrl = loaderConfig.baseUrl;
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


		var trimBaseUrlLeadingDots = getTrimBaseUrlLeadingDots(baseUrl);

		layerConfig.shim.forEach(function (shim) {
			var path = trimBaseUrlLeadingDots(shim.filepath);
			var absPath = dir + path;

			grunt.file.write(absPath, shim.content);
			modulesFiles.abs.push(absPath);
			modulesFiles.rel.push(path);
		});

		lang.forEachModules(layerConfig.modules, layerName, function (module) {
			if (!module.filepath) {
				grunt.fail.warn("Undefined Path " + module.mid);
			}

			var path = trimBaseUrlLeadingDots(module.filepath);
			var absPath = dir + path;
			grunt.file.write(absPath, module.content);
			modulesFiles.abs.push(absPath);
			modulesFiles.rel.push(path);
		});

		lang.eachProp(layerConfig.pluginsFiles, function (filepath, content) {
			var destPath = trimBaseUrlLeadingDots(filepath);
			var absDestPath = dir + destPath;

			// Process images included in css with url() param.
			if (/.css$/.test(filepath)) {
				var fileDir = filepath.replace(/[^\/]*$/, "");
				// The (?!data:) is to avoid inlined images.
				var urlRE = /url\(['"]?(?!data:)([^#\?\)'"]*)[^\)'"]*['"]?\)/g;
				var match = null;

				// This is needed in case of relative path using ../, because grunt.file.copy while try to go down to
				// fileDir before going up with ../ So if fileDir does not exist grunt.file.copy fails.
				grunt.file.mkdir(fileDir);

				// Extra parenthesis in the while condition to silence jshint.
				// The assignment is required here to access the matched groups of a global regexp.
				while ((match = urlRE.exec(content))) {
					var src = fileDir + match[1];
					var dest = dir + trimBaseUrlLeadingDots(src);
					grunt.file.copy(src, dest, {
						encoding: null
					});
					pluginsFiles.abs.push(dir + src);
					pluginsFiles.rel.push(src);
				}
			}

			grunt.file.write(absDestPath, content);
			pluginsFiles.abs.push(absDestPath);
			pluginsFiles.rel.push(destPath);
		});

		outputProp = outputProp || "amdoutput";

		// Reset output
		grunt.config(outputProp, {});

		grunt.config([outputProp, "header"], layerConfig.header);
		grunt.config([outputProp, "modules"], modulesFiles);
		grunt.config([outputProp, "plugins"], pluginsFiles);
		grunt.config([outputProp, "layerName"], layerName);
		grunt.config([outputProp, "layerPath"], trimBaseUrlLeadingDots(layerConfig.outputPath));
	});
};
