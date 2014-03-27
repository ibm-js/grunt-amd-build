# grunt-amd-build

> EXPERIMENTAL - Grunt plugin to build [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) applications.

## Warning 
This plugin only support RequireJS loader and plugins for now. It will not currently work with the Dojo loader or plugins.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-amd-build --save-dev
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

## Configuration

The build config is splitted into three propoperties:
* `amdloader`: contains the amd loader config. You can find the documentation [here](http://requirejs.org/docs/api.html#config) for RequireJS.
* `amdbuild`: contains the build configuration (mainly the output directory and the list of layers). This property is shared between the tasks and each tasks add its result to the corresponding layer object.
* `amdplugins`: contains the configuration for the plugin dependencies that will be processed at build time.

## Tasks 

### amddepsscan(layerName, buildConfig, loaderConfig):
Parse the module(s) to include in the layer to find all their dependencies.

#### Arguments
1. layerName _(String)_: The layer name. This should be the name of a property in the `buildConfig.layers` object.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. loaderConfig _(String)_: Name of the property where the amd loader configuration is stored. 

#### Results
This task adds the dependencies to the `buildConfig.layers.layerName` object. The modules and the plugins are stored separately, in `buildConfig.layers.layerName.modules` and in `buildConfig.layers.layerName.plugins`.

### amdplugins(layerName, buildConfig, loaderConfig):
Build the plugin dependencies using the plugin build functions as described [here](http://requirejs.org/docs/plugins.html).
This task use the configuration specified in the `amdplugins` property to configure each plugin.

#### Arguments
1. layerName _(String)_: The layer name. This should be the name of a property in the `buildConfig.layers` object.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. loaderConfig _(String)_: Name of the property where the amd loader configuration is stored. 

#### Results
The result depends on the plugin being build.

### amdserialize(layerName, buildConfig, outputProp):
Write all the files and modules generated by `amddepsscan` and by `amdplugins` to the `buildConfig.dir` directory.
Set the `outputProp` with the list of written files.

#### Arguments
1. layerName _(String)_: The layer name. This should be the name of a property in the `buildConfig.layers` object.
1. buildConfig _(String)_: Name of the property where the build configuration is stored. 
1. outputProp _(String)_: Name of the property where the list of generated files will be stored. 

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

## Use Uglify
The provided tasks are not writing the layer but the task `grunt-contrib-uglify` will do it. 
Using the data outputed by `amdserialize` the Uglify task can be configured properly.

```js
// Config to allow uglify to generate the layer.
uglify: {
    options: {
        banner: "<%= " + outprop + ".header%>"
	},
	dist: {
		src: "<%= " + outprop + ".modules.abs %>",
		dest: outdir + "<%= " + outprop + ".layer %>.js"
	}
}
```

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
