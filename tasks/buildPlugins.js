"use strict";


module.exports = function (grunt) {

    var libDir = "./lib/",
        eachProp = require(libDir + "lang").eachProp,
        toTransport = require(libDir + "parse").toTransport,
        utils = require(libDir + "utils"),
        requirejs = require("requirejs");




    grunt.registerTask("buildPlugins", function () {
        var configProp = this.args[0],
            layerName = this.args[1],
            config = grunt.config([configProp]),
            pluginFiles = config.pluginFiles,
            layerConfig = config.layers[layerName],
            outputPath = layerConfig.outputPath,
            modules = layerConfig.modules,
            plugins = layerConfig.plugins,
            write = function (content) {
                layerConfig.header += content;
            },
            writeFile = function (filepath, content) {
                var o = {
                    filepath: config.dir + filepath,
                    content: content
                };
                pluginFiles.push(o);
            },
            normalize = function (mid, current) {
                return utils.normalize(mid, current, true, config);
            };

        write.asModule = function (moduleName, content) {
            content = toTransport(moduleName, content);
            modules[moduleName] = {
                mid: moduleName,
                content: content
            };
        };
        writeFile.asModule = function (moduleName, filepath, content) {
            content = toTransport(moduleName, content);
            writeFile(filepath, content);
        };


        requirejs.config({
            //Pass the top-level main.js/index.js require
            //function to requirejs so that node modules
            //are loaded relative to the top-level JS file.
            nodeRequire: require,
            isBuild: true
        });
        requirejs.config(config);

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
                normalizedresources = resources.map(normalize);
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
                    path: outputPath
                });
            }
        });

        // Save modifications
        grunt.config([configProp], config);
    });

};
