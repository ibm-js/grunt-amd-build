"use strict";

module.exports = function (grunt) {

    grunt.registerTask("depsScan", "Prototype plugin for Dojo 2 build system", function () {
        var modulesList = grunt.config("modulesList");

        grunt.log.writeln("List of modules to include:");
        modulesList.forEach(function (deps) {
            grunt.log.writeln(deps);
        });
        grunt.config("internal.deps", modulesList);
    });

};
