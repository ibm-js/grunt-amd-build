define('myapp/src',[
	"./plugin!srcResource",
], function () {
    return {
		log: function () {
			console.log("src !");
		}
	};
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