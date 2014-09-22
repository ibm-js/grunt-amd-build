var requirejs = require("requirejs");
requirejs.getNodePath = function (path) {
	// The 5 is because the base file for node require will be r.js,
	// located at node_modules/grunt-amd-build/node_modules/requirejs/bin/r.js
	var subdirs = 5;
	for (var i = 0; i < subdirs; i++) {
		path = "../" + path;
	}
	return path;
};
var i = 0;

module.exports = function (config) {
	var context = "layer" + i;
	i++;

	requirejs.config({
		//Pass the top-level main.js/index.js require
		//function to requirejs so that node modules
		//are loaded relative to the top-level JS file.
		nodeRequire: require,
		isBuild: true,
		config: {
			"requirejs-dplugins/has": {
				builder: true
			}
		},
		inlineText: true,
		context: context
	});

	// Set up global config
	requirejs.config(config);

	// Set up context config
	config.context = context;
	var req = requirejs.config(config);

	// Take a path relative to the Gruntfile and return the node equivalent.
	req.getNodePath = requirejs.getNodePath;

	return req;
};
