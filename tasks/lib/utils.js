"use strict";
/* jshint -W074 */

module.exports = (function () {
 
	var getOwn = require("./lang").getOwn,
	
		/**
		 * Trims the . and .. from an array of path segments.
		 * It will keep a leading path segment if a .. will become
		 * the first path segment, to help with module name lookups,
		 * which act like paths, but can be remapped. But the end result,
		 * all paths that use this function should look normalized.
		 * NOTE: this method MODIFIES the input array.
		 * @param {Array} ary the array of path segments.
		 */

		trimDots = function (ary) {
			var i, part;
			for (i = 0; ary[i]; i += 1) {
				part = ary[i];
				if (part === '.') {
					ary.splice(i, 1);
					i -= 1;
				} else if (part === '..') {
					if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
						//End of the line. Keep at least one non-dot
						//path segment at the front so it can be mapped
						//correctly to disk. Otherwise, there is likely
						//no path mapping for a path starting with '..'.
						//This can still fail, but catches the most reasonable
						//uses of ..
						break;
					} else if (i > 0) {
						ary.splice(i - 1, 2);
						i -= 2;
					}
				}
			}
		};

	
    return {
	
		/**
		 * Given a relative module name, like ./something, normalize it to
		 * a real name that can be mapped to a path.
		 * @param {String} name the relative name
		 * @param {String} baseName a real name that the name arg is relative
		 * to.
		 * @param {Boolean} applyMap apply the map config to the value. Should
		 * only be done if this normalization is for a dependency ID.
		 * @returns {String} normalized name
		 */

		normalize: function (name, baseName, applyMap, config) {
			var pkgName, pkgConfig, mapValue, nameParts, i, j, nameSegment,
				foundMap, foundI, foundStarMap, starI,
				map = config.map,
				pkgs = config.pkgs,
				baseParts = baseName && baseName.split('/'),
				normalizedBaseParts = baseParts,
				starMap = map && map['*'];


			//Adjust any relative paths.
			if (name && name.charAt(0) === '.') {
				//If have a base name, try to normalize against it,
				//otherwise, assume it is a top-level require that will
				//be relative to baseUrl in the end.
				if (baseName) {
					if (getOwn(pkgs, baseName)) {
						//If the baseName is a package name, then just treat it as one
						//name to concat the name with.
						normalizedBaseParts = baseParts = [baseName];
					} else {
						//Convert baseName to array, and lop off the last part,
						//so that . matches that 'directory' and not name of the baseName's
						//module. For instance, baseName of 'one/two/three', maps to
						//'one/two/three.js', but we want the directory, 'one/two' for
						//this normalization.
						normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
					}

					name = normalizedBaseParts.concat(name.split('/'));
					trimDots(name);

					//Some use of packages may use a . path to reference the
					//'main' module name, so normalize for that.
					pkgConfig = getOwn(pkgs, (pkgName = name[0]));
					name = name.join('/');
					if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
						name = pkgName;
					}
				} else if (name.indexOf('./') === 0) {
					// No baseName, so this is ID is resolved relative
					// to baseUrl, pull off the leading dot.
					name = name.substring(2);
				}
			}

			//Apply map config if available.
			if (applyMap && map && (baseParts || starMap)) {
				nameParts = name.split('/');

				for (i = nameParts.length; i > 0; i -= 1) {
					nameSegment = nameParts.slice(0, i).join('/');

					if (baseParts) {
						//Find the longest baseName segment match in the config.
						//So, do joins on the biggest to smallest lengths of baseParts.
						for (j = baseParts.length; j > 0; j -= 1) {
							mapValue = getOwn(map, baseParts.slice(0, j).join('/'));
							//baseName segment has config, find if it has one for
							//this name.
							if (mapValue) {

								mapValue = getOwn(mapValue, nameSegment);
								if (mapValue) {
									//Match, update name to the new value.
									foundMap = mapValue;
									foundI = i;
									break;
								}
							}
						}
					}

					if (foundMap) {
						break;
					}

					//Check for a star map match, but just hold on to it,
					//if there is a shorter segment match later in a matching
					//config, then favor over this star map.
					if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
						foundStarMap = getOwn(starMap, nameSegment);
						starI = i;
					}
				}

				if (!foundMap && foundStarMap) {
					foundMap = foundStarMap;
					foundI = starI;
				}

				if (foundMap) {
					nameParts.splice(0, foundI, foundMap);
					name = nameParts.join('/');
				}
			}

			return name;
		},

		/**
		 * Converts a module name to a file path. Supports cases where
		 * moduleName may actually be just an URL.
		 * Note that it **does not** call normalize on the moduleName,
		 * it is assumed to have already been normalized. This is an
		 * internal API, not a public one. Use toUrl for the public API.
		 */

		nameToFilepath: function (moduleName, config) {
			var pkg, pkgPath, syms, i, parentModule, url,
				parentPath,
				pkgs = config.pkgs,
				baseUrl = config.baseUrl,
				paths = config.paths;

			syms = moduleName.split('/');
			//For each module name segment, see if there is a path
			//registered for it. Start with most specific name
			//and work up from it.
			for (i = syms.length; i > 0; i -= 1) {
				parentModule = syms.slice(0, i).join('/');
				pkg = getOwn(pkgs, parentModule);
				parentPath = getOwn(paths, parentModule);
				if (parentPath) {
					//If an array, it means there are a few choices,
					//Choose the one that is desired
					if (Array.isArray(parentPath)) {
						parentPath = parentPath[0];
					}
					syms.splice(0, i, parentPath);
					break;
				} else if (pkg) {
					//If module name is just the package name, then looking
					//for the main module.
					if (moduleName === pkg.name) {
						pkgPath = pkg.location + '/' + pkg.main;
					} else {
						pkgPath = pkg.location;
					}
					syms.splice(0, i, pkgPath);
					break;
				}
			}

			//Join the path parts together, then figure out if baseUrl is needed.
			url = syms.join('/');
			url += '.js';
			url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : baseUrl) + url;

			return url;
		},
			
		forEachModules: function (modules, layerName, func){
			var mid;
			for (mid in modules) {
				if (modules.hasOwnProperty(mid) && mid !== layerName) {
					func(modules[mid]);
				}
			}
			if (modules.hasOwnProperty(layerName)) {
				func(modules[layerName]);
			}
		}
    };
})();
