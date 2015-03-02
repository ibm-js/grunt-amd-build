define({
	load: function (resource, req, onload) {
		onload(resource);
	},

	addModules: function (plugin, resource, addModules) {
		if (resource === "addModules") {
			addModules(["mypackage/foo"]);
		}
	}

});