module.exports = (function () {
	"use strict";

	var eachProp = require("./lang").eachProp,
		getLoaderDefault = function () {
			return {
				baseUrl: "./",
				packages: [],
				map: {},
				paths: {}
			};
		},
		getBuildDefault = function () {
			return {
				dir: "./tmp/",
				layers: {},
				runtimePlugins: []
			};
		},
		getLayerDefault = function () {
			return {
				include: [],
				exclude: [],
				header: "",
				modules: {},
				plugins: {},
				pluginsFiles: {}
			};
		},

		mixin = function (target, source) {
			eachProp(source, function (prop, value) {
				if (!target[prop]) {
					target[prop] = value;
				}
			});
		},

		normalizeUrl = function (string) {
			var url = string.replace(/\\/g, "/"),
				lastChar = url.charAt(url.length - 1);

			if (lastChar !== "/") {
				return url + "/";
			}
			return url;
		};

	return {
		loader: function (config) {
			//Already normalized
			if (config._normalized) {
				return config;
			}

			//Merge with default
			mixin(config, getLoaderDefault());

			//Make sure the baseUrl ends in a slash.
			config.baseUrl = normalizeUrl(config.baseUrl);

			//Adjust packages`
			config.pkgs = {};

			config.packages.forEach(function (pkg) {
				pkg = typeof pkg === "string" ? {
					name: pkg
				} : pkg;

				if (pkg.name) {
					config.pkgs[pkg.name] = {
						name: pkg.name,
						location: pkg.location || pkg.name,
						main: pkg.main || "main"
					};
				}
			});


			config._normalized = true;

			return config;
		},

		build: function (config) {
			//Already normalized
			if (config._normalized) {
				return config;
			}

			//Merge with default
			mixin(config, getBuildDefault());

			//Make sure the output directory ends in a slash.
			config.dir = normalizeUrl(config.dir);

			eachProp(config.layers, function (layerName, layerObj) {
				mixin(layerObj, getLayerDefault());

				if (layerObj.include.indexOf(layerName) < 0) {
					layerObj.include.push(layerName);
				}
				layerObj.outputPath = config.dir + layerName + ".js";
			});

			config._normalized = true;

			return config;
		}
	};
})();
