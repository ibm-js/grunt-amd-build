module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var eachProp = require(libDir + "lang").eachProp;
	var normalizeCfg = require(libDir + "normalizeConfig");
	var getUtils = require(libDir + "utils");
	var requirejs = require("requirejs");

	requirejs.config({
		//Pass the top-level main.js/index.js require
		//function to requirejs so that node modules
		//are loaded relative to the top-level JS file.
		nodeRequire: require
	});

	// Synchronously read a file and return its content.
	// If the file is not found, return an empty string
	// and produce a warning.
	function readFile(mid, path) {
		var content = "";
		try {
			content = grunt.file.read(path);
		} catch (e) {
			// get the real error hidden by grunt
			var realE = e.origError || e;
			if (realE.code === "ENOENT") {
				grunt.fail.warn("Source file " + realE.path + " not found.");
			} else {
				throw e;
			}
		}
		return content;
	}

	grunt.registerTask("amddepsscan", function (layerName, buildCfg, loaderCfg) {
		var done = this.async();
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg));
		var layerConfig = buildConfig.layersByName[layerName];
		var modules = layerConfig.modules;
		var plugins = layerConfig.plugins;

		var utils;
		if (grunt.config(loaderCfg)) {
			utils = getUtils(grunt.config(loaderCfg));
		} else {
			grunt.fail.warn("No loader config was found.");
			utils = getUtils({});
		}


		// Take a module id and return an object.
		// If the module id is a plugin (ie. contains a !) the function returns
		// the plugin name in mid and the resource in resource.
		// If the module id is a regular module, the function returns
		// the module name in mid and resource is an empty string.
		function splitPluginMid(mid) {
			var index = mid.indexOf('!');
			index = index === -1 ? mid.length : index;
			return {
				mid: mid.substring(0, index),
				resource: mid.substring(index + 1, mid.length)
			};
		}

		// Take a name as returned by splitPluginMid and returns a boolean.
		function isBuildtimePlugin(name) {
			return name.resource && buildConfig.runtimePlugins.indexOf(name.mid) < 0;
		}

		// current is a mid.
		// Return a function that will normalize mid relatively
		// to current.
		function getNormalize(current) {
			return function (mid) {
				var name = splitPluginMid(mid);
				name.mid = utils.normalize(name.mid, current, true);

				if (isBuildtimePlugin(name)) {
					// This module is a plugin and should be optimized at buildtime
					// so the resource is normalized to ease things up later
					var plugin = requirejs(name.mid);
					if (plugin.normalize) {
						name.resource = plugin.normalize(name.resource, getNormalize(current));
					} else {
						name.resource = utils.normalize(name.resource, current, true);
					}
					return name.mid + "!" + name.resource;
				} else {
					return name.mid;
				}
			};
		}

		// Add the resource to the plugins hashmap
		function addPluginResource(pluginName, resource) {
			if (!plugins[pluginName]) {
				plugins[pluginName] = [];
			}
			if (plugins[pluginName].indexOf(resource) < 0) {
				plugins[pluginName].push(resource);
			}
		}

		// Cache of the module discovered.
		var cache = {};

		// Take a normalized module id and return a module object containing
		// the module id and the filepath of the module.
		// This function also add the plugin resource to plugins
		// if the mid is a plugin.
		function getModuleFromMid(mid) {
			var name = splitPluginMid(mid);

			if (isBuildtimePlugin(name)) {
				addPluginResource(name.mid, name.resource);
			}

			if (!cache[name.mid]) {
				cache[name.mid] = {
					mid: name.mid,
					filepath: utils.nameToFilepath(name.mid)
				};
			}
			return cache[name.mid];
		}

		var excludeMap = {
			require: true,
			exports: true,
			module: true
		};

		//Populate the excludeMap
		function initExclude(parse) {
			function processLayerDependencies(mid) {
				var layerData = buildConfig.layersByName[mid];
				if (layerData) {
					eachProp(layerData.modules, function (prop, module) {
						excludeMap[module.mid] = true;
					});
					// return false to remove the layer mid from the exclude list.
					return false;
				}
				return true;
			}

			function excludeDeps(module) {
				parse.findDependencies(module.mid, readFile(module.mid, module.filepath))
					.map(getNormalize(module.mid))
					.forEach(function (dep) {
						excludeMap[dep] = true;
					});
			}

			layerConfig.exclude = layerConfig.exclude.filter(processLayerDependencies);

			layerConfig.exclude.map(getNormalize())
				.map(getModuleFromMid)
				.forEach(function (module) {
					excludeDeps(module);
					excludeMap[module.mid] = true;
				});
		}

		// Test if the module should be added in the layer.
		// Produce a warning if a module with a layer name is included.
		function isModuleToInclude(module) {
			if (excludeMap[module.mid]) {
				return false;
			}
			if (module.mid !== layerName && buildConfig.layersByName[module.mid]) {
				grunt.fail.warn("The layer " + layerName + " contains the module " + module.mid +
					" which is also a layer name.\nThis is likely to cause problems as the layer " +
					module.mid + " will not be loaded if the layer " +
					layerName + " is loaded before the layer " + module.mid + ".");
			}
			return true;
		}

		// Stack of modules to process.
		var includeList = [];

		// Map of all the modules added to the stack.
		var includeMap = {};

		// Add the module to the list of modules to explore.
		function addToInclude(module) {
			// If the module is not already included.
			if (!includeMap[module.mid]) {
				includeMap[module.mid] = true;
				includeList.push(module);
			}
		}

		// Initialize the includeList with the layer name if it's a module name.
		function initInclude() {
			// Check if the layer name is a module name and, if true include it.
			var layerModule = getModuleFromMid(utils.normalize(layerName, null, true));
			if (layerConfig.include.indexOf(layerModule.mid) < 0 &&
				grunt.file.exists(layerModule.filepath)) {
				layerConfig.include.push(layerName);
			}
			// General init
			layerConfig.include.map(getNormalize())
				.map(getModuleFromMid)
				.filter(isModuleToInclude)
				.forEach(addToInclude);
		}

		function task(req) {
			req(["parse", "transform"], function (parse, transform) {
				// Simple wrapper to simplify the call of toTransport.
				function toTransport(moduleName, filepath, content) {
					return transform.toTransport(null, moduleName, filepath, content);
				}

				grunt.log.subhead("Starting to process layer: " + layerName);
				grunt.log.writeln("Looking for " + layerName + " dependencies...");

				// Normalize layer path
				layerConfig.outputPath = utils.nameToFilepath(layerName);

				//Initialize include before exclude to give priority to include.
				initExclude(parse);
				initInclude();

				//Search dependencies
				var current;
				while (includeList.length) {
					current = includeList.pop();
					current.content = readFile(current.mid, current.filepath);

					// if content is empty, then something went wrong so skip this module.
					if (current.content.length > 0) {
						current.content = toTransport(current.mid, current.filepath, current.content);
						var deps = parse.findDependencies(current.mid, current.content)
							.map(getNormalize(current.mid))
							.map(getModuleFromMid)
							.filter(isModuleToInclude);

						// Add the current module dependencies to the stack of modules being processed.
						deps.forEach(addToInclude);

						modules[current.mid] = current;
					}

				}

				grunt.verbose.or.ok();
				grunt.verbose.writeln("Found dependencies for " + layerName);
				eachProp(modules, function (prop, module) {
					grunt.verbose.writeln(module.mid);
				});

				grunt.config([buildCfg], buildConfig);

				done(true);
			});
		}

		// Use requirejs lib to avoid code duplication.
		requirejs.config(grunt.config(loaderCfg));
		requirejs.tools.useLib(task);
	});
};
