"use strict";

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                "Gruntfile.js",
                "tasks/**/*.js"
            ],
            options: {
                jshintrc: ".jshintrc",
            },
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ["tmp"],
        },

        jsbeautifier: {
            files: ["Gruntfile.js", "tasks/**/*.js"],
            options: {
                config: ".jshintrc",
                js: {
                    jslintHappy: true,
                }
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-nodeunit");
    grunt.loadNpmTasks("grunt-jsbeautifier");

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask("test", ["clean", "dojo_build", "nodeunit"]);

    // By default, lint and run all tests.
    grunt.registerTask("default", ["jsbeautifier", "jshint"]);

};
