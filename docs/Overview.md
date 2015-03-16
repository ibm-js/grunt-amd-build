# Overview

Grunt-amd-build is a grunt plugin providing you with a collection of tasks to help you optimize your AMD application.
There are two main steps to optimize an AMD application:

	1. Bundle all the AMD modules used by the application into a single file, called a __module layer__.
	Using a module layer allows the application to load faster by reducing the number of HTTP request to the server.
	
	1. Minify javascript code to reduce the size of the download to the client. 

Grunt-amd-build focus on the first point as there are already a lot of great Javascript minifier online.
A minimal build process will be composed of 3 tasks:
	
	1. `amddepscan`/`amddirscan`: calculates the list of modules to include, names the modules and processes plugin
	dependencies.
	
	1. `amdserialize`: outputs the results of the previous task so they can be fed to a minifier.
	 
	1. `uglify` or any other minifier: take the results of the previous task and actually create the module layer.

Grunt-amd-build provides you with tasks #1 and #2 but __you need to install a minifier to get task #3__.

This separation in different tasks allows you easily customize a build.
For example if you need to add a banner at the top of your layer you can use the corresponding uglify option like 
you would do for any non-AMD file.

# Installation
This plugin requires Grunt `0.4.x`.

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the
[Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a 
[Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins.

The following commands will install the Grunt-amd-build plugin and a few other plugins that will be needed to setup a build.

```shell
$ npm install grunt-amd-build --save-dev
$ npm install grunt-contrib-uglify --save-dev
$ npm install grunt-contrib-copy --save-dev
$ npm install grunt-contrib-clean --save-dev
```

## Configuration

The build config is split into two common properties:
* `amdloader`: contains the amd loader config. 
	You can find the documentation [here](http://requirejs.org/docs/api.html#config) for RequireJS.
* `amdbuild`: contains the build configuration (mainly the output directory and the list of layers).
	This property is shared between the tasks and each tasks add its result to the corresponding layer object.
	
## Limitation
###Avoid optimization names that are outside the baseUrl

For example, if `baseUrl` is `'js'`, and the build targets:

``` 
layers: [{
	name: "layer.min",
	include: ['../main']
}]
```

The optimization could overwrite or place files outside the output directory.
For those cases, create a paths config to map that file to a local name, like:

```
paths: {
    main: '../main'
}
```

then use:

``` 
layers: [{
	name: "layer.min",
	include: ['main']
}]
```

for the optimization target.	
	
## See also
* [Sample Gruntfile Walkthrough](Walkthough.md)
