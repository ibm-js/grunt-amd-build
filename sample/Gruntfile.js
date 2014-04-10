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
			layers: [{
				name: "layerName",
				include: [
					// Packages listed here will be added to the layer.
				],
				exclude: [
					// Packages listed here will NOT be in the layer.
				]
			}]
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

		// Config to allow concat to generate the layer.
		concat: {
			options: {
				banner: "<%= " + outprop + ".header%>"
			},
			dist: {
				src: "<%= " + outprop + ".modules.abs %>",
				dest: "<%= " + outprop + ".layerPath %>"
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
			layers = grunt.config(name).layers;

		layers.forEach(function (layer) {
			grunt.task.run("amddepsscan:" + layer.name + ":" + name + ":" + amdloader);
			grunt.task.run("amdplugins:" + layer.name + ":" + name + ":" + amdloader);
			grunt.task.run("amdserialize:" + layer.name + ":" + name + ":" + outprop);
			grunt.task.run("concat");
			grunt.task.run("copy");
		});
	});


	// Load the plugin that provides the "amd" task.
	grunt.loadNpmTasks("grunt-amd-build");

	// Load vendor plugins.
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');

	// Default task.
	grunt.registerTask("default", ["clean:erase", "amdbuild:amdloader", "clean:finish"]);
};
