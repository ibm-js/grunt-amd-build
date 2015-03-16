# amddepsscan

amddepsscan is the main construction task.
It takes a list of seed modules and gathers all their dependencies.
This task should be used when you want to do custom build for an application.

### amddepsscan (layerName, buildConfig, loaderConfig)
Parse the module(s) to include in the layer to find all their dependencies and can build the plugins if the option `buildPlugins` is true.
Configuration for the plugins should go in the loader configuration like at runtime. 

#### Arguments
1. layerName _(String)_: The layer name.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. loaderConfig _(String)_: Name of the property where the amd loader configuration is stored. 

#### Task configuration
This task can be configured with the following properties in the common configuration:

```
amdbuild: {
	buildPlugins: true,
	
	// List of plugins that the build should not try to resolve at build time.
	runtimePlugins: [],
	
	// List of layers to build.
	layers: [{
		name: "main",
		include: [
			// Modules listed here, and their dependencies, will be added to this layer.
		],
		includeLayers: [
			// The content of the layers listed here will be added to this layer.
		],
		includeShallow: [
			// Only the modules listed here (ie. NOT their dependencies) will be added to this layer.
		],
		exclude: [
			// Modules listed here, and their dependencies, will NOT be in this layer.
		],
		excludeLayers: [
			// The content of the layers listed here will NOT be in this layer.
		],
		excludeShallow: [
			// Only the modules listed here (ie. NOT their dependencies)  will NOT be in this layer.
		],
	}
}
```
* `amdbuild.buildPlugins` _(Boolean)_: If true, the task will try to build plugins. Default to `true`.

* `amdbuild.runtimePlugins` _(Array)_: List of plugin module IDs that can only be resolved at run time.
	Hence the resources will be ignored, but the plugin itself will be included in the layer.
	Default to :
	```js
	["dojo/has",
	 "dojo/i18n",
	 "dojo/query",
	 "dojo/domReady",
	 "dojo/text",
	 "dojo/selector/_loader",
	 "dojo/request/registry",
	 "dojo/request/default"]
	 ```

* `amdbuild.layers[x].name` _(String)_: Module ID of the layer.
	If the layer module ID is already pointing to a module, that module will be included even if it is not explicitly listed in the `amdbuild.layers[x].include` property.
	This can be avoided by adding that module ID to the `amdbuild.layers[x].excludeShallow` property.

* `amdbuild.layers[x].include`,  `amdbuild.layers[x].exclude` _(Array)_: List of module IDs to include/exclude in/from the layer.
	Each modules and their dependencies will be included/excluded in/from the layer.
	
    __Note:__ If a module is a dependency of a included module and of an excluded module, it will be excluded. 

* `amdbuild.layers[x].includeLayers`,  `amdbuild.layers[x].excludeLayers` _(Array)_: List of layer IDs to include/exclude in/from the layer.
	If the layer ID was __previously defined in the `layers` array or already built by a previous run__,
	all the modules in that layer will be included/excluded in/from the layer. 

* `amdbuild.layers[x].includeShallow`,  `amdbuild.layers[x].excludeShallow` _(Array)_: List of module IDs to include/exclude in/from the layer.
	Dependencies of modules listed here will not be included/excluded in/from the layer.

    __Note:__ Plugin resources exclusion is always shallow, even if specified in `exclude`.


#### Results
This task adds the dependencies to the `buildConfig.layers.layerName` object.
The modules and the plugins resources are stored separately, in `buildConfig.layers.layerName.modules` and in `buildConfig.layers.layerName.plugins`.
