module.exports = function (utils, warn) {
	"use strict";
	var fs = require("fs");

	var cache = {};

	// current is a mid.
	// Return a function that will normalize mid relatively
	// to current.
	function getNormalize(current) {
		return function normalize(mid) {
			return utils.normalize(mid, current, true);
		};
	}

	// Take a normalized module id and return a module object containing
	// the module id and the filepath of the module.
	function getModuleFromMid(mid) {
		if (mid.indexOf("!") >= 0) {
			throw "Method getModuleFromMid called with a plugin mid: " + mid;
		}

		if (!cache[mid]) {
			var path = utils.nameToFilepath(mid);
			cache[mid] = {
				mid: mid,
				filepath: path,
				content: readFile(path)
			};
		}
		return cache[mid];
	}

	function getModuleFromPath(path) {
		var mid = path.slice(0, -3);

		if (!cache[mid]) {
			cache[mid] = {
				mid: mid,
				filepath: path,
				content: readFile(path)
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

	// Take a module id and return an object.
	// If the module id is a plugin (ie. contains a !) the function returns
	// the plugin name in mid and the resource in resource.
	// If the module id is a regular module, the function returns
	// the module name in mid and resource is undefined.
	function splitPluginMid(mid) {
		var index = mid.indexOf("!");
		if (index === -1) {
			return {
				mid: mid
			};
		} else {
			return {
				mid: mid.substring(0, index),
				resource: mid.substring(index + 1, mid.length)
			};
		}
	}

	function filterMids(mids) {
		return mids.reduce(function (names, mid) {
			var name = splitPluginMid(mid);
			if (name.resource === undefined) {
				// Add module
				names.modules.push(name.mid);
			} else {
				// Add plugin resource
				names.plugins.push(name);
			}
			// Return object for next iteration
			return names;
		}, {
			modules: [],
			plugins: []
		});
	}

	return {
		getNormalize: getNormalize,
		getModuleFromMid: getModuleFromMid,
		getModuleFromPath: getModuleFromPath,
		warnConflictLayerName: warnConflictLayerName,
		splitPluginMid: splitPluginMid,
		filterMids: filterMids
	};

};
