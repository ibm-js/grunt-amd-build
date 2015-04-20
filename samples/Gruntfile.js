"use strict";

module.exports = function (grunt) {

	// A temporary directory used by amdserialize to output the processed modules.
	var tmpdir = "../tmp/";

	// The final output directory.
	var outdir = "../build/";

	// The grunt.config property populated by amdserialize, containing the
	// list of files to include in the layer.
	var outprop = "amdoutput";

	grunt.initConfig({
		// The loader config should go here.
		amdloader: {
			baseUrl: "./js/"
		},

		// The common build config
		amdbuild: {
			// dir is the destination of processed files.
			dir: tmpdir,

			// List of layers to build.
			layers: [{
				name: "main.min",
				include: [
					"main"
				]
			}]
		},

		// Config to allow uglify to generate the layer.
		uglify: {
			options: {
				banner: "<%= " + outprop + ".header%>"
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
		var name = this.name;
		var	layers = grunt.config(name).layers;

		grunt.task.run("clean:erase");

		// Run all the tasks for all the layers with the right arguments.
		layers.forEach(function (layer) {
			grunt.task.run("amddepsscan:" + layer.name + ":" + name + ":" + amdloader);
			grunt.task.run("amdserialize:" + layer.name + ":" + name + ":" + amdloader + ":" + outprop);
			grunt.task.run("uglify");
			grunt.task.run("copy:plugins");
		});

		grunt.task.run("amdreportjson:" + name);
	});

	// Load the npm plugins
	grunt.loadNpmTasks("grunt-amd-build");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
};
