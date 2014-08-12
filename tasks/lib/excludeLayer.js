module.exports = function (content) {
	var result = [];

	var match = null;
	var RE = /define\("([^"]*)",/g;
	// Extra parenthesis in the while condition to silence jshint.
	// The assignment is required here to access the matched group of a global regexp.
	while ((match = RE.exec(content))) {
		result.push(match[1]);
	}
	// if return.length < 2, it was not a layer but a module.
	return result.length > 1 ? result : undefined;
};
