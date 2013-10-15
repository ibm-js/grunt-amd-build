/*
 * dojo-proto
 * https://github.com/mathieu/grunt
 *
 * Copyright (c) 2013 
 * Licensed under the MIT license.
 */

"use strict";

module.exports = function(grunt) {
  
  grunt.loadNpmTasks('grunt-contrib-concat');
  
  
  grunt.registerMultiTask("concatAmd", "Prototype plugin for Dojo 2 build system", function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options(),
		deps = grunt.config("internal.deps"),
		out = grunt.config("out"),
		fileToModule = function(filepath){
			return filepath.substring(0, filepath.length-3);
		},
		addModuleName = function(src, filepath){
			return src.replace(/^define\(/, "define('"+fileToModule(filepath)+"',");
		};
		
	
	deps = deps.map(function(dep){return dep + ".js";});
    
	grunt.config(["concat", "dist", "files", out+"src.js"], deps);
	grunt.config(["concat", "dist", "options", "process"], addModuleName);
	
	
	grunt.task.run("concat:dist");
	
	grunt.log.writeln("Writing the layer " + out + "src.js:");
		
	// Print a success message.
    deps.forEach(function(dep){grunt.log.writeln("File " + dep);});
	
	
	
  });

};
