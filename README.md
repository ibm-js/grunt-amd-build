# grunt-amd-build [![Build Status](https://travis-ci.org/ibm-js/grunt-amd-build.svg?branch=master)](https://travis-ci.org/ibm-js/grunt-amd-build)

> Grunt plugin to build [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) applications.

## Warning 
This plugin only support RequireJS loader and plugins for now. It will not currently work with the Dojo loader or plugins.

## Overview
The goal of this plugin is to provide a modular build system for AMD applications.
To do so, this plugin focuses on specific tasks, like gathering all the dependencies of a layer, and delegate to other plugins the more general tasks like concatenation or uglification.

The best place to get started is the [documentation](docs/Overview.md).

## Licensing

This project is distributed by the Dojo Foundation and licensed under the ["New" BSD License](./LICENSE).
All contributions require a [Dojo Foundation CLA](http://dojofoundation.org/about/claForm).

