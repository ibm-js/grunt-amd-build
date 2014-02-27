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

        jsbeautifier: {
            files: ["Gruntfile.js", "tasks/**/*.js"],
            options: {
                config: ".jshintrc",
                js: {
                    jslintHappy: true,
					indentWithTabs: true
                }
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-jsbeautifier");

    // By default, beautify and lint.
    grunt.registerTask("default", ["jsbeautifier", "jshint"]);

};
