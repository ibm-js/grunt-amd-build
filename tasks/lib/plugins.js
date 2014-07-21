module.exports = function (requirejs, layer, utils, toTransport) {

	// Add processed resources to the layer data for logging
	// and to avoid multiple processing of the same resource.
	function addPluginResource(pluginName, resource) {
		var plugins = layer.plugins;

		if (!plugins[pluginName]) {
			plugins[pluginName] = [];
		}
		plugins[pluginName].push(resource);
	}


	function write(content) {
		layer.header += content;
	}
	write.asModule = function (moduleName, content) {
		var filepath = utils.nameToFilepath(moduleName);
		layer.modules[moduleName] = {
			mid: moduleName,
			content: toTransport(moduleName, filepath, content),
			filepath: filepath
		};
	};

	function writeFile(filepath, content) {
		var pluginsFiles = layer.pluginsFiles;
		pluginsFiles[filepath] = (pluginsFiles[filepath] || "") + content;
	}
	writeFile.asModule = function (moduleName, filepath, content) {
		writeFile(filepath, toTransport(moduleName, filepath, content));
	};

	return function (pluginName, resources) {
		var plugin = requirejs(pluginName);
		var pluginModules = [];

		function addModules(modules) {
			modules = modules.map(function (mid) {
				return utils.normalize(mid, pluginName, true);
			});
			pluginModules = pluginModules.concat(modules);
		}

		var pluginBuilder = plugin.pluginBuilder;

		if (pluginBuilder) {
			pluginBuilder = utils.normalize(pluginBuilder, pluginName, true);
			plugin = requirejs(pluginBuilder);
		}

		while (resources.length) {
			var resource = resources.pop();

			requirejs((pluginBuilder || pluginName) + "!" + resource);

			if (plugin.write) {
				plugin.write(pluginName, resource, write, {});
			}
			if (plugin.writeFile) {
				plugin.writeFile(pluginName, resource, requirejs, writeFile, {});
			}
			if (plugin.addModules) {
				plugin.addModules(pluginName, resource, addModules, {});
			}
			addPluginResource(pluginName, resource);
		}

		if (plugin.onLayerEnd) {
			plugin.onLayerEnd(write, {
				name: layer.name,
				path: layer.outputPath
			});
		}

		return pluginModules;
	};
};
