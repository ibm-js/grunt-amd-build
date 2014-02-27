"use strict";

module.exports = function (grunt) {
	var allFiles = [
		"Gruntfile.js",
		"tasks/**/*.js"
	];

	// Project configuration.
	grunt.initConfig({
		jshint: {
			all: allFiles,
			options: {
				jshintrc: ".jshintrc",
			},
		},

		lineending: {
			all: {
				options: {
					eol: 'crlf',
					overwrite: true
				},
				files: {
					'': allFiles
				}
			}
		},

		jsbeautifier: {
			files: allFiles,
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
	grunt.loadNpmTasks("grunt-lineending");

	// By default, beautify and lint.
	grunt.registerTask("default", ["jsbeautifier", "lineending", "jshint"]);

};
