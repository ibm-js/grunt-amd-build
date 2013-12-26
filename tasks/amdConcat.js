"use strict";


module.exports = function (grunt) {
	var forEachModules = require("./lib/utils").forEachModules;

    grunt.registerTask("amdConcat", "Prototype plugin for Dojo 2 build system", function () {
        var configProp = this.args[0],
            layerName = this.args[1],
			dir = grunt.config([configProp, "dir"]),
            layerPath = grunt.config([configProp, "layers", layerName, "outputPath"]),
			modules = grunt.config([configProp, "layers", layerName, "modules"]),
            buffer = "",
            mid;
	     
		forEachModules(modules, layerName, function(module){
			buffer += module.content + ";" ;
		});
		
		grunt.file.write(layerPath, buffer);
        grunt.log.write("Writing the layer " + layerPath + "...").ok();
    });

};
