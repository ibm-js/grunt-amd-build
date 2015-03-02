module.exports = (function () {
	"use strict";

	var eachProp = require("./lang").eachProp,
		jsSuffixRegExp = /\.js$/,
		currDirRegExp = /^\.\//,
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
				layers: [],
				layersByName: {},
				runtimePlugins: [
					"dojo/has",
					"dojo/i18n",
					"dojo/query",
					"dojo/domReady",
					"dojo/text",
					"dojo/selector/_loader",
					"dojo/request/registry",
					"dojo/request/default"
				],
				buildPlugins: true
			};
		},
		getLayerDefault = function () {
			return {
				include: [],
				includeFiles: [],
				includeShallow: [],
				includeLayers: [],
				exclude: [],
				excludeFiles: [],
				excludeShallow: [],
				excludeLayers: [],
				header: "",
				modules: {},
				plugins: {},
				pluginsFiles: {},
				shim: []
			};
		},

		mixin = function (target, source) {
			eachProp(source, function (prop, value) {
				if (target[prop] === undefined) {
					target[prop] = value;
				} else if (prop === "runtimePlugins") {
					value.forEach(function (mid) {
						target[prop].push(mid);
					});
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
			// Already normalized
			if (config._normalized) {
				return config;
			}

			// Merge with default
			mixin(config, getLoaderDefault());

			// Make sure the baseUrl ends in a slash.
			config.baseUrl = normalizeUrl(config.baseUrl);

			// Adjust packages
			config.pkgs = {};

			config.packages.forEach(function (pkgObj) {
				var location, name;

				pkgObj = typeof pkgObj === 'string' ? {
					name: pkgObj
				} : pkgObj;

				name = pkgObj.name;
				// Packages must have a name
				if (name) {
					location = pkgObj.location;
					if (location) {
						config.paths[name] = pkgObj.location;
					}

					//Save pointer to main module ID for pkg name.
					//Remove leading dot in main, so main paths are normalized,
					//and remove any trailing .js, since different package
					//envs have different conventions: some use a module name,
					//some use a file name.
					config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
						.replace(currDirRegExp, '')
						.replace(jsSuffixRegExp, '');

				}

				// Trim useless starting "./"
				eachProp(config.paths, function (path, location) {
					config.paths[path] = location.length > 2 ? location.replace(/^\.\//, "") : location;
				});
			});

			if (config.shim) {
				eachProp(config.shim, function (id, value) {
					// Normalize the structure
					if (Array.isArray(value)) {
						value = {
							deps: value
						};
					}
					config.shim[id] = value;
				});
			}

			config._normalized = true;

			return config;
		},

		build: function (config) {
			// Already normalized
			if (config._normalized) {
				return config;
			}

			// Merge with default
			mixin(config, getBuildDefault());

			// Make sure the output directory ends in a slash.
			config.dir = normalizeUrl(config.dir);

			config.layers.forEach(function (layer) {
				if (!layer.name) {
					throw new Error("A layer name is required.");
				}
				mixin(layer, getLayerDefault());

				// Basic output path for the layer.
				layer.outputPath = layer.name + ".js";

				config.layersByName[layer.name] = layer;
			});

			config._normalized = true;

			return config;
		},

		normalizeUrl: normalizeUrl
	};
})();
