module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/";
	var normalizeCfg = require(libDir + "normalizeConfig");
	var getUtils = require(libDir + "utils");

	grunt.registerTask("amdshim", function (layerName, buildCfg, loaderCfg) {
		var buildConfig = grunt.config(buildCfg);
		if (!buildConfig) {
			grunt.fail.warn("No build config was found.");
			buildConfig = {};
		}
		buildConfig = normalizeCfg.build(buildConfig);
		var layersMap = buildConfig.layersByName;
		var layer = layersMap[layerName];

		var loaderConfig = grunt.config(loaderCfg);
		if (!loaderConfig) {
			grunt.fail.warn("No loader config was found.");
			loaderConfig = {};
		}
		loaderConfig = normalizeCfg.loader(grunt.config(loaderCfg));

		var shimConfig = loaderConfig.shim;

		var utils = getUtils(loaderConfig);

		// Return true if shim2 is a deps of shim1
		// shim1 is an object and shim2 is a string
		function isDeps(shim1, shim2) {
			return shim1.deps && (shim1.deps.indexOf(shim2) !== -1);
		}

		// return an array of all the dependencies of `deps`
		// deps is an array of dependencies from a shim config
		function getAllDependencies(deps) {
			var result = [];
			var fifo = [].concat(deps);
			while (fifo.length) {
				var currId = fifo.pop();
				result.push(currId);

				var currValue = shimConfig[currId];
				if (currValue && currValue.deps) {
					currValue.deps.forEach(function (id) {
						if (result.indexOf(id) === -1) {
							fifo.push(id);
						}
					});
				}
			}
			return result;
		}

		if (layer.shim) {
			// Expand the list of shim with all their dependencies
			var shims = layer.shim.reduce(function (shims, shimId) {
				shims.push(shimId);
				if (shimConfig[shimId] && shimConfig[shimId].deps) {
					getAllDependencies(shimConfig[shimId].deps).forEach(function (dep) {
						if (shims.indexOf(dep) === -1) {
							shims.push(dep);
						}
					});
					return shims;
				} else {
					return shims;
				}
			}, []);

			// reset layer.shim to put shims back in order
			layer.shim = [];

			// Alert user if a shim that they wanted to exclude will be included anyway
			shims.forEach(function (shimId) {
				if (layer.exclude.indexOf(shimId) !== -1 || layer.excludeShallow.indexOf(shimId) !== -1) {
					grunt.fail.warn("You tried to exclude " + shimId + " but it will be included anyway as it " +
						"is pulled as a dependency by another shim. You can try removing it from the exclude list " +
						"or excluded the shim(s) depending on it.");
				}
			});

			// First add AMD dependencies that should have no dependencies so they can be loaded first and in any order.
			// cf: https://github.com/jrburke/requirejs/blob/7b83f238885109cb773b922efb8d53db652952d6/docs/api.html#L687
			var amdDeps = [];
			shims = shims.filter(function (shimId) {
				var value = shimConfig[shimId];
				if (!value) {
					if (amdDeps.indexOf(shimId) === -1) {
						amdDeps.push(shimId);
					}
					return false;
				} else {
					return true;
				}
			});
			amdDeps.forEach(function (dep) {
				var value = {
					filepath: utils.nameToFilepath(dep)
				};
				value.content = grunt.file.read(value.filepath);
				layer.shim.push(value);
			});


			// Get the list of all dependencies for each shim to order them
			var shimMap = shims.reduce(function (shimMap, shimId) {
				shimMap[shimId] = {
					deps: shimConfig[shimId].deps ? getAllDependencies(shimConfig[shimId].deps) : [],
					exports: shimConfig[shimId].exports,
					init: shimConfig[shimId].init
				};
				return shimMap;
			}, {});

			// Sort shims with respect to dependencies order.
			shims = Object.keys(shimMap).sort(function (shim1, shim2) {
				var value1 = shimMap[shim1];
				var value2 = shimMap[shim2];

				if (isDeps(value1, shim2)) {
					return 1;
				} else if (isDeps(value2, shim1)) {
					return -1;
				} else {
					return 0;
				}
			});

			// Add the shims to the layer.
			shims.forEach(function (id) {
				var shimValue = {
					filepath: utils.nameToFilepath(id)
				};

				shimValue.content = grunt.file.read(shimValue.filepath) +
					"\ndefine(\"" + id + "\", (function (global) {\n" +
					"	return function () {\n" +
					"		var ret;\n" +
					(shimMap[id].init ? (
					"		var fn = " + shimMap[id].init.toString() + ";\n" +
					"       ret = fn.apply(global, arguments);\n") : "") +
					(shimMap[id].exports ?
					"		return ret || global[\"" + shimMap[id].exports + "\"];\n" :
						"		return ret;\n") +
					"    };\n" +
					"})(this));";

				layer.shim.push(shimValue);
			});

			// Save the config
			grunt.config([buildCfg], buildConfig);
		}

	});
};
