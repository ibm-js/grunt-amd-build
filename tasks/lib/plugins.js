module.exports = function (requirejs, layer, utils, lib, toTransport, buildConfig) {

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

	function isAlreadyProcessed(name) {
		return layer.plugins[name.mid] && layer.plugins[name.mid].indexOf(name.resource) >= 0;
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

	function getPlugin(mid) {
		// Load the plugin.
		var plugin = requirejs(mid);

		// Replace plugin by plugin builder if any.
		var pluginBuilder = plugin.pluginBuilder;
		if (pluginBuilder) {
			pluginBuilder = utils.normalize(pluginBuilder, mid, true);
			plugin = requirejs(pluginBuilder);
		}
		return {
			plugin: plugin,
			pluginBuilder: pluginBuilder
		};
	}

	function processHelper(name, normalize, isResourceToProcess) {
		// Normalize resource.
		name.resource = pluginLib.normalizeResource(name, normalize);

		// Check if resource should be processed
		if ((isResourceToProcess && !isResourceToProcess(name)) || isAlreadyProcessed(name)) {
			return [];
		}

		// Load the plugin.
		var plugin = getPlugin(name.mid);
		var pluginBuilder = plugin.pluginBuilder;
		plugin = plugin.plugin;

		// List of mids to include in the layer
		var pluginModules = [];

		function addModules(modules) {
			var names = lib.filterMids(modules.map(normalize));
			pluginModules = pluginModules.concat(pluginLib.process(names, normalize, isResourceToProcess));
		}


		requirejs((pluginBuilder || name.mid) + "!" + name.resource);

		// Call write method if any
		plugin.write && plugin.write(name.mid, name.resource, write, {});

		// Call writeFile method if any
		plugin.writeFile && plugin.writeFile(name.mid, name.resource, requirejs, writeFile, {});

		// Call addModules method if any
		plugin.addModules && plugin.addModules(name.mid, name.resource, addModules, {});

		// Store the resource that was just processed.
		addPluginResource(name.mid, name.resource);

		// Store the onLayerEnd function from the plugin for layer use.
		if (plugin.onLayerEnd) {
			onLayerEndCb[name.mid] = plugin.onLayerEnd;
		}

		return pluginModules;
	}

	var onLayerEndCb = {};

	var pluginLib = {
		normalizeResource: function (name, normalize) {
			var resource = name.resource;

			// Load the plugin.
			var plugin = getPlugin(name.mid).plugin;

			// Normalize resource.
			if (plugin.normalize) {
				resource = plugin.normalize(resource, normalize);
			} else {
				resource = normalize(resource);
			}
			return resource;
		},

		process: function (names, normalize, isResourceToProcess) {
			// Process plugins
			var pluginDeps = names.plugins.reduce(function (pluginDeps, name) {
				pluginDeps.push(name.mid);
				if (isPluginToProcess(name.mid)) {
					return pluginDeps.concat(processHelper(name, normalize, isResourceToProcess));
				} else {
					return pluginDeps;
				}
			}, []);

			return names.modules.concat(pluginDeps);
		},

		onLayerEnd: function () {
			var data = {
				name: layer.name,
				path: layer.outputPath
			};
			Object.keys(onLayerEndCb).forEach(function (pluginName) {
				onLayerEndCb[pluginName](write, data);
			});
			onLayerEndCb = {};
		}
	};
	return pluginLib;
};
