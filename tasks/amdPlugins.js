module.exports = function (grunt) {
	"use strict";

	var libDir = "./lib/",
		eachProp = require(libDir + "lang").eachProp,
		normalizeCfg = require(libDir + "normalizeConfig"),
		getUtils = require(libDir + "utils"),
		requirejs = require("requirejs");

	grunt.registerTask("amdPlugins", function (layerName, buildCfg, loaderCfg) {
		var done = this.async(),
			pluginConfig = grunt.config(this.name) || {},
			loaderConfig = grunt.config(loaderCfg),
			utils = getUtils(loaderConfig),
			buildConfig = normalizeCfg.build(grunt.config(buildCfg)),
			layerConfig = buildConfig.layers[layerName],
			plugins = layerConfig.plugins,

			write = function (content) {
				layerConfig.header += content;
			},
			writeFile = function (filepath, content) {
				var o = {
					filepath: buildConfig.dir + filepath,
					content: content
				};
				layerConfig.pluginsFiles.push(o);
			},
			normalize = function (mid, current) {
				return utils.normalize(mid, current, true);
			},
			task = function (req) {
				req(["transform"], function (transform) {
					var filteredPlugins = {},
						toTransport = function (moduleName, content) {
							var filepath = utils.nameToFilepath(moduleName);
							return transform.toTransport(null, moduleName, filepath, content);
						};

					write.asModule = function (moduleName, content) {
						content = toTransport(moduleName, content);
						layerConfig.modules[moduleName] = {
							mid: moduleName,
							content: content
						};
					};
					writeFile.asModule = function (moduleName, filepath, content) {
						content = toTransport(moduleName, content);
						writeFile(filepath, content);
					};

					if (pluginConfig.runtimePlugins) {
						eachProp(plugins, function (pluginName, resources) {
							if (pluginConfig.runtimePlugins.indexOf(pluginName) === -1) {
								filteredPlugins[pluginName] = resources;
							}
						});
						plugins = filteredPlugins;
					}

					eachProp(plugins, function (pluginName, resources) {
						var plugin = requirejs(pluginName),
							normalizedresources;

						if (plugin.pluginBuilder) {
							plugin = requirejs(normalize(plugin.pluginBuilder, pluginName));
						}


						if (plugin.normalize) {
							normalizedresources = resources.map(function (resource) {
								return plugin.normalize(resource, normalize);
							});
						} else {
							normalizedresources = resources.map(function (resource) {
								return normalize(resource, null);
							});
						}

						resources.forEach(function (resource) {
							requirejs(pluginName + "!" + resource);

							if (plugin.write) {
								plugin.write(pluginName, resource, write);
							}
							if (plugin.writeFile) {
								plugin.writeFile(pluginName, resource, requirejs, writeFile);
							}
						});

						if (plugin.onLayerEnd) {
							plugin.onLayerEnd(write, {
								name: layerName,
								path: layerConfig.outputPath
							});
						}
					});


					// Save modifications
					grunt.config([buildCfg], buildConfig);
					done(true);
				});
			};

		requirejs.config({
			//Pass the top-level main.js/index.js require
			//function to requirejs so that node modules
			//are loaded relative to the top-level JS file.
			nodeRequire: require,
			isBuild: true
		});
		requirejs.config(loaderConfig);
		requirejs.config(pluginConfig);

		requirejs.tools.useLib(task);
	});

};
