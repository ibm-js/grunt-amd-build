"use strict";

module.exports = function (grunt) {

	// A temporary directory used by amdserialize to output the processed modules.
	var tmpdir = "tmp/";

	// The final output directory.
	var outdir = "build/";

	// The grunt.config property populated by amdserialize, containing the
	// list of files to include in the layer.
	var outprop = "amdoutput";

	grunt.initConfig({
		// The loader config should go here.
		amdloader: {
			// Everything should be relative to baseUrl
			baseUrl: "./",

			// Here goes the config for the amd plugins build process (has, i18n, ecma402...).
			config: {}
		},

		// The common build config
		amdbuild: {
			// dir is the destination of processed files.
			dir: tmpdir,

			// List of plugins that the build should not try to resolve at build time.
			runtimePlugins: [],

			// List of layers to build.
			layers: [{
				name: "main",
				include: [
					// Modules listed here, and their dependencies, will be added to this layer.
				],
				includeLayers: [
					// The content of the layers listed here will be added to this layer.
				],
				includeShallow: [
					// Only the modules listed here (ie. NOT their dependencies) will be added to this layer.
				],
				exclude: [
					// Modules listed here, and their dependencies, will NOT be in this layer.
				],
				excludeLayers: [
					// The content of the layers listed here will NOT be in this layer.
				],
				excludeShallow: [
					// Only the modules listed here (ie. NOT their dependencies)  will NOT be in this layer.
				],
			}, {
				name: "main.min",
				include: [
					// Modules and layers listed here, and their dependencies, will be added to the layer.
				]
			}]
		},

		// Config to allow uglify to generate the minified layer.
		uglify: {
			options: {
				banner: "/* My Custom banner */" + "<%= " + outprop + ".header%>",
				sourceMap: true
			},
			dist: {
				src: "<%= " + outprop + ".modules.abs %>",
				dest: outdir + "<%= " + outprop + ".layerPath %>"
			}
		},

		// Config to allow concat to generate a not minified layer.
		concat: {
			options: {
				banner: "/* My Custom banner */" + "<%= " + outprop + ".header%>"
			},
			dist: {
				src: "<%= " + outprop + ".modules.abs %>",
				dest: outdir + "<%= " + outprop + ".layerPath %>"
			}
		},

		// Copy the plugin files to the final output directory.
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

		grunt.task.run("erase");

		layers.forEach(function (layer) {
			grunt.task.run("amddepsscan:" + layer.name + ":" + name + ":" + amdloader);
			grunt.task.run("amdserialize:" + layer.name + ":" + name + ":" + amdloader + ":" + outprop);
			// Generate a minified layer only if the name ends with ".min".
			if (layer.name.search(/\.min$/) !== -1) {
				grunt.task.run("uglify");
			} else {
				grunt.task.run("concat");
			}
			grunt.task.run("copy:plugins");
		});

		grunt.task.run("amdreportjson:" + name);
	});


	// Load the plugin that provides the "amd" task.
	grunt.loadNpmTasks("grunt-amd-build");

	// Load vendor plugins.
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
};
