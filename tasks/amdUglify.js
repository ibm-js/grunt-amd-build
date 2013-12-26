"use strict";

module.exports = function (grunt) {
    var forEachModules = require("./lib/utils").forEachModules;

    grunt.registerTask("amdUglify", "Prototype plugin for Dojo 2 build system", function () {
        var configProp = this.args[0],
            layerName = this.args[1],
            dir = grunt.config([configProp, "dir"]),
            layerPath = grunt.config([configProp, "layers", layerName, "outputPath"]),
            modules = grunt.config([configProp, "layers", layerName, "modules"]),
            deps = [],
            sourceMapOptions;

        forEachModules(modules, layerName, function (module) {
            grunt.file.write(dir + "sourceMap/" + module.mid + ".js", module.content);
            deps.push(dir + "sourceMap/" + module.mid + ".js");
        });

        var parts = layerPath.split("/");
        parts.pop();
        var layerDir = parts.join("/");

        sourceMapOptions = {
            sourceMap: layerDir + "/source-map.js",
            sourceMapRoot: "../../",
            sourceMappingURL: "./source-map.js"
        };
        grunt.config(["uglify", layerName, "files", layerPath], deps);
        grunt.config(["uglify", layerName, "options"], sourceMapOptions);
        grunt.task.run(["uglify:" + layerName]);
    });

};
