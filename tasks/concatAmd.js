"use strict";

module.exports = function(grunt) {
  
  grunt.registerMultiTask("concatAmd", "Prototype plugin for Dojo 2 build system", function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options(),
		res = "",
		deps = grunt.config("internal.deps"),
		out = grunt.config("out"),
		fileToModule = function(filepath){
			return filepath.substring(0, filepath.length-3);
		},
		addModuleName = function(src, filepath){
			return src.replace(/^define\(/, "define('"+fileToModule(filepath)+"',");
		};
		
	
	deps = deps.map(function(dep){return dep + ".js";});

	deps = deps.filter(function(filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      });
	  
	res = deps.map(function(filepath) {
        // Read file source.
		var src = grunt.file.read(filepath);
        return addModuleName(src,filepath);
      }).join(";")
	grunt.file.write(out+"src.js", res);
		
	grunt.log.writeln("Writing the layer " + out + "src.js:");
    deps.forEach(function(dep){grunt.log.writeln("File " + dep);});
  });

};
