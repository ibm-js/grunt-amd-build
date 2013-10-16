'use strict';

module.exports = function(grunt) {

  // Master task

  grunt.registerTask('dojo_build', ["depsScan", "concatAmd"]);

};
