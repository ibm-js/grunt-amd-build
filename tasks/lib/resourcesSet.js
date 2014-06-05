module.exports = function () {
	"use strict";

	var resourcesSet = [];
	// To keep track of what has already been added.
	var includeMap = {};

	return {
		// Take a module and store the resources associated with it.
		push: function (module) {
			// If this is the first resource for this plugin
			if (!includeMap[module.mid]) {
				includeMap[module.mid] = {
					index: -1,
					resources: []
				};
			}
			var includedResources = includeMap[module.mid];


			// Extract resources to process
			var resourcesToProcess = [];
			while (module.resources.length) {
				var resource = module.resources.pop();
				if (includedResources.resources.indexOf(resource) === -1) {
					resourcesToProcess.push(resource);
					includedResources.resources.push(resource);
				}
			}

			if (resourcesToProcess.length) {
				if (includedResources.index !== -1) {
					// This plugin has already some resources in the set
					resourcesToProcess.forEach(function (resource) {
						resourcesSet[includedResources.index].resources.push(resource);
					});
				} else {
					// This is the first time this plugin is processed
					includedResources.index = resourcesSet.length;
					resourcesSet.push({
						mid: module.mid,
						resources: resourcesToProcess
					});
				}
			}
		},
		isEmpty: function () {
			return resourcesSet.length === 0;
		},
		pop: function () {
			var result = resourcesSet.pop();
			includeMap[result.mid].index = -1;
			return result;
		},
		process: function (cb) {
			var current;
			while (!this.isEmpty()) {
				current = this.pop();
				cb(current);
			}
		}
	};
};
