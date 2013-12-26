"use strict";

module.exports = function (grunt) {
    var config = require("./lib/config");
    // Main task

    grunt.registerTask("amdBuild", function () {
        var configProp = this.args[0] || this.name,
            cfg = config.normalize(grunt.config(configProp)),
            layers = cfg.layers,
            optimize = cfg.optimize,
            tasks = ["depsScan", "buildPlugins"];

        configProp += "_api";
        grunt.config([configProp], cfg);

        switch (optimize) {
        case "none":
            tasks.push("amdConcat");
            break;
        case "uglify":
            tasks.push("amdUglify");
            break;
        }

        for (var layer in layers) {
            if (layers.hasOwnProperty(layer)) {
                grunt.task.run(tasks.map(function (task) {
                    return task + ":" + configProp + ":" + layer;
                }));
            }
        }

    });
};
