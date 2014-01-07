"use strict";


module.exports = function (grunt) {
    var forEachModules = require("./lib/utils").forEachModules;

    grunt.registerTask("amdConcat", "Prototype plugin for Dojo 2 build system", function () {
        var configProp = this.args[0],
            layerName = this.args[1],
            config = grunt.config([configProp]),
            pluginFiles = config.pluginFiles,
            layerPath = config.layers[layerName].outputPath,
            modules = config.layers[layerName].modules,
            buffer = config.layers[layerName].header;

        pluginFiles.forEach(function (o) {
            grunt.file.write(o.filepath, o.content);
        });

        forEachModules(modules, layerName, function (module) {
            buffer += module.content + ";";
        });

        grunt.file.write(layerPath, buffer);
        grunt.log.write("Writing the layer " + layerPath + "...").ok();
    });

};
