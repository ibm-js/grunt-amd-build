module.exports = function (requirejs, layer, utils, toTransport, buildConfig) {

	// Add processed resources to the layer data for logging
	// and to avoid multiple processing of the same resource.
	function addPluginResource(pluginName, resource) {
		var plugins = layer.plugins;

		if (!plugins[pluginName]) {
			plugins[pluginName] = [];
		}
		plugins[pluginName].push(resource);
	}

	function isPluginToProcess(pluginName) {
		return buildConfig.buildPlugins && buildConfig.runtimePlugins.indexOf(pluginName) === -1;
	}

	function isResourceToProcess(pluginName, resource) {
		return !layer.plugins[pluginName] || layer.plugins[pluginName].indexOf(resource) === -1;
	}

	// This method is private.
	//
	// Take a module id and return an object.
	// If the module id is a plugin (ie. contains a !) the function returns
	// the plugin name in mid and the resource in resource.
	// If the module id is a regular module, the function returns
	// the module name in mid and resource is an empty string.
	function splitPluginMid(mid) {
		var index = mid.indexOf('!');
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

	var onLayerEndCb = {};

	var pluginLib = {
		process: function (mid, normalize) {
			var name = splitPluginMid(mid);
			var pluginName = name.mid;
			var resource = name.resource;
			if (resource === undefined || !isPluginToProcess(pluginName) || !isResourceToProcess(resource)) {
				return [];
			}

			// Load the plugin.
			var plugin = requirejs(pluginName);

			// List of modules to include in the layer, start with the plugin itself.
			var pluginModules = [pluginName];

			function addModules(modules) {
				modules = modules.map(function (mid) {
					mid = normalize(mid);
					var modulesToAdd = pluginLib.process(mid, normalize);
					pluginModules = pluginModules.concat(modulesToAdd);
					//return only the module id.
					return splitPluginMid(mid).mid;
				});
				pluginModules = pluginModules.concat(modules);
			}

			// Replace plugin by plugin builder if any.
			var pluginBuilder = plugin.pluginBuilder;
			if (pluginBuilder) {
				pluginBuilder = utils.normalize(pluginBuilder, pluginName, true);
				plugin = requirejs(pluginBuilder);
			}

			// Normalize resource.
			if (plugin.normalize) {
				resource = plugin.normalize(resource, normalize);
			} else {
				resource = normalize(resource);
			}

			requirejs((pluginBuilder || pluginName) + "!" + resource);

			// Call write method if any
			plugin.write && plugin.write(pluginName, resource, write, {});

			// Call writeFile method if any
			plugin.writeFile && plugin.writeFile(pluginName, resource, requirejs, writeFile, {});

			// Call addModules method if any
			plugin.addModules && plugin.addModules(pluginName, resource, addModules, {});

			// Store the resource that was just processed.
			addPluginResource(pluginName, resource);

			// Store the onLayerEnd function from the plugin for layer use.
			if (plugin.onLayerEnd) {
				onLayerEndCb[pluginName] = plugin.onLayerEnd;
			}

			return pluginModules;
		},

		onLayerEnd: function () {
			var data = {
				name: layer.name,
				path: layer.outputPath
			};
			Object.keys(onLayerEndCb).forEach(function (pluginName) {
				onLayerEndCb[pluginName](write, data);
			});
			onLayerEndCb = [];
		},

		splitPluginMid: splitPluginMid
	};
	return pluginLib;
};
