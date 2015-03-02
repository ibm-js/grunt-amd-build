"use strict";

module.exports = function (grunt) {
	var filesList = [
		"*.js",
		"*.json",
		"tasks/**/*.js",
		"sample/*.js",
		"tests/**/*.js",
		"!**/*_min.js",
		"!tests/build/**/*"
	];

	// Project configuration.
	grunt.initConfig({
		jshint: {
			all: filesList,
			options: {
				jshintrc: ".jshintrc"
			}
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
		},

		intern: {
			local: {
				options: {
					runType: "client",
					config: "tests/local"
				}
			}
		},

		buildTests: {
			paths: grunt.file.expand({filter: "isDirectory"}, "tests/build/*")
		}
	});

	grunt.loadTasks("tests/tasks");

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-jsbeautifier");
	grunt.loadNpmTasks("grunt-lineending");
	grunt.loadNpmTasks("intern");

	// By default, beautify and lint.
	grunt.registerTask("default", ["jshint", "intern", "buildTests"]);

};
