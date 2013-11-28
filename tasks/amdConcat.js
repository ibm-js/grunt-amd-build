"use strict";


module.exports = function (grunt) {

    grunt.registerTask("amdConcat", "Prototype plugin for Dojo 2 build system", function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var layerName = this.args[0],
            modules = grunt.config("dojoBuild." + layerName + "._modules"),
            dir = grunt.config("dojoBuild.dir"),
            buffer = "",
            module,

            addModuleName = function (src, mid) {
                return src.replace(/^define\(/, "define('" + mid + "',");
            };

        for (module in modules) {
            if (modules.hasOwnProperty(module) && module !== layerName) {
				buffer += addModuleName(modules[module].content, modules[module].mid) + ";";
		    }
        }
		if (modules.hasOwnProperty(layerName)) {
			buffer += addModuleName(modules[layerName].content, modules[layerName].mid) + ";"
		}

        grunt.file.write(dir + "/" + layerName + ".js", buffer);

        grunt.log.writeln("Writing the layer " + dir + "/" + layerName + ".js");
    });

};
