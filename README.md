# grunt-amd-build [![Build Status](https://travis-ci.org/ibm-js/grunt-amd-build.svg?branch=master)](https://travis-ci.org/ibm-js/grunt-amd-build)

> Grunt plugin to build [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) applications.

## Warning 
This plugin only support RequireJS loader and plugins for now. It will not currently work with the Dojo loader or plugins.

## Table of Contents

- [Getting Started](#user-content-getting-started)
- [Overview](#user-content-overview)
- [Common configuration](#user-content-common-configuration)
- [Tasks](#user-content-tasks)
	- [amddepsscan](#user-content-amddepsscan-layername-buildconfig-loaderconfig)
	- [amddirscan](#user-content-amddirscan-layername-buildconfig-loaderconfig)
	- [amdserialize](#user-content-amdserialize-layername-buildconfig-outputprop)
	- [amdreportjson](#user-content-amdreport-jsonbuildconfig)
- [Use Uglify](#user-content-use-uglify)
- [Copying the plugin files](#user-content-copying-the-plugin-files)
- [Everything put together](#user-content-everything-put-together)
- [Licensing](#user-content-licensing)


## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
$ npm install grunt-amd-build --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-amd-build');
```

## Overview
The goal of this plugin is to provide a modular build system for AMD applications. This will allow more flexibility than previous monolithic system like r.js and the Dojo build system.

To do so, this plugin focuses on specific tasks, like gathering all the dependencies of a layer, and delegate to other plugins the more general tasks like concatenation or uglification.

Currently there is three grunt tasks in the plugin:
* `amddepsscan`: explore your application to get all the dependencies to include in a layer.
* `amdplugins`: process the plugins dependencies found by `amddepsscan` according to the spec defined by [require.js](http://requirejs.org/docs/plugins.html).
* `amdserialize`: output the processed files in a directory and make the list of files available in grunt config so they can be uglified or concatenated.

Those tasks need to be run for each layer. A helper task can be used to do that automatically (see the task `amdbuild` in the sample [Gruntfile.js](sample/Gruntfile.js))

## Common configuration

The build config is split into two common properties:
* `amdloader`: contains the amd loader config. You can find the documentation [here](http://requirejs.org/docs/api.html#config) for RequireJS.
* `amdbuild`: contains the build configuration (mainly the output directory and the list of layers). This property is shared between the tasks and each tasks add its result to the corresponding layer object.

## Tasks 

### amddepsscan (layerName, buildConfig, loaderConfig)
Parse the module(s) to include in the layer to find all their dependencies and can build the plugins if the option `buildPlugins` is true.
Configuration for the plugins should go in the loader configuration like at runtime. 

This task should be used when you want to do custom build for an application.

#### Arguments
1. layerName _(String)_: The layer name.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. loaderConfig _(String)_: Name of the property where the amd loader configuration is stored. 

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
		include: [
			// Modules and layers listed here, and their dependencies, will be added to the layer.
		],
		includeShallow: [
			// Only the modules listed here (ie. NOT their dependencies) will be added to the layer.
		],
		exclude: [
			// Modules and layers listed here, and their dependencies, will NOT be in the layer.
		],
		excludeShallow: [
			// Only the modules listed here (ie. NOT their dependencies)  will NOT be in the layer.
		]
	}]
}
```
* `amdbuild.buildPlugins` _(Boolean)_: If true, the task will try to build plugins. Default to `true`.

* `amdbuild.runtimePlugins` _(Array)_: List of plugin module IDs that can only be resolved at run time. Hence the resources will be ignored, but the plugin itself will be included in the layer. Default to `["dojo/has", "dojo/i18n", "dojo/query", "dojo/domReady", "dojo/text", "dojo/selector/_loader", "dojo/request/registry", "dojo/request/default"]`

* `amdbuild.layers[x].name` _(String)_: Module ID of the layer. If the layer module ID is already pointing to a module, that module will be included even if it is not explicitly listed in the `amdbuild.layers[x].include` property. This can be avoided by adding that module ID to the `amdbuild.layers[x].excludeShallow` property.

* `amdbuild.layers[x].include`,  `amdbuild.layers[x].exclude` _(Array)_: List of module IDs to include/exclude in/from the layer. If a module ID represents an actual module, this module and its dependencies will be included/excluded in/from the layer. If a module ID is a layer module ID __previously defined in the `layers` array or already built by a previous run__, all the modules in that layer will be included/excluded in/from the layer. 

    __Note:__ If a module is a dependency of a included module and of an excluded module, it will be excluded. 

* `amdbuild.layers[x].includeShallow`,  `amdbuild.layers[x].excludeShallow` _(Array)_: List of module IDs to include/exclude in/from the layer. Dpendencies of modules listed here will not be included/excluded in/from the layer.

    __Note:__ Plugin resources exclusion is always shallow, even if specified in `exclude`.


#### Results
This task adds the dependencies to the `buildConfig.layers.layerName` object. The modules and the plugins resources are stored separately, in `buildConfig.layers.layerName.modules` and in `buildConfig.layers.layerName.plugins`.

### amddirscan (layerName, buildConfig, loaderConfig)
Explore a directory to list all the module to include in the layer and can build the plugins if the option `buildPlugins` is true.
Configuration for the plugins should go in the loader configuration like at runtime. 

This task should be used when you want to build a library with all the modules in a directory and without external dependencies.

#### Arguments
1. layerName _(String)_: The layer name.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. loaderConfig _(String)_: Name of the property where the amd loader configuration is stored. For this task, loaderConfig is only used to resolve the plugins.

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

* `amdbuild.runtimePlugins` _(Array)_: List of plugin module IDs that can only be resolved at run time. Hence the resources will be ignored and the plugin itself will be included only if it matches a glob patern from `amdbuild.layers[x].includeFiles`.

* `amdbuild.layers[x].name` _(String)_: Module ID of the layer. 

* `amdbuild.layers[x].includeFiles`,  `amdbuild.layers[x].excludeFiles` _(Array)_: List of glob pattern to match files to include/exclude in/from the layer. If a file match an including and an excluding pattern, it will be excluded. 

#### Results
This task adds the matching files to the `buildConfig.layers.layerName` object. The modules and the plugins resources are stored separately, in `buildConfig.layers.layerName.modules` and in `buildConfig.layers.layerName.plugins`.


### amdserialize (layerName, buildConfig, loaderConfig, outputProp)
Write all the files and modules generated by `amddepsscan` and by `amdplugins` to the `buildConfig.dir` directory.
Set the `outputProp` with the list of written files.

#### Arguments
1. layerName _(String)_: The layer name.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. loaderConfig _(String)_: Name of the property where the amd loader configuration is stored. For this task, loaderConfig is only used to resolve the plugins.
1. outputProp _(String)_: Name of the property where the list of generated files will be stored. 

#### Task configuration
This task does not use grunt configuration.

#### Results
The `outputProp` will contain the following object : 
```js
{
    header: String, // The text that should be written at the beginning of the layer
    layer: String, // The layer name
    modules: {
        abs: [], // list of module files paths (e.g., ./tmp/myapp/src.js)
        rel: []  // list of module files paths relative to the `buildConfig.dir` directory (e.g., ./myapp/src.js)
    },
    plugins: {
        abs: [], // list of plugin files paths (e.g., ./tmp/myapp/nls/src_fr.js)
        rel: []  // list of plugin files paths relative to the `buildConfig.dir` directory (e.g., ./myapp/nls/src_fr.js)
    }
}
```

### amdreportjson (buildConfig)
Write a JSON file containing the list of included modules by layer. This task should be run last so everything else is done and the layers will not change.

#### Arguments
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 

#### Task configuration
This task use its own configuration:

```
amdreportjson: {
	dir: "report/"
}
```

* `amdreportjson.dir` _(String)_: Directory in which the task will write the resulting file `buildReport.json`.

#### Results
Write a `buildReport.json` file.

## Use Uglify
The provided tasks are not writing the layer but the task `grunt-contrib-uglify` will do it. 
Using the data output by `amdserialize` the Uglify task can be configured properly.

```js
// Config to allow Uglify to generate the layer.
uglify: {
    options: {
        banner: "<%= " + outprop + ".header%>"
	},
	dist: {
		src: "<%= " + outprop + ".modules.abs %>",
		dest: outdir + "<%= " + outprop + ".layerPath %>"
	}
}
```
__Notes:__ If you want to use the __source-map__ option in Uglify, you should keep the output of `amdserialize` in the `buildConfig.dir` directory. Otherwise the original sources will not be found.

## Copying the plugin files
The plugin files are in the temp directory so they need to be copied to the final output directory.

```js
// Copy the plugin files to the real output directory.
copy: {
    dist: {
		expand: true,
		cwd: tmpdir,
		src: "<%= " + outprop + ".plugins.rel %>",
		dest: outdir
	}
}
```

## Everything put together
There is a complete sample Gruntfile in the [sample directory](sample/Gruntfile.js).


## Licensing

This project is distributed by the Dojo Foundation and licensed under the ["New" BSD License](./LICENSE).
All contributions require a [Dojo Foundation CLA](http://dojofoundation.org/about/claForm).

## Release History
No stable release yet.
