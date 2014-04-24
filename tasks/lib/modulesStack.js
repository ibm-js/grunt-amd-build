module.exports = function () {
	"use strict";

	var stack = [];
	var includeMap = {};

	return {
		push: function (module) {
			// If the object was not already in the stack.
			if (!includeMap[module.mid]) {
				includeMap[module.mid] = true;
				stack.push(module);
			}
		},
		isEmpty: function () {
			return stack.length === 0;
		},
		pop: function () {
			return stack.pop();
		}
	};
};
