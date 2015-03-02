
var eachProp = require("./lang").eachProp;

function parse(content) {
	var result = [];

	var match = null;
	var RE = /define\('([^"']*)',/g;
	// Extra parenthesis in the while condition to silence jshint.
	// The assignment is required here to access the matched group of a global regexp.
	while ((match = RE.exec(content))) {
		result.push(match[1]);
	}
	// if return.length < 2, it was not a layer but a module.
	//TODO add log message if undefined
	//return result.length < 2 ? undefined : result;
	return result.length < 2 ? [] : result;
}

module.exports = function (layerList, layersMap, lib) {
	return layerList.reduce(function (deps, mid) {
		// Process currently building layers.
		if (layersMap[mid]) {
			eachProp(layersMap[mid].modules, function (prop, module) {
				deps.push(module.mid);
			});
			eachProp(layersMap[mid].plugins, function (plugin, resources) {
				resources.forEach(function (resource) {
					deps.push(plugin  + "!" + resource);
				});
			});
		} else {
			// Process already built layers.
			deps = deps.concat(parse(lib.getModuleFromMid(mid).content));
		}
		return deps;
	}, []);
};

