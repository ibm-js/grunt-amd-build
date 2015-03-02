module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var normalizeCfg = require(libDir + "normalizeConfig");
	var getUtils = require(libDir + "utils");
	var getModulesStack = require(libDir + "modulesStack");
	var getExcludes = require(libDir + "excludes");
	var getLayerDeps = require(libDir + "getLayerDeps");
	var modulesLib = require(libDir + "modules");
	var pluginsLib = require(libDir + "plugins");
	var getRequirejs = require(libDir + "requirejs");

	grunt.registerTask("amddepsscan", function (layerName, buildCfg, loaderCfg) {
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

		function addToStack(module, stack) {
			lib.warnConflictLayerName(module, layer.name, layersMap);
			stack.push(module);
		}

		// Initialize the includeList with the layer name if it's a module name.
		function initStack(stack, plugins, exclude, include) {
			// If the layer name is a module name, include it.
			var layerMid = utils.normalize(layer.name, null, true);
			if (!exclude.isStrictlyExcluded(layerMid) && grunt.file.exists(utils.nameToFilepath(layerMid))) {
				stack.push(lib.getModuleFromMid(layerMid));
			}

			// General init
			// Process plugin specified in the include
			include = plugins.process(lib.filterMids(include), lib.getNormalize());

			// Process regular modules.
			include.map(lib.getModuleFromMid)
				.forEach(function (module) {
					if (!exclude.isStrictlyExcluded(module.mid)) {
						addToStack(module, stack);
					}
				});
		}

		function task(req) {
			var parse = req("parse");
			var transform = req("transform");

			// Create the late libraries as everything needed is now here.
			var plugins = pluginsLib(requirejs, layer, utils, lib, toTransport, buildConfig);
			var excludes = getExcludes(layersMap, layer, loaderConfig, lib, parse, plugins.normalizeResource);

			// Simple wrapper to simplify the call of toTransport.
			function toTransport(moduleName, filepath, content) {
				return transform.toTransport(null, moduleName, filepath, content);
			}

			function getModules(mids) {
				return mids.filter(excludes.isModuleToInclude)
					.map(lib.getModuleFromMid);
			}

			function processStack(modulesStack, addDeps) {
				modulesStack.process(function (current) {
					// if content is empty, then something went wrong so skip this module.
					if (current.content) {
						grunt.verbose.writeln(current.mid);
						current.content = toTransport(current.mid, current.filepath, current.content);
						if (addDeps) {
							var normalize = lib.getNormalize(current.mid);
							var deps = parse.findDependencies(current.mid, current.content);
							var names = lib.filterMids(deps.map(normalize));
							var midsToAdd = plugins.process(names, normalize, excludes.isResourceToProcess);

							// Process regular modules.
							getModules(midsToAdd).forEach(function (module) {
								addToStack(module, modulesStack);
							});
						}
						modules[current.mid] = current;
					}
				});

				plugins.onLayerEnd();
			}


			grunt.log.subhead("Starting to process layer: " + layer.name);
			grunt.log.writeln("Looking for " + layer.name + " dependencies...");

			// Normalize layer path
			layer.outputPath = utils.nameToFilepath(layer.name);

			// Create stack to store modules to process.
			var modulesStack = getModulesStack();

			// Search dependencies
			grunt.verbose.writeln("Found dependencies for " + layer.name);
			initStack(modulesStack, plugins, excludes, layer.include);
			processStack(modulesStack, true);

			//Process includeShallow and includeLayers
			var layerDeps = getLayerDeps(layer.includeLayers, layersMap, lib);

			initStack(modulesStack, plugins, excludes, layer.includeShallow.concat(layerDeps));
			processStack(modulesStack, false);

			//Logging
			grunt.log.ok();

			//Save modification
			grunt.config([buildCfg], buildConfig);

			done(true);
		}

		// Use requirejs lib to avoid code duplication.
		require("requirejs").tools.useLib(task);
	});
};
