# amddirscan

amddirscan is a simple construction tasks. 
It takes a list of files containing amd modules to include and process only their plugin dependencies.
This can useful to build the content of a directory.

### amddirscan (layerName, buildConfig, loaderConfig)
Gather all the specified files and build their plugin dependencies if the `buildPlugins` option is true.
Configuration for the plugins should go in the loader configuration like at runtime. 

This task should be used when you want to build a layer with all the modules in a directory and without external dependencies.

#### Arguments
1. layerName _(String)_: The layer name.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. loaderConfig _(String)_: Name of the property where the amd loader configuration is stored.
	For this task, loaderConfig is only used to resolve the plugins.

#### Task configuration
This task can be configured with the following properties from the common configuration:

```
amdbuild: {
	buildPlugins: true,
	
	// List of plugins that the build should not try to resolve at build time.
	runtimePlugins: [],

	// List of layers to build.
	layers: [{
		name: "layerName",
		includeFiles: [
			// Files in the cwd matching the glob patterns listed here will be added to the layer.
		],
		excludeFiles: [
			// Files in the cwd matching the glob patterns listed here will NOT be in the layer.
		]
	}]
}
```
* `amdbuild.buildPlugins` _(Boolean)_: If true, the task will try to build plugins.

* `amdbuild.runtimePlugins` _(Array)_: List of plugin module IDs that can only be resolved at run time.
	Hence the resources will be ignored and the plugin itself will be included only if it matches a glob patern from `amdbuild.layers[x].includeFiles`.

* `amdbuild.layers[x].name` _(String)_: Module ID of the layer. 

* `amdbuild.layers[x].includeFiles`,  `amdbuild.layers[x].excludeFiles` _(Array)_: List of glob pattern to match files to include/exclude in/from the layer.
	If a file match an including and an excluding pattern, it will be excluded. 

#### Results
This task adds the matching files to the `buildConfig.layers.layerName` object.
The modules and the plugins resources are stored separately, in `buildConfig.layers.layerName.modules` and in `buildConfig.layers.layerName.plugins`.

