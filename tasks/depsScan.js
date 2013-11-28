"use strict";

module.exports = function (grunt) {
    var parse = require('./lib/parse'),
        utils = require('./lib/utils');
    utils.init(grunt);

    grunt.registerTask("depsScan", "Prototype plugin for Dojo 2 build system", function () {
        var layerName = this.args[0],
            layerConfig = grunt.config("dojoBuild.layers." + layerName),
            modules = {},
            includeList = [],
            excludeMap = {},
            current,

            //to include and exist
            isModuleValid = function (module) {
                if (excludeMap[module.mid] || modules[module.mid]) {
                    return false;
                }
                if (!grunt.file.exists(module.filepath)) {
                    grunt.fail.warn('Source file "' + module.filepath + '" not found.');
                    return false;
                }
                return true;
            },
            addToInclude = function (module) {
                includeList.push(module);
            },
            getMidToModule = function (current) {
                return function (mid) {
                    mid = normalize(mid, current);
                    return {
                        mid: mid,
                        filepath: utils.nameToFilepath(mid)
                    };
                };
            },
            normalize = function (mid, current) {
                return utils.normalize(mid, current, true);
            };

        grunt.log.subhead("Start to process layer: " + layerName);
        grunt.log.writeln("Looking for " + layerName + " dependencies...");

        //Populate the excludeMap
        (layerConfig.exclude || []).map(normalize).forEach(function (mid) {
            excludeMap[mid] = true;
        });

        //Initialize includeList
        [layerName].concat(layerConfig.include || []).map(getMidToModule()).filter(isModuleValid).forEach(addToInclude);

        //Search dependencies
        while (includeList.length) {
            current = includeList.pop();
            current.content = grunt.file.read(current.filepath);
            current.deps = parse.findDependencies(current.mid, current.content).map(getMidToModule(current.mid));
            current.includeDeps = current.deps.filter(isModuleValid);
            current.includeDeps.forEach(addToInclude);

            modules[current.mid] = current;
            grunt.log.writeln("Added " + current.mid + " - Filepath: " + current.filepath);
        }

        grunt.config("dojoBuild." + layerName + "._modules", modules);
    });
};
