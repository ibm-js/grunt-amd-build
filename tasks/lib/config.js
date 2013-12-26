"use strict";

module.exports = (function () {
    var eachProp = require("./lang").eachProp,
        defaultConfig = {
            baseUrl: "./",
            dir: "dist/",
            optimize: "none",
            packages: [],
            map: {},
            paths: {},
            layers: {}
        },
        addTrailingSlash = function (string) {
            if (string.charAt(string.length - 1) !== '/') {
                return string + '/';
            }
            return string;
        };


    return {
        normalize: function (cfg) {
            var config = defaultConfig;

            //Copy the cfg value to config except for layers which need special treatment
            eachProp(cfg, function (prop, value) {
                if (prop !== "layers") {
                    config[prop] = value;
                }
            });

            //Make sure the baseUrl and the output dir end in a slash.
            config.baseUrl = addTrailingSlash(config.baseUrl);
            config.dir = addTrailingSlash(config.dir);


            //Adjust packages if necessary.
            if (cfg.packages) {
                config.pkgs = {};

                cfg.packages.forEach(function (pkg) {
                    pkg = typeof pkg === 'string' ? {
                        name: pkg
                    } : pkg;

                    config.pkgs[pkg.name] = {
                        name: pkg.name,
                        location: pkg.location || pkg.name,
                        main: pkg.main || "main"
                    };
                });
            }

            //Add layers.
            if (cfg.layers) {
                eachProp(cfg.layers, function (layerName, layerObj) {
                    var exclude = (layerObj.exclude || []).slice(0),
                        include = (layerObj.include || []).slice(0);
                    if (include.indexOf(layerName) < 0) {
                        include.push(layerName);
                    }
                    config.layers[layerName] = {
                        include: include,
                        exclude: exclude,
                        outputPath: config.dir + layerName + ".js"
                    };
                });
            }
            return config;
        }
    };
})();
