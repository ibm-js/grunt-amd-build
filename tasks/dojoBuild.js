"use strict";

module.exports = function (grunt) {

    // Main task

    grunt.registerTask("dojoBuild", function(){
		var layers = grunt.config("dojoBuild.layers"),
			optimize = grunt.config("dojoBuild.optimize"),
			tasks = ["depsScan"];
		
		switch(optimize){
			case "none":
				tasks.push("amdConcat");
				break;
			case "uglify":
				tasks.push("amdUglify");
				break;
		}
			
		for(var layer in layers){
			if(layers.hasOwnProperty(layer)){
				grunt.task.run(tasks.map(function(task){return task+":"+layer;}));		
			}
		}
		
	});

};
