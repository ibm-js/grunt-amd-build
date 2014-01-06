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

## The "amdBuild" task

### Overview
In your project's Gruntfile, add a section named `amdBuild` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
	amdBuild: {
		baseUrl: "./",
		dir: "dist",
		optimize: "none",
		packages: [{
			name: "myapp",
			location: "myapp"
		}, {
			name: "mypackage",
			location: "mylocalpackage"
		}],

		map: {
			"mypackage/foo": {
				"mypackage/bar": "bar-mapped"
			}
		},

		paths: { "mypackage/foo": "patch/foo"},
		
		layers: {
			"myapp/src": {}
		}		
	},
})
```

### Options

#### baseUrl
Type: `String`
Default value: `'./'`

The reference url for the paths.

More info: http://requirejs.org/docs/api.html#config-baseUrl

#### dir
Type: `String`
Default value: `'dist'`

The path to the output directory.

#### optimize
Type: `String`
Default value: `'none'`

Can be none or uglify.

If you want use uglify, you have to make sure uglify is installed and loaded in grunt. Instructions are available at https://github.com/gruntjs/grunt-contrib-uglify

#### packages
Type: `array`
Default value: `[]`

List of packages.

More info: http://requirejs.org/docs/api.html#config-packages

#### map
Type: `object`
Default value: `{}`

Substitute a mid in a particular module to allow multiple versions of a module to be used in a project.

More info: http://requirejs.org/docs/api.html#config-map

#### paths
Type: `object`
Default value: `{}`

Define a custom path for a specific module.

More info: http://requirejs.org/docs/api.html#config-paths

#### layers
Type: `object`
Default value: `{}`

Define a layer that will be written with all its dependencies.


## Licensing

This project is distributed by the Dojo Foundation and licensed under the ["New" BSD License](./LICENSE).
All contributions require a [Dojo Foundation CLA](http://dojofoundation.org/about/claForm).

## Release History
0.2.0: prototype with basic configuration working
