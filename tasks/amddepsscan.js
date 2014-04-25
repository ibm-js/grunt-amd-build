module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var eachProp = require(libDir + "lang").eachProp;
	var normalizeCfg = require(libDir + "normalizeConfig");
	var getUtils = require(libDir + "utils");
	var getStack = require(libDir + "modulesStack");
	var getParseExclude = require(libDir + "parseExclude");
	var modulesLib = require(libDir + "modules");
	var requirejs = require("requirejs");

	requirejs.config({
		//Pass the top-level main.js/index.js require
		//function to requirejs so that node modules
		//are loaded relative to the top-level JS file.
		nodeRequire: require
	});

	grunt.registerTask("amddepsscan", function (layerName, buildCfg, loaderCfg) {
		var done = this.async();

		var buildConfig = grunt.config(buildCfg);
		if (!buildConfig) {
			grunt.fail.warn("No build config was found.");
			buildConfig = {};
		}
		buildConfig = normalizeCfg.build(buildConfig);
		var layersMap = buildConfig.layersByName;

		var loaderConfig = grunt.config(loaderCfg);
		if (!loaderConfig) {
			grunt.fail.warn("No loader config was found.");
			loaderConfig = {};
		}

		var utils = getUtils(loaderConfig);

		var lib = modulesLib(requirejs, utils, buildConfig, grunt.fail.warn);
		var pE = getParseExclude();

		var layerConfig = layersMap[layerName];
		var modules = layerConfig.modules;
		var plugins = layerConfig.plugins;

		function initExclude(exclude, excludeShallow, getDeps, getModuleFromMid) {
			exclude = pE.excludeLayerDeps(exclude, layersMap);

			// Exclude specified modules
			pE.excludeArray(exclude.concat(excludeShallow));

			// Exclude dependencies of modules specified in the "exclude" property.
			exclude.forEach(function (mid) {
				pE.excludeArray(getDeps(getModuleFromMid(mid)));
			});
		}

		function addToStack(module, stack) {
			lib.warnConflictLayerName(module, layerName, layersMap);
			lib.addPluginResources(module, plugins);
			stack.push(module);
		}

		// Initialize the includeList with the layer name if it's a module name.
		function initStack(stack, include, exclude, excludeShallow) {
			function isNotExcluded(module) {
				return exclude.indexOf(module.mid) < 0 && excludeShallow.indexOf(module.mid) < 0;
			}

			// Check if the layer name is a module name and, if true include it.
			var layerMid = utils.normalize(layerName, null, true);
			if (isNotExcluded(layerMid) && grunt.file.exists(layerMid + ".js")) {
				stack.push(lib.getModuleFromMid(layerMid));
			}

			// General init
			include.map(lib.getModuleFromMid)
				.filter(isNotExcluded)
				.forEach(function (module) {
					addToStack(module, stack);
				});
		}

		function task(req) {
			req(["parse", "transform"], function (parse, transform) {
				// Simple wrapper to simplify the call of toTransport.
				function toTransport(moduleName, filepath, content) {
					return transform.toTransport(null, moduleName, filepath, content);
				}

				function getDeps(module) {
					return parse.findDependencies(module.mid, module.content)
						.map(lib.getNormalize(module.mid));
				}

				function processStack(modulesStack, addDeps) {
					var current;
					while (!modulesStack.isEmpty()) {
						current = modulesStack.pop();
						// if content is empty, then something went wrong so skip this module.
						if (current.content) {
							grunt.verbose.writeln(current.mid);
							current.content = toTransport(current.mid, current.filepath, current.content);
							if (addDeps) {
								getDeps(current).filter(pE.isMidToInclude)
									.map(lib.getModuleFromMid)
									.forEach(function (module) {
										addToStack(module, modulesStack);
									});
							}
							modules[current.mid] = current;
						}
					}
				}


				grunt.log.subhead("Starting to process layer: " + layerName);
				grunt.log.writeln("Looking for " + layerName + " dependencies...");

				// Normalize layer path
				layerConfig.outputPath = utils.nameToFilepath(layerName);

				// Normalize exclude/include
				var exclude = layerConfig.exclude.map(lib.getNormalize());
				var excludeShallow = layerConfig.excludeShallow.map(lib.getNormalize());
				var include = layerConfig.include.map(lib.getNormalize());
				var includeShallow = layerConfig.includeShallow.map(lib.getNormalize());

				// Process included layers
				var layerDeps = [];
				include = include.filter(function (mid) {
					var layerData = layersMap[mid];
					if (layerData) {
						eachProp(layerData.modules, function (prop, module) {
							layerDeps.push(module.mid);
						});
						eachProp(layerData.plugins, function (prop, resources) {
							resources.forEach(function (resource) {
								layerDeps.push(prop + "!" + resource);
							});
						});
						// return false to remove the layer mid from the exclude list.
						return false;
					}
					return true;
				});
				include = include.concat(layerDeps);

				// Initialize exclude
				initExclude(exclude, excludeShallow, getDeps, lib.getModuleFromMid);

				// Create a stack to store modules to process.
				var modulesStack = getStack();

				// Search dependencies
				grunt.verbose.writeln("Found dependencies for " + layerName);
				initStack(modulesStack, include, exclude, excludeShallow);
				processStack(modulesStack, true);

				//Process includeShallow
				initStack(modulesStack, includeShallow, exclude, excludeShallow);
				processStack(modulesStack, false);

				//Logging
				grunt.log.ok();

				//Save modification
				grunt.config([buildCfg], buildConfig);

				done(true);
			});
		}

		// Use requirejs lib to avoid code duplication.
		requirejs.config(grunt.config(loaderCfg));
		requirejs.tools.useLib(task);
	});
};
