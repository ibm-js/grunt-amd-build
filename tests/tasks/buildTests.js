"use strict";
var q = require("promised-io");

module.exports = function (grunt) {

	function getDeferredCallback(deferred) {
		return function (error, results) {
				if (error !== null) {
					grunt.log.writeln(results.stdout);
					deferred.reject(error);
				} else {
					deferred.resolve();
				}
			};
	}

	function bowerInstall(options) {
		var deferred = new q.Deferred();
		grunt.log.writeln("Installing bower dependencies for " + options.cwd + "...");
		grunt.util.spawn({
			cmd: "bower",
			args: ["install"],
			opts: options
		}, getDeferredCallback(deferred));
		return deferred.promise;
	}

	function npmInstall(options) {
		var deferred = new q.Deferred();
		grunt.log.writeln("Installing npm dependencies for " + options.cwd + "...");
		grunt.util.spawn({
			cmd: "npm",
			args: ["install"],
			opts: options
		}, getDeferredCallback(deferred));
		return deferred.promise;
	}

	function startBuild(options, path) {
		// replace grunt-amd-build sources with current version
		var dest = options.cwd + "/node_modules/grunt-amd-build/";
		grunt.file.expandMapping(["tasks/**/*"], dest, {filter: "isFile"}).forEach(function (map) {
			grunt.file.copy(map.src, map.dest, {encoding: null});
		});

		// remove previous output if any
		grunt.file.delete(path + "/results");

		var deferred = new q.Deferred();
		grunt.log.writeln("Starting build for " + options.cwd + "...");
		grunt.util.spawn({
			cmd: "grunt",
			args: ["build"],
			opts: options
		}, getDeferredCallback(deferred));
		return deferred.promise;
	}

	function checkBuild(path) {
		grunt.log.writeln("Checking build output for " + path + "/src...");

		var expected = grunt.file.expand({
			filter: "isFile"
		}, [path + "/expected/**/*"]).sort();
		var results = grunt.file.expand({
			filter: "isFile"
		}, [path + "/results/**/*"]).sort();

		return expected.every(function (value, index) {
			function getFile(path) {
				return grunt.util.normalizelf(grunt.file.read(path));
			}
			var test = (getFile(value) === getFile(results[index]));
			if (!test) {
				grunt.log.writeln(JSON.stringify(expected, null, "\t"));
				grunt.log.writeln(JSON.stringify(results, null, "\t"));
				grunt.log.writeln("");
				grunt.log.writeln(results[index] + " is different of " + value);
			}
			return test;
		});
	}

	function runBuildTest(path) {
		var deferred = new q.Deferred();

		var options = {
			cwd: path + "/src"
		};

		var steps = [];
		if (grunt.file.exists(options.cwd + "/bower.json")) {
			steps.push(function () {
				return bowerInstall(options);
			});
		}

		steps.push(function () {
			return npmInstall(options);
		});
		steps.push(function () {
			return startBuild(options, path);
		});

		q.seq(steps).then(function () {
			if (checkBuild(path)) {
				deferred.resolve();
				grunt.log.write(path + ": ");
				grunt.log.ok();
			} else {
				deferred.reject();
			}
		});

		return deferred.promise;
	}

	grunt.registerTask("buildTests", function () {
		var done = this.async();
		var config = grunt.config(this.name);

		q.all(config.paths.map(function (path) {
			return runBuildTest(path);
		})).then(done);
	});

};
