"use strict";

module.exports = function (grunt) {

	// A temporary directory used by amdserialize to output the processed modules.
	var tmpdir = "./tmp/";

	// The final output directory.
	var outdir = "./build/";

	// The grunt.config property populated by amdserialize, containing the
	// list of files to include in the layer.
	var outprop = "amdoutput";


	grunt.initConfig({
		// The loader config should go here.
		amdloader: {
			baseUrl: "./",

			// Enable build of requirejs-text/text
			inlineText: true,

			// Here goes the config for the amd plugins build process (has, i18n, ecma402...).
			config: {
			}
		},

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
					// Modules and layers listed here, and their dependencies, will be added to the layer.
				],
				includeShallow: [
					// Only the modules listed here (ie. NOT their dependencies) will be added to the layer.
				],
				exclude: [
					// Modules and layers listed here, and their dependencies, will NOT be in the layer.
				],
				excludeShallow: [
					// Only the modules listed here (ie. NOT their dependencies)  will NOT be in the layer.
				]
			}]
		},

		// Config to allow uglify to generate the layer.
		uglify: {
			options: {
				banner: "<%= " + outprop + ".header%>",
				sourceMap: true
			},
			dist: {
				src: "<%= " + outprop + ".modules.abs %>",
				dest: outdir + "<%= " + outprop + ".layerPath %>"
			}
		},

		// Copy the plugin files to the real output directory.
		copy: {
			plugins: {
				expand: true,
				cwd: tmpdir,
				src: "<%= " + outprop + ".plugins.rel %>",
				dest: outdir,
				dot: true
			}
		},

		// Erase previous build.
		clean: {
			erase: [outdir]
		}
	});


	// The main build task.
	grunt.registerTask("amdbuild", function (amdloader) {
		var name = this.name,
			layers = grunt.config(name).layers;

		layers.forEach(function (layer) {
			grunt.task.run("amddepsscan:" + layer.name + ":" + name + ":" + amdloader);
			grunt.task.run("amdserialize:" + layer.name + ":" + name + ":" + amdloader + ":" + outprop);
			grunt.task.run("uglify");
			grunt.task.run("copy:plugins");
		});
	});


	// Load the plugin that provides the "amd" task.
	grunt.loadNpmTasks("grunt-amd-build");

	// Load vendor plugins.
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');

	// Default task.
	grunt.registerTask("default", ["clean:erase", "amdbuild:amdloader", "amdreportjson:amdbuild"]);
};
