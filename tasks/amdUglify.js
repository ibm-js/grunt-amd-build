"use strict";

module.exports = function (grunt) {

    grunt.registerTask("amdUglify", function () {
        var layerName = this.args[0],
            modules = grunt.config("amdBuild." + layerName + "._modules"),
            dir = grunt.config("amdBuild.dir"),
            deps = [],
            mid, module,

            addModuleName = function (src, mid) {
                return src.replace(/^define\(/, "define('" + mid + "',");
            };


        for (mid in modules) {
            if (modules.hasOwnProperty(mid)) {
                module = modules[mid];
                module.content = addModuleName(module.content, module.mid);
                module.filepath = dir + module.filepath;
                grunt.file.write(module.filepath, module.content);
                deps.push(module.filepath);
            }
        }


        grunt.config(["uglify", "defaultOptions", "files", dir + "/" + layerName + ".js"], deps);
        grunt.task.run(["uglify"]);
    });

};
