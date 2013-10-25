'use strict';

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('preUglify', 'Prototype plugin for Dojo 2 build system', function() {
   	var deps = grunt.config("internal.deps"),
		out = grunt.config("out"),
		fileToModule = function(filepath){
			return filepath.substring(0, filepath.length-3);
		};
	
	deps = deps.map(function(dep){return dep + ".js";});		
	deps = deps.map(function(filepath) {
        // Read file source.
		var src = grunt.file.read(filepath),
			res = src.replace(/^define\(/, "define('"+fileToModule(filepath)+"',"),
			dest = out+filepath;
			
		grunt.file.write(dest, res)
		return dest;
    })
	
	grunt.config(['uglify', 'default_options', 'files', out+"src.js"], deps);
  });

};