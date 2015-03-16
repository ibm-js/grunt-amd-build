# Gruntfile walkthrough

You can follow along with the [sample Gruntfile](../samples/Gruntfile.js).

## Example Setup
The example in this page assumes this setup:

```
└── src/
    ├── js/
    │   ├── main.js
    │   ├── one.js
    │   └── two.js
    ├── Gruntfile.js
    └── index.html
```

The `main` module depends on `one` and `two`.

## Common variables
```js
// A temporary directory used by amdserialize to output the processed modules.
var tmpdir = "../tmp/";
```

This directory will contain the source modified by grunt-amd-build tasks.
Those files will then be minified and concatenated by UglifyJS.

```js
// The final output directory.
var outdir = "../build/";
```

Uglify will write the minified files inside this directory.
The plugin files that cannot be optimized are just copied from the temporary directory to this directory.

__Note:__ Both paths are relative to the Gruntfile.

```js
	// The grunt.config property populated by amdserialize, containing the
	// list of files to include in the layer.
	var outprop = "amdoutput";
```

This is the name of the grunt config property that will be used to configure UglifyJS.
This property will contain the list of files written to the temporary directory.

## Configuration
### amdloader

```js
// The loader config should go here.
amdloader: {
	baseUrl: "./js/"
}
```
The `amdloader` property contains the requirejs configuration of your application.
This step should be just a copy paste of requirejs configuration.
__Note:__ `baseUrl` is relative to the Gruntfile.

### amdbuild

```js
// The common build config
amdbuild: {
	// dir is the destination of processed files.
	dir: tmpdir,

	// List of layers to build.
	layers: [{
		name: "main.min",
		include: [
			"main"
		]
	}]
}
```

The `amdbuild` property is the main configuration target shared by all Grunt-amd-build tasks.
Extensive documentation of each tasks can be found in the [api documentation](api/index.md).

* `dir`: use the previously defined temporary directory to output the files processed by the build.
* `layers`: describe all the layers and their dependencies.
	It is used by both `amddepsscan` and `amddirscan`.

In this sample, the application have a single entry-point, `main`.
Since it is specified in the `include` field all its dependencies will be included in the layer.


### UglifyJS

The configuration written by amdserialiaze is used to configure UglifyJS.

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
For the full list of properties published by `amdserialize` see the [api documentation](api/amdserialize.md).

__Note:__ If you want to use the __source-map__ option in Uglify, you should keep the output of `amdserialize` in the `buildConfig.dir` directory.
Otherwise the original sources will not be found.

### Copying the plugin files
The plugin files are in the temporary directory and are not in the layer so they need to be copied to the final output directory.

```js
// Copy the plugin files to the real output directory.
copy: {
    dist: {
		expand: true,
		cwd: tmpdir,
		src: "<%= " + outprop + ".plugins.rel %>",
		dest: outdir,
		dot: true
	}
}
```
Note that the `plugins` property from `amdserialize` output is used.

### Clean
Just erasing the previous build result.

```
// Erase previous build.
clean: {
	erase: [outdir]
}
```

## amdbuild task

This task define an end-to-end build.

```js
// The main build task.
grunt.registerTask("amdbuild", function (amdloader) {
	var name = this.name;
	var	layers = grunt.config(name).layers;
	
	grunt.task.run("erase");
	
	layers.forEach(function (layer) {
		grunt.task.run("amddepsscan:" + layer.name + ":" + name + ":" + amdloader);
		grunt.task.run("amdserialize:" + layer.name + ":" + name + ":" + outprop);
		grunt.task.run("uglify");
		grunt.task.run("copy:plugins");
	});
	
	grunt.task.run("amdreportjson:" + name);
});
```

For each layer, it runs a construction task, then output the result using the serialization task, then this is combined by UglifyJS and the plugins are copied to the destination.
This function is the reason of grunt-amd-build flexibility.
The [complete sample of Gruntfile](../samples/Gruntfile-full.js) shows how this function can be easily modified to create a custom build.
 
## Grunt bootstrapping

Load the plugins and define a shorthand 

```
// Load the npm plugins
grunt.loadNpmTasks("grunt-amd-build");
grunt.loadNpmTasks("grunt-contrib-uglify");
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-clean');

```

