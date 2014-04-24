module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var normalizeCfg = require(libDir + "normalizeConfig");
	var modulesLib = require(libDir + "modules");
	var getUtils = require(libDir + "utils");
	var requirejs = require("requirejs");
	var parseExclude = require(libDir + "parseExclude")();

	requirejs.config({
		//Pass the top-level main.js/index.js require
		//function to requirejs so that node modules
		//are loaded relative to the top-level JS file.
		nodeRequire: require
	});


	function getJsModules(layerConfig) {
		function negate(pattern) {
			return "!" + pattern;
		}

		var patterns = layerConfig.includeFiles;
		var excludePatterns = layerConfig.excludeFiles.map(negate);
		var options = {
			filter: "isFile"
		};
		return grunt.file.expand(options, excludePatterns.concat(patterns));
	}


	grunt.registerTask("amddirscan", function (layerName, buildCfg, loaderCfg) {
		var done = this.async();
		var buildConfig = normalizeCfg.build(grunt.config(buildCfg));
		var layerConfig = buildConfig.layersByName[layerName];
		var modules = layerConfig.modules;

		var loaderConfig = grunt.config(loaderCfg);
		if (!loaderConfig) {
			grunt.fail.warn("No loader config was found.");
			loaderConfig = {};
		}

		var utils = getUtils(loaderConfig);

		var lib = modulesLib(requirejs, utils, buildConfig, grunt.fail.warn);

		var modulesList = getJsModules(layerConfig)
			.map(lib.getModuleFromPath);

		function task(req) {
			req(["parse", "transform"], function (parse, transform) {
				modulesList.forEach(function (module) {
					if (module.content) {
						module.content = transform.toTransport(null, module.mid, module.filepath, module.content);
						modules[module.mid] = module;

						parse.findDependencies(module.mid, module.content)
							.map(lib.getNormalize(module.mid))
							.filter(parseExclude.isMidToInclude)
							.map(lib.getModuleFromMid)
							.forEach(function (module) {
								lib.addPluginResources(module, layerConfig.plugins);
							});
						console.log(layerConfig.plugins);
					}
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
