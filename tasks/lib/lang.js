module.exports = (function () {
	"use strict";

	return {
		getOwn: function (obj, prop) {
			return obj.hasOwnProperty(prop) && obj[prop];
		},
		eachProp: function (obj, func) {
			var prop;
			for (prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					func(prop, obj[prop]);
				}
			}
		},
		forEachModules: function (modules, layerName, func) {
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
