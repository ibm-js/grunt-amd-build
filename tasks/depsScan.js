
module.exports = function (grunt) {
	"use strict";

    var libDir = "./lib/",
        parse = require(libDir + "parse"),
        utils = require(libDir + "utils");

    grunt.registerTask("depsScan", function () {
        var configProp = this.args[0],
            layerName = this.args[1],
            config = grunt.config(configProp),
            layerConfig = config.layers[layerName],
            modules = {},
            plugins = {},
            includeList = [],
            excludeMap = {
                require: true,
                exports: true,
                module: true
            },
            current,

            fileExists = function (path) {
                if (!grunt.file.exists(path)) {
                    grunt.fail.warn('Source file "' + path + '" not found.');
                    return false;
                }
                return true;
            },
            //to include and exist
            isModuleValid = function (module) {
                if (excludeMap[module.mid] || modules[module.mid]) {
                    return false;
                }
                if (module.mid !== layerName && config.layers[module.mid]) {
                    grunt.fail.warn("The layer " + layerName + " contains the module " + module.mid +
                        " which is also a layer name.\nThis is likely to cause problems as the layer " +
                        module.mid + " will not be loaded if the layer " +
                        layerName + " is loaded before the layer " + module.mid + ".");
                }
                return fileExists(module.filepath);
            },
            addToInclude = function (module) {
                includeList.push(module);
            },
            getModuleFromMid = function (current) {
                return function (mid) {
                    var resource,
                        index = mid.indexOf('!');

                    if (index > -1) {
                        // This module is a plugin
                        resource = mid.substring(index + 1, mid.length);
                        mid = mid.substring(0, index);
                    }

                    mid = normalize(mid, current);

                    if (resource) {
                        if (!plugins[mid]) {
                            plugins[mid] = [];
                        }
                        plugins[mid].push(resource);
                    }

                    return {
                        mid: mid,
                        filepath: utils.nameToFilepath(mid, config)
                    };
                };
            },
            normalize = function (mid, current) {
                return utils.normalize(mid, current, true, config);
            };

        grunt.log.subhead("Starting to process layer: " + layerName);
        grunt.log.writeln("Looking for " + layerName + " dependencies...");

        //Populate the excludeMap
        layerConfig.exclude.map(normalize).forEach(function (mid) {
            var path = utils.nameToFilepath(mid, config);
            if (fileExists(path)) {
                parse.findDependencies(mid, grunt.file.read(path)).map(function (dep) {
                    return normalize(dep, mid);
                }).forEach(function (dep) {
                    excludeMap[dep] = true;
                });
            }
            excludeMap[mid] = true;
        });


        //Initialize includeList
        layerConfig.include.map(getModuleFromMid()).filter(isModuleValid).forEach(addToInclude);

        //Search dependencies
        while (includeList.length) {
            current = includeList.pop();
            current.content = parse.toTransport(current.mid, grunt.file.read(current.filepath));
            current.deps = parse.findDependencies(current.mid, current.content).map(getModuleFromMid(current.mid));
            current.includeDeps = current.deps.filter(isModuleValid);
            current.includeDeps.forEach(addToInclude);

            modules[current.mid] = current;
        }

        grunt.verbose.or.ok();
        grunt.verbose.writeln("Found dependencies for " + layerName);
        utils.forEachModules(modules, layerName, function (module) {
            grunt.verbose.writeln(module.mid);
        });

        grunt.config([configProp, "layers", layerName, "modules"], modules);
        grunt.config([configProp, "layers", layerName, "plugins"], plugins);
    });
};
