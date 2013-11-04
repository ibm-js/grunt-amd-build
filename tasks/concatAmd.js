"use strict";


module.exports = function (grunt) {

    var helper = require("./lib/helper");

    grunt.registerTask("concatAmd", "Prototype plugin for Dojo 2 build system", function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var res = "",
            deps = grunt.config("internal.deps"),
            out = grunt.config("out");

        deps = deps.map(helper.midToPath);

        deps = deps.filter(function (filepath) {
            // Warn on and remove invalid source files (if nonull was set).
            if (!grunt.file.exists(filepath)) {
                grunt.log.warn('Source file "' + filepath + '" not found.');
                return false;
            } else {
                return true;
            }
        });

        res = deps.map(function (filepath) {
            // Read file source.
            var src = grunt.file.read(filepath);
            return helper.addModuleName(src, filepath);
        }).join(";");
        grunt.file.write(out + "src.js", res);

        grunt.log.writeln("Writing the layer " + out + "src.js:");
        deps.forEach(function (dep) {
            grunt.log.writeln("File " + dep);
        });
    });

};
