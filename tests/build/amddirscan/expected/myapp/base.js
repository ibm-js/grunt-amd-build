// This is myapp/resource.xxx from myapp/plugin
// This is a second call myapp/resource.xxx from myapp/plugin
// onLayerEnd
{
	"name": "myapp/base",
	"path": "myapp/base.js"
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
	"onLayerEnd: myapp/base"
]
define('myapp/src',[
	"./plugin!./{{template}}",
	"myapp/other" // this module should not be included as a dependency.
], function () {
    return {
		log: function () {
			console.log("src !");
		}
	};
});
;
define('myapp/plugin!myapp/resource.xxx',{'myapp/resource.xxx': true});;
define('myapp/plugin!myapp/resource.xxx1',{'myapp/resource.xxx' : true});