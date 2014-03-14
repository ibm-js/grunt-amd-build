"use strict";

module.exports = function (grunt) {
	var filesList = [
		"*.js",
		"*.json",
		"tasks/**/*.js",
		"sample/*.js"
	];

	// Project configuration.
	grunt.initConfig({
		jshint: {
			all: filesList,
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
					'': filesList
				}
			}
		},

		jsbeautifier: {
			files: filesList,
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
