"use strict";


module.exports = function (grunt) {

    var eachProp = require("./lib/lang").eachProp,
        toTransport = require("./lib/parse").toTransport,
        requirejs = require("requirejs");




    grunt.registerTask("buildPlugins", function () {
        var configProp = this.args[0],
            layerName = this.args[1],
            modules = grunt.config([configProp, "layers", layerName, "modules"]),
            plugins = grunt.config([configProp, "layers", layerName, "plugins"]),
            plugin,
            addToModules = {
                asModule: function (moduleName, content) {
                    content = toTransport(moduleName, content);
                    modules[moduleName] = {
                        mid: moduleName,
                        content: content
                    };
                }
            };

        requirejs.config({
            //Pass the top-level main.js/index.js require
            //function to requirejs so that node modules
            //are loaded relative to the top-level JS file.
            nodeRequire: require,
            isBuild: true
        });
        requirejs.config(grunt.config([configProp]));

        eachProp(plugins, function (pluginName, ressources) {
            plugin = requirejs(pluginName);
            ressources.forEach(function (ressource) {
                requirejs(pluginName + "!" + ressource);
                if (plugin.write) {
                    plugin.write(pluginName, ressource, addToModules, {});
                }
            });
        });
        grunt.config([configProp, "layers", layerName, "modules"], modules);
    });

};
