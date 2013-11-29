"use strict";

module.exports = function (grunt) {

    // Main task

    grunt.registerTask("amdBuild", function () {
        var layers = grunt.config("amdBuild.layers"),
            optimize = grunt.config("amdBuild.optimize"),
            tasks = ["depsScan"];

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
                    return task + ":" + layer;
                }));
            }
        }

    });

};
