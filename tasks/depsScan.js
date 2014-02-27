module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/",
		eachProp = require(libDir + "lang").eachProp,
		normalizeCfg = require(libDir + "normalizeConfig"),
		getUtils = require(libDir + "utils"),
		requirejs = require("requirejs");

	requirejs.config({
		//Pass the top-level main.js/index.js require
		//function to requirejs so that node modules
		//are loaded relative to the top-level JS file.
		nodeRequire: require,
	});



	grunt.registerTask("depsScan", function (layerName, buildCfg, loaderCfg) {
		var done = this.async(),
			utils = getUtils(grunt.config(loaderCfg)),
			buildConfig = normalizeCfg.build(grunt.config(buildCfg)),
			layerConfig = buildConfig.layers[layerName],
			modules = layerConfig.modules,
			plugins = layerConfig.plugins,
			includeList = [],
			excludeMap = {
				require: true,
				exports: true,
				module: true
			},
			
			fileExists = function (path) {
				if (!grunt.file.exists(path)) {
					grunt.fail.warn('Source file "' + path + '" not found.');
					return false;
				}
				return true;
			},
			//to include and exist
			isModuleValid = function (module) {
				if (excludeMap[module.mid] || modules[module.mid]) {
					return false;
				}
				if (module.mid !== layerName && buildConfig.layers[module.mid]) {
					grunt.fail.warn("The layer " + layerName + " contains the module " + module.mid +
						" which is also a layer name.\nThis is likely to cause problems as the layer " +
						module.mid + " will not be loaded if the layer " +
						layerName + " is loaded before the layer " + module.mid + ".");
				}
				return fileExists(module.filepath);
			},
			addToInclude = function (module) {
				includeList.push(module);
			},
			getModuleFromMid = function (current) {
				return function (mid) {
					var resource,
						index = mid.indexOf('!');

					if (index > -1) {
						// This module is a plugin
						resource = mid.substring(index + 1, mid.length);
						mid = mid.substring(0, index);
					}

					mid = utils.normalize(mid, current, true);

					if (resource) {
						if (!plugins[mid]) {
							plugins[mid] = [];
						}
						if (plugins[mid].indexOf(resource) < 0) {
							plugins[mid].push(resource);
						}
					}

					return {
						mid: mid,
						filepath: utils.nameToFilepath(mid)
					};
				};
			},
			getNormalize = function (current) {
				return function (mid) {
					return utils.normalize(mid, current, true);
				};
			},
			task = function (req) {
				req(["parse", "transform"], function (parse, transform) {
					var toTransport = function (moduleName, filepath) {
							var content = grunt.file.read(filepath); // Changed something here test
							return transform.toTransport(null, moduleName, filepath, content);
						},
						current;

					grunt.log.subhead("Starting to process layer: " + layerName);
					grunt.log.writeln("Looking for " + layerName + " dependencies...");

					//Populate the excludeMap
					layerConfig.exclude.map(getNormalize(null)).forEach(function (mid) {
						var path = utils.nameToFilepath(mid);
						if (fileExists(path)) {
							parse.findDependencies(mid, grunt.file.read(path))
								.map(getNormalize(mid))
								.forEach(function (dep) {
									excludeMap[dep] = true;
								});
						}
						excludeMap[mid] = true;
					});


					//Initialize includeList
					layerConfig.include.map(getModuleFromMid())
						.filter(isModuleValid)
						.forEach(addToInclude);

					//Search dependencies
					while (includeList.length) {
						current = includeList.pop();
						current.content = toTransport(current.mid, current.filepath);
						current.deps = parse.findDependencies(current.mid, current.content)
							.map(getModuleFromMid(current.mid));
						current.includeDeps = current.deps.filter(isModuleValid);
						current.includeDeps.forEach(addToInclude);

						modules[current.mid] = current;
					}

					grunt.verbose.or.ok();
					grunt.verbose.writeln("Found dependencies for " + layerName);
					eachProp(modules, function (prop, module) {
						grunt.verbose.writeln(module.mid);
					});

					grunt.config([buildCfg], buildConfig);

					done(true);
				});
			};

		requirejs.tools.useLib(task);
	});
};
