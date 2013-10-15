/*
 * dojo-proto
 * https://github.com/mathieu/grunt
 *
 * Copyright (c) 2013 
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('depsScan', 'Prototype plugin for Dojo 2 build system', function() {
   	var options = this.options();
	grunt.log.writeln("List of modules to include:");
	options.modulesList.forEach(function(deps){grunt.log.writeln(deps);});
	grunt.config('internal.deps', options.modulesList);
  });

};
