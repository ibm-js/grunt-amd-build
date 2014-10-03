/* Most of this code is from require.js so higher complexity is allowed. */
/* jshint maxcomplexity:20 */

module.exports = function (cfg) {
	"use strict";

	var config = require("./normalizeConfig").loader(cfg),
		getOwn = require("./lang").getOwn,
		jsSuffixRegExp = /\.js$/;

	/**
	 * Trims the . and .. from an array of path segments.
	 * It will keep a leading path segment if a .. will become
	 * the first path segment, to help with module name lookups,
	 * which act like paths, but can be remapped. But the end result,
	 * all paths that use this function should look normalized.
	 * NOTE: this method MODIFIES the input array.
	 * @param {Array} ary the array of path segments.
	 */
	function trimDots(ary) {
		var i, part;
		for (i = 0; i < ary.length; i++) {
			part = ary[i];
			if (part === '.') {
				ary.splice(i, 1);
				i -= 1;
			} else if (part === '..') {
				// If at the start, or previous value is still ..,
				// keep them so that when converted to a path it may
				// still work when converted to a path, even though
				// as an ID it is less than ideal. In larger point
				// releases, may be better to just kick out an error.
				if (i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
					continue;
				} else if (i > 0) {
					ary.splice(i - 1, 2);
					i -= 2;
				}
			}
		}
	}

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
		/* Remove jshint warning for the bad indentation @l.96 because of the named for-loop. */
		/* jshint -W015 */
		normalize: function (name, baseName, applyMap) {
			var parts = name.split("!");
			name = parts[0];

			var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
				foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
				baseParts = (baseName && baseName.split('/')),
				map = config.map,
				starMap = map && map['*'];

			//Adjust any relative paths.
			if (name) {
				name = name.split('/');
				lastIndex = name.length - 1;

				// If wanting node ID compatibility, strip .js from end
				// of IDs. Have to do this here, and not in nameToUrl
				// because node allows either .js or non .js to map
				// to same file.
				if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
					name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
				}

				// Starts with a '.' so need the baseName
				if (name[0].charAt(0) === '.' && baseParts) {
					//Convert baseName to array, and lop off the last part,
					//so that . matches that 'directory' and not name of the baseName's
					//module. For instance, baseName of 'one/two/three', maps to
					//'one/two/three.js', but we want the directory, 'one/two' for
					//this normalization.
					normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
					name = normalizedBaseParts.concat(name);
				}

				trimDots(name);
				name = name.join('/');
			}

			//Apply map config if available.
			if (applyMap && map && (baseParts || starMap)) {
				nameParts = name.split('/');

				outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
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
									break outerLoop;
								}
							}
						}
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

			// If the name points to a package's name, use
			// the package main instead.
			pkgMain = getOwn(config.pkgs, name);

			// Restore plugin
			parts[0] = name;
			name = parts.join("!");

			return pkgMain ? pkgMain : name;
		},
		/* jshint +W015 */
		/* Restore jshint warning */

		/**
		 * Converts a module name to a file path.
		 * Note that it **does not** call normalize on the moduleName,
		 * it is assumed to have already been normalized. This is an
		 * internal API, not a public one. Use toUrl for the public API.
		 */
		nameToFilepath: function (moduleName, noExt) {
			var paths, syms, i, parentModule, url,
				parentPath,
				pkgMain = getOwn(config.pkgs, moduleName);

			if (pkgMain) {
				moduleName = pkgMain;
			}

			paths = config.paths;

			syms = moduleName.split('/');
			//For each module name segment, see if there is a path
			//registered for it. Start with most specific name
			//and work up from it.
			for (i = syms.length; i > 0; i -= 1) {
				parentModule = syms.slice(0, i).join('/');

				parentPath = getOwn(paths, parentModule);
				if (parentPath) {
					//If an array, it means there are a few choices,
					//Choose the one that is desired
					if (Array.isArray(parentPath)) {
						parentPath = parentPath[0];
					}
					syms.splice(0, i, parentPath);
					break;
				}
			}

			//Join the path parts together, then figure out if baseUrl is needed.
			url = syms.join('/') + (noExt ? '' : '.js');
			url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;

			return url;
		}
	};
};
