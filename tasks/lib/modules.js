module.exports = function (requirejs, utils, buildConfig, warn) {
	"use strict";
	var fs = require('fs');

	var runtimePlugins = buildConfig ? buildConfig.runtimePlugins || [] : [];

	var cache = {};

	// This method is private.
	//
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

	// This method is private.
	//
	// Take a name as returned by splitPluginMid and returns a boolean.
	function isBuildtimePlugin(name) {
		var resources = name.resource || (name.resources && name.resources.length !== 0);
		return resources && runtimePlugins.indexOf(name.mid) < 0;
	}

	// current is a mid.
	// Return a function that will normalize mid relatively
	// to current.
	function getNormalize(current) {
		return function normalize(mid) {
			var name = splitPluginMid(mid);
			name.mid = utils.normalize(name.mid, current, true);

			if (isBuildtimePlugin(name)) {
				// This module is a plugin and should be optimized at buildtime
				// so the resource is normalized to ease things up later
				var plugin = requirejs(name.mid);
				if (plugin.normalize) {
					name.resource = plugin.normalize(name.resource, function (mid) {
						return utils.normalize(mid, current, true);
					});
				} else {
					name.resource = utils.normalize(name.resource, current, true);
				}
				return name.mid + "!" + name.resource;
			} else {
				return name.mid;
			}
		};
	}

	// Take a normalized module id and return a module object containing
	// the module id and the filepath of the module.
	function getModuleFromMid(mid) {
		var name = splitPluginMid(mid);

		if (!cache[name.mid]) {
			var path = utils.nameToFilepath(name.mid);
			cache[name.mid] = {
				mid: name.mid,
				filepath: path,
				content: readFile(path),
				resources: []
			};
		}

		if (isBuildtimePlugin(name)) {
			cache[name.mid].resources.push(name.resource);
		}
		return cache[name.mid];
	}

	function getModuleFromPath(path) {
		var mid = path.slice(0, -3);

		if (!cache[mid]) {
			cache[mid] = {
				mid: mid,
				filepath: path,
				content: readFile(path),
				resources: []
			};
		}
		return cache[mid];
	}

	// Synchronously read a file and return its content.
	// If the file is not found, return an empty string
	// and produce a warning.
	function readFile(path) {
		var content = "";
		try {
			content = fs.readFileSync(path).toString();
		} catch (e) {
			if (e.code === "ENOENT") {
				warn("Source file " + e.path + " not found.");
			} else {
				throw e;
			}
		}
		return content;
	}

	// Produce a warning if a module with a layer name is included.
	function warnConflictLayerName(module, layerName, layersMap) {
		if (module.mid !== layerName && layersMap[module.mid]) {
			warn("The layer " + layerName + " contains the module " + module.mid +
				" which is also a layer name.\nThis is likely to cause problems as the layer " +
				module.mid + " will not be loaded if the layer " +
				layerName + " is loaded before the layer " + module.mid + ".");
		}
	}

	return {
		getNormalize: getNormalize,
		getModuleFromMid: getModuleFromMid,
		getModuleFromPath: getModuleFromPath,
		warnConflictLayerName: warnConflictLayerName
	};

};
