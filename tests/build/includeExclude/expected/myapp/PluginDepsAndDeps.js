define('mypackage/foo',["./bar"], function (bar) {
	return {
		log: function () {
			bar.log;
			console.log("foo !");
		}
	};
});
;
define('mypackage/bar',{
	log: function () {
		console.log("bar !");
	}
});
;
define('myapp/plugin',{
	load: function (resource, req, onload) {
		onload(resource);
	},

	addModules: function (plugin, resource, addModules) {
		if (resource === "addModules") {
			addModules(["mypackage/foo"]);
		}
	}

});