// This is foo from myapp/pluginBuilder
// This is a second call foo from myapp/pluginBuilder
// onLayerEnd
{
	"name": "myapp/builder",
	"path": "./myapp/builder.js"
}
[
	"normalize: foo",
	"normalize: foo",
	"normalize: foo",
	"load: foo",
	"normalize: foo",
	"normalize: foo",
	"write: myapp/pluginBuilder!foo",
	"writeFile: myapp/pluginBuilder!foo",
	"addModules: myapp/pluginBuilder!foo",
	"onLayerEnd: myapp/builder"
]
define('myapp/pluginBuilder!foo',{'foo': true});;
define('myapp/pluginBuilder!foo1',{'foo' : true});;
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
define('myapp/pluginBuilder',{
	pluginBuilder: "./plugin"
});