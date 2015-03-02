module.exports = function (layersMap, layer, loaderConfig, lib, parse, normalizeResource) {
	"use strict";

	var getLayerDeps = require("./getLayerDeps");
	var eachProp = require("./lang").eachProp;
	var concatMids = require("./lang").concatMids;

	// Init the exclude map with cjs modules.
	var excludedModulesMap = {
		require: true,
		exports: true,
		module: true
	};

	var excludedResourcesMap = {};

	// Start with exclude
	var exclude = lib.filterMids(layer.exclude);

	// Add exclude dependencies
	var deps = lib.filterMids(exclude.modules.reduce(function (deps, mid) {
		var current = lib.getModuleFromMid(mid);
		return deps.concat(parse.findDependencies(current.mid, current.content).map(lib.getNormalize(current.mid)));
	}, []));
	exclude = concatMids(exclude, deps);

	// Add excludeShallow
	exclude = concatMids(exclude, lib.filterMids(layer.excludeShallow));

	// Add shims and their dependencies
	var shimDeps = [];
	if (loaderConfig.shim) {
		shimDeps = shimDeps.concat(Object.keys(loaderConfig.shim));
		eachProp(loaderConfig.shim, function (name, value) {
			shimDeps = shimDeps.concat(value.deps || []);
		});
	}
	// Shim dependencies can only be modules not plugins
	exclude.modules = exclude.modules.concat(shimDeps);

	// Add layer dependencies
	var layerDeps = getLayerDeps(layer.excludeLayers, layersMap, lib);
	exclude = concatMids(exclude, lib.filterMids(layerDeps));

	// Add excluded modules to the map
	exclude.modules.forEach(function (mid) {
		excludedModulesMap[mid] = true;
	});

	// Normalize plugins
	exclude.plugins = exclude.plugins.map(function (name) {
		name.resource = normalizeResource(name, lib.getNormalize());
		return name;
	});

	// Add excluded resources to the map
	exclude.plugins.forEach(function (name) {
		if (!excludedResourcesMap[name.mid]) {
			excludedResourcesMap[name.mid] = [];
		}
		excludedResourcesMap[name.mid].push(name.resource);
	});

	return {
		// True if the module should be added in the layer.
		isModuleToInclude: function (mid) {
			return !excludedModulesMap[mid];
		},
		// True if the resource should be processed
		isResourceToProcess: function (name) {
			var plugin = excludedResourcesMap[name.mid];
			return !plugin || plugin.indexOf(name.resource) === -1;
		},
		// True if mid is explicitly listed in exclude or excludeShallow
		isStrictlyExcluded: function (mid) {
			return layer.exclude.indexOf(mid) >= 0 || layer.excludeShallow.indexOf(mid) >= 0;
		}
	};
};
