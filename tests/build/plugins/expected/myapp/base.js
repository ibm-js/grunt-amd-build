// This is myapp/resource.xxx from myapp/plugin
// This is a second call myapp/resource.xxx from myapp/plugin
// This is myapp/other from myapp/plugin
// This is a second call myapp/other from myapp/plugin
// onLayerEnd
{
	"name": "myapp/base",
	"path": "./myapp/base.js"
}
[
	"normalize: ./{{template}}",
	"normalize: myapp/resource.xxx",
	"normalize: myapp/resource.xxx",
	"load: myapp/resource.xxx",
	"normalize: myapp/resource.xxx",
	"normalize: myapp/resource.xxx",
	"write: myapp/plugin!myapp/resource.xxx",
	"writeFile: myapp/plugin!myapp/resource.xxx",
	"addModules: myapp/plugin!myapp/resource.xxx",
	"normalize: ./{{template}}",
	"normalize: myapp/resource.xxx",
	"normalize: myapp/other",
	"normalize: myapp/other",
	"normalize: myapp/other",
	"load: myapp/other",
	"normalize: myapp/other",
	"normalize: myapp/other",
	"write: myapp/plugin!myapp/other",
	"writeFile: myapp/plugin!myapp/other",
	"addModules: myapp/plugin!myapp/other",
	"onLayerEnd: myapp/base"
]
define('myapp/plugin!myapp/resource.xxx',{'myapp/resource.xxx': true});;
define('myapp/plugin!myapp/resource.xxx1',{'myapp/resource.xxx' : true});;
define('myapp/plugin!myapp/other',{'myapp/other': true});;
define('myapp/plugin!myapp/other1',{'myapp/other' : true});;
define('myapp/src',[
	"./plugin!./{{template}}",
	"./plugin!./{{template}}", // Twice to test resources are processed only once.
	"./plugin!myapp/resource.xxx", // Third to test resources are normalized correctly.
	"./plugin!myapp/other" // load another resource.
], function () {
    return {
		log: function () {
			console.log("src !");
		}
	};
});
;
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
define('myapp/plugin',[],function (){
	var calls = [];
	var i = 0;

	return {
		normalize: function (resource, normalize) {
			calls.push("normalize: " + resource);
			return normalize(resource.replace("{{template}}", "resource.xxx"));
		},

		load: function (resource, req, onload, config) {
			calls.push("load: " + resource);
			if (!config || !config.isBuild) {
				throw "Object config provided to load method is empty";
			}
			onload(resource);
		},

		write: function (plugin, resource, write) {
			calls.push("write: " + plugin + "!" + resource);
			write("// This is " + resource + " from " + plugin + "\n");
			write("// This is a second call " + resource + " from " + plugin + "\n");
			write.asModule(plugin + "!" + resource, "define({'" + resource + "': true});");
			write.asModule(plugin + "!" + resource + "1", "define({'" + resource + "' : true});");
		},

		writeFile: function (plugin, resource, req, writeFile) {
			calls.push("writeFile: " + plugin + "!" + resource);
			i = i + 1;
			writeFile(req.toUrl("mypackage/writeFile" + i), "// This is " + resource + " from " + plugin + "\n");
			writeFile(req.toUrl("mypackage/writeFile1" + i), "// This is " + resource + " from " + plugin + "\n");
			writeFile.asModule(resource + "!" + plugin, req.toUrl("mypackage/writeModule" + i), "define({'" + resource + "': true});");
			writeFile.asModule(resource + "!" + plugin, req.toUrl("mypackage/writeModule1" + i), "define({'" + resource + "': true});");
		},

		addModules: function (plugin, resource, addModules) {
			calls.push("addModules: " + plugin + "!" + resource);
			addModules(["mypackage/foo"]);
		},

		onLayerEnd: function (write, data) {
			calls.push("onLayerEnd: " + data.name);
			write("// onLayerEnd\n");
			write(JSON.stringify(data, null, "\t") + "\n");
			write(JSON.stringify(calls, null, "\t") + "\n");
		}
	};
});