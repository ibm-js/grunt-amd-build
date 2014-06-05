module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var normalizeCfg = require(libDir + "normalizeConfig");
	var modulesLib = require(libDir + "modules");
	var getResourcesSet = require(libDir + "resourcesSet");
	var getProcessResources = require(libDir + "plugins");
	var getUtils = require(libDir + "utils");
	var requirejs = require("requirejs");

	requirejs.config({
		//Pass the top-level main.js/index.js require
		//function to requirejs so that node modules
		//are loaded relative to the top-level JS file.
		nodeRequire: require
	});


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
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg));
		var layer = buildConfig.layersByName[layerName];
		var modules = layer.modules;

		var loaderConfig = grunt.config(loaderCfg);
		if (!loaderConfig) {
			grunt.fail.warn("No loader config was found.");
			loaderConfig = {};
		}

		var utils = getUtils(loaderConfig);

		var lib = modulesLib(requirejs, utils, buildConfig, grunt.fail.warn);

		var modulesList = getJsModules(layer)
			.map(lib.getModuleFromPath);

		function task(req) {
			req(["parse", "transform"], function (parse, transform) {
				// Simple wrapper to simplify the call of toTransport.
				function toTransport(moduleName, filepath, content) {
					return transform.toTransport(null, moduleName, filepath, content);
				}

				// Create the processResources function as everything needed is now here.
				var processResources = getProcessResources(requirejs, layer, buildConfig, utils, toTransport);

				var resourcesSet = getResourcesSet();

				modulesList.forEach(function (module) {
					if (module.content) {
						module.content = toTransport(module.mid, module.filepath, module.content);
						modules[module.mid] = module;

						parse.findDependencies(module.mid, module.content)
							.map(lib.getNormalize(module.mid))
							.map(lib.getModuleFromMid)
							.forEach(function (module) {
								resourcesSet.push(module);
							});
					}
				});

				if (buildConfig.buildPlugins) {
					resourcesSet.process(function (current) {
						processResources(current.mid, current.resources);
					});
				}

				grunt.config([buildCfg], buildConfig);

				done(true);
			});
		}

		// Use requirejs lib to avoid code duplication.
		requirejs.config(grunt.config(loaderCfg));
		requirejs.tools.useLib(task);
	});
};
