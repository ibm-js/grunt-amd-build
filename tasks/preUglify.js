"use strict";

module.exports = function (grunt) {
    var helper = require("./lib/helper");

    grunt.registerTask("preUglify", "Prototype plugin for Dojo 2 build system", function () {
        var deps = grunt.config("internal.deps"),
            out = grunt.config("out");

        deps = deps.map(helper.midToPath);

        deps = deps.map(function (filepath) {
            // Read file source.
            var src = grunt.file.read(filepath),
                res = helper.addModuleName(src, filepath),
                dest = out + filepath;

            grunt.file.write(dest, res);
            return dest;
        });

        grunt.config(["uglify", "defaultOptions", "files", out + "src.js"], deps);
    });

};
