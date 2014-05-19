module.exports = function () {
	"use strict";

	var parseLayer = require("./parseLayer");
	var eachProp = require("./lang").eachProp;

	// Init the exclude map with cjs modules.
	var excludeMap = {
		require: true,
		exports: true,
		module: true
	};

	function stripPlugin(mid) {
		return mid.split("!")[0];
	}

	function excludeLayerDeps(exclude, layersMap, getModuleFromMid) {
		function processLayerDependencies(mid) {
			// Process currently building layers.
			var layerData = layersMap[mid];
			if (layerData) {
				eachProp(layerData.modules, function (prop, module) {
					excludeMap[module.mid] = true;
				});
				// return false to remove the layer mid from the exclude list.
				return false;
			}
			// Process already built layers.
			var layerContent = parseLayer(getModuleFromMid(mid).content);
			if (layerContent) {
				layerContent.forEach(function (mid) {
					excludeMap[mid] = true;
				});
				// return false to remove the layer mid from the exclude list.
				return false;
			}
			return true;
		}
		return exclude.filter(processLayerDependencies);
	}

	function excludeArray(arr) {
		arr.forEach(function (mid) {
			mid = stripPlugin(mid);
			excludeMap[mid] = true;
		});
	}

	// Test if the module should be added in the layer.
	function isMidToInclude(mid) {
		mid = stripPlugin(mid);
		return !excludeMap[mid];
	}

	return {
		excludeArray: excludeArray,
		excludeLayerDeps: excludeLayerDeps,
		isMidToInclude: isMidToInclude
	};
};
