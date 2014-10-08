module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var eachProp = require(libDir + "lang").eachProp;
	var normalizeCfg = require(libDir + "normalizeConfig");
	var getUtils = require(libDir + "utils");
	var getModulesStack = require(libDir + "modulesStack");
	var getParseExclude = require(libDir + "parseExclude");
	var parseLayer = require(libDir + "parseLayer");
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
		var pE = getParseExclude();

		function initExclude(exclude, excludeShallow, getDeps, getModuleFromMid) {
			exclude = pE.excludeLayerDeps(exclude, layersMap, getModuleFromMid);

			// Exclude specified modules
			pE.excludeArray(exclude.concat(excludeShallow));

			// Exclude the shims and their dependencies
			if (loaderConfig.shim) {
				pE.excludeArray(Object.keys(loaderConfig.shim));
				eachProp(loaderConfig.shim, function (name, value) {
					pE.excludeArray(value.deps || []);
				});
			}

			// Exclude dependencies of modules specified in the "exclude" property.
			exclude.forEach(function (mid) {
				pE.excludeArray(getDeps(getModuleFromMid(mid)));
			});
		}

		function addToStack(module, stack) {
			lib.warnConflictLayerName(module, layer.name, layersMap);
			stack.push(module);
		}

		// Initialize the includeList with the layer name if it's a module name.
		function initStack(stack, plugins, include, exclude, excludeShallow) {
			function isNotExcluded(module) {
				return exclude.indexOf(module.mid) < 0 && excludeShallow.indexOf(module.mid) < 0;
			}

			// If the layer name is a module name, include it.
			var layerMid = utils.normalize(layer.name, null, true);
			if (isNotExcluded(layerMid) && grunt.file.exists(utils.nameToFilepath(layerMid))) {
				stack.push(lib.getModuleFromMid(layerMid));
			}

			// General init
			// Process plugin specified in the include
			var pluginDeps = [];
			include = include.map(function (mid) {
				var modulesToAdd = plugins.process(mid, lib.getNormalize(null));
				pluginDeps = pluginDeps.concat(modulesToAdd);
				//return only the module id.
				return plugins.splitPluginMid(mid).mid;
			});
			// Process regular modules.
			include.concat(pluginDeps)
				.map(lib.getModuleFromMid)
				.filter(isNotExcluded)
				.forEach(function (module) {
					addToStack(module, stack);
				});
		}

		function task(req) {
			req(["parse", "transform"], function (parse, transform) {
				// Create the processResources function as everything needed is now here.
				var plugins = pluginsLib(requirejs, layer, utils, toTransport, buildConfig);

				// Simple wrapper to simplify the call of toTransport.
				function toTransport(moduleName, filepath, content) {
					return transform.toTransport(null, moduleName, filepath, content);
				}

				function getDeps(module) {
					return parse.findDependencies(module.mid, module.content)
						.map(lib.getNormalize(module.mid));
				}

				function getModules(mids) {
					return mids.filter(pE.isMidToInclude)
						.map(lib.getModuleFromMid);
				}

				function processStack(modulesStack, addDeps) {
					while (!modulesStack.isEmpty()) {
						modulesStack.process(function (current) {
							// if content is empty, then something went wrong so skip this module.
							if (current.content) {
								grunt.verbose.writeln(current.mid);
								current.content = toTransport(current.mid, current.filepath, current.content);
								if (addDeps) {
									var pluginDeps = [];
									// Process plugins
									var deps = getDeps(current).map(function (mid) {
										var modulesToAdd = plugins.process(mid, lib.getNormalize(current.mid));
										pluginDeps = pluginDeps.concat(modulesToAdd);
										//return only the module id.
										return plugins.splitPluginMid(mid).mid;
									});
									// Process regular modules.
									getModules(deps.concat(pluginDeps)).forEach(function (module) {
										addToStack(module, modulesStack);
									});
								}
								modules[current.mid] = current;
							}
						});
					}
					plugins.onLayerEnd();
				}


				grunt.log.subhead("Starting to process layer: " + layer.name);
				grunt.log.writeln("Looking for " + layer.name + " dependencies...");

				// Normalize layer path
				layer.outputPath = utils.nameToFilepath(layer.name);

				// Normalize exclude/include
				var exclude = layer.exclude.map(lib.getNormalize());
				var excludeShallow = layer.excludeShallow.map(lib.getNormalize());
				var include = layer.include.map(lib.getNormalize());
				var includeShallow = layer.includeShallow.map(lib.getNormalize());

				// Process included layers
				var layerDeps = [];
				include = include.filter(function (mid) {
					// Process currently building layers.
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
						// return false to remove the layer mid from the include list.
						return false;
					}
					// Process already built layers.
					var layerContent = parseLayer(lib.getModuleFromMid(mid).content);
					if (layerContent) {
						layerContent.forEach(function (mid) {
							layerDeps.push(mid);
						});
						// return false to remove the layer mid from the exclude list.
						return false;
					}

					return true;
				});
				include = include.concat(layerDeps);

				// Initialize exclude
				initExclude(exclude, excludeShallow, getDeps, lib.getModuleFromMid);

				// Create stack to store modules to process.
				var modulesStack = getModulesStack();

				// Search dependencies
				grunt.verbose.writeln("Found dependencies for " + layer.name);
				initStack(modulesStack, plugins, include, exclude, excludeShallow);
				processStack(modulesStack, true);

				//Process includeShallow
				initStack(modulesStack, plugins, includeShallow, exclude, excludeShallow);
				processStack(modulesStack, false);

				//Logging
				grunt.log.ok();

				//Save modification
				grunt.config([buildCfg], buildConfig);

				done(true);
			});
		}

		// Use requirejs lib to avoid code duplication.
		require("requirejs").tools.useLib(task);
	});
};
