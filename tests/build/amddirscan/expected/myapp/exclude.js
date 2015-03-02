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
});;
define('myapp/pluginBuilder',{
	pluginBuilder: "./plugin"
});