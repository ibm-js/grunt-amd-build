module.exports = (function () {
	"use strict";

	var eachProp = require("./lang").eachProp,
		loaderDefault = {
			baseUrl: "./",
			packages: [],
			map: {},
			paths: {}
		},
		buildDefault = {
			dir: "dist/",
			layers: {},
			pluginFiles: []
		},

		addTrailingSlash = function (string) {
			if (string.charAt(string.length - 1) !== "/") {
				return string + "/";
			}
			return string;
		};

	return {
		loader: function (config) {
			//Already normalized
			if (config._normalized) {
				return config;
			}

			//Merge with default
			eachProp(config, function (prop, value) {
				if (!value && loaderDefault[prop]) {
					value = loaderDefault[prop];
				}
			});

			//Make sure the baseUrl ends in a slash.
			config.baseUrl = addTrailingSlash(config.baseUrl);

			//Adjust packages if necessary.
			if (config.packages) {
				config.pkgs = {};

				config.packages.forEach(function (pkg) {
					pkg = typeof pkg === "string" ? {
						name: pkg
					} : pkg;

					config.pkgs[pkg.name] = {
						name: pkg.name,
						location: pkg.location || pkg.name,
						main: pkg.main || "main"
					};
				});
			}

			config._normalized = true;

			return config;
		},

		build: function (config) {
			//Already normalized
			if (config._normalized) {
				return config;
			}

			//Merge with default
			eachProp(config, function (prop, value) {
				if (!value && buildDefault[prop]) {
					value = buildDefault[prop];
				}
			});

			//Make sure the output directory ends in a slash.
			config.dir = addTrailingSlash(config.dir);

			eachProp(config.layers, function (layerName, layerObj) {
				var exclude = (layerObj.exclude || []),
					include = (layerObj.include || []).slice(0);
				if (include.indexOf(layerName) < 0) {
					include.push(layerName);
				}
				config.layers[layerName] = {
					include: include,
					exclude: exclude,
					outputPath: config.dir + layerName + ".js",
					header: layerObj.header || "",
					modules: {},
					plugins: {},
					pluginsFiles: []
				};
			});

			config._normalized = true;

			return config;
		}
	};
})();
