"use strict";

module.exports = function (grunt) {

    // Main task

    grunt.registerTask("dojo_build", ["depsScan", "concatAmd"]);

};
