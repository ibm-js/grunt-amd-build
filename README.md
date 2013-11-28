# grunt-dojo-build

> EXPERIMENTAL - Grunt plugin to build Dojo applications.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-dojo-build --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-dojo-build');
```

## The "dojoBuild" task

### Overview
In your project's Gruntfile, add a section named `dojoBuild` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
	dojoBuild: {
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



<!--	
### Usage Examples

#### Default Options
In this example, the default options are used to do something with whatever. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result would be `Testing, 1 2 3.`

```js
grunt.initConfig({
  dojo_build: {
    options: {},
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
})
```

#### Custom Options
In this example, custom options are used to do something else with whatever else. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result in this case would be `Testing: 1 2 3 !!!`

```js
grunt.initConfig({
  dojo_build: {
    options: {
      separator: ': ',
      punctuation: ' !!!',
    },
    files: {
      'dest/default_options': ['src/testing', 'src/123'],
    },
  },
})
```
-->
## Licensing

This project is distributed by the Dojo Foundation and licensed under the ["New" BSD License](https://github.com/dojo/dojo/blob/master/LICENSE#L13-L41).
All contributions require a [Dojo Foundation CLA](http://dojofoundation.org/about/claForm).

## Release History
_(Nothing yet)_
