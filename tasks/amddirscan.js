module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var normalizeCfg = require(libDir + "normalizeConfig");
	var modulesLib = require(libDir + "modules");
	var pluginsLib = require(libDir + "plugins");
	var getUtils = require(libDir + "utils");
	var getRequirejs = require(libDir + "requirejs");

	function getJsModules(layer) {
		function negate(pattern) {
			return "!" + pattern;
		}

		var patterns = layer.includeFiles;
		var excludePatterns = layer.excludeFiles.map(negate);
		var options = {
			filter: "isFile"
		};
		return grunt.file.expand(options, patterns.concat(excludePatterns));
	}

	grunt.registerTask("amddirscan", function (layerName, buildCfg, loaderCfg) {
		var done = this.async();

		var buildConfig = grunt.config(buildCfg);
		if (!buildConfig) {
			grunt.fail.warn("No build config was found.");
			buildConfig = {};
		}
		buildConfig = normalizeCfg.build(buildConfig);
		var layersMap = buildConfig.layersByName;
		var layer = layersMap[layerName];
		var modules = layer.modules;

		var loaderConfig = grunt.config(loaderCfg);
		if (!loaderConfig) {
			grunt.fail.warn("No loader config was found.");
			loaderConfig = {};
		}

		var requirejs = getRequirejs(grunt.config(loaderCfg));
		var utils = getUtils(loaderConfig);

		var lib = modulesLib(utils, grunt.fail.warn);

		var modulesList = getJsModules(layer)
			.map(lib.getModuleFromPath);

		function task(req) {
			req(["parse", "transform"], function (parse, transform) {
				// Simple wrapper to simplify the call of toTransport.
				function toTransport(moduleName, filepath, content) {
					return transform.toTransport(null, moduleName, filepath, content);
				}

				// Create the processResources function as everything needed is now here.
				var plugins = pluginsLib(requirejs, layer, utils, toTransport, buildConfig);

				modulesList.forEach(function (current) {
					if (current.content) {
						current.content = toTransport(current.mid, current.filepath, current.content);
						modules[current.mid] = current;

						parse.findDependencies(current.mid, current.content)
							.map(lib.getNormalize(current.mid))
							.forEach(function (mid) {
								plugins.process(mid, lib.getNormalize(current.mid));
							});
					}
				});

				plugins.onLayerEnd();

				grunt.config([buildCfg], buildConfig);

				done(true);
			});
		}

		// Use requirejs lib to avoid code duplication.
		require("requirejs").tools.useLib(task);
	});
};
