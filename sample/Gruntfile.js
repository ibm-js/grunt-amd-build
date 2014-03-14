"use strict";

module.exports = function (grunt) {

	// A temporary directory used by amdserialize to output the processed modules.
	var tmpdir = "./tmp/";

	// The final output directory.
	var outdir = "./out/";

	// The grunt.config property populated by amdserialize, containing the
	// list of files to include in the layer.
	var outprop = "amdoutput";


	grunt.initConfig({
		// The loader config should go here.
		amdloader: {},

		// The common build config
		amdbuild: {
			// dir is the output directory.
			dir: tmpdir,

			// List of plugins that the build should not try to resolve at build time.
			runtimePlugins: [],

			// List of layers to build.
			layers: {
				"layerName": {
					include: [
						// Packages listed here will be added to the layer.
					],
					exclude: [
						// Packages listed here will NOT be in the layer.
					]
				}
			}
		},

		// Here goes the config for the amd plugins build process.
		amdplugins: {
			text: {
				inlineText: true
			},
			i18n: {
				localesList: ["fr"]
			}
		},

		// Config to allow uglify to generate the layer.
		uglify: {
			options: {
				banner: "<%= " + outprop + ".header%>"
			},
			dist: {
				src: "<%= " + outprop + ".modules.abs %>",
				dest: outdir + "<%= " + outprop + ".layer %>.js"
			}
		},

		// Copy the plugin files to the real output directory.
		copy: {
			dist: {
				expand: true,
				cwd: tmpdir,
				src: "<%= " + outprop + ".plugins.rel %>",
				dest: outdir
			}
		},

		// Erase temp directory and previous build
		clean: {
			erase: [outdir],
			finish: [tmpdir]
		}
	});


	// The main build task.
	grunt.registerTask("amdbuild", function (amdloader) {
		var name = this.name,
			layers = grunt.config(name).layers, // Read the "amdbuild" config property.
			layer;

		// Clean previous build output.
		grunt.task.run("clean:erase");

		// Run all the tasks for all the layer with the right arguments.
		for (layer in layers) {
			grunt.task.run("amddepsscan:" + layer + ":" + name + ":" + amdloader);
			grunt.task.run("amdplugins:" + layer + ":" + name + ":" + amdloader);
			grunt.task.run("amdserialize:" + layer + ":" + name + ":" + outprop);
			grunt.task.run("uglify");
			grunt.task.run("copy");
			grunt.task.run("clean:finish");
		}
	});


	// Load the plugin that provides the "amd" task.
	grunt.loadNpmTasks("grunt-amd-build");

	// Load vendor plugins.
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');

	// Default task.
	grunt.registerTask("default", ["amdbuild:amdloader"]);
};
