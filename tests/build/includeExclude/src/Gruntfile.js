module.exports = function (grunt) {
    'use strict';
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-amd-build');
    var outprop = 'amdoutput';
    var outdir = '../results/';
    var tmpdir = './tmp/';
    var common = {
            options: { banner: '<%= ' + outprop + '.header%>' },
            src: '<%= ' + outprop + '.modules.abs %>',
            dest: outdir + '<%= ' + outprop + '.layerPath %>'
        };
    grunt.initConfig({
        amdloader: {
            baseUrl: './',
            packages: [
                {
                    name: 'mypackage',
                    location: './mylocalpackage'
                }
            ]
        },
        amdbuild: {
            dir: tmpdir,
            layers: [{
				// Test for self-inclusion of the layer name
				name: 'myapp/self'
			}, {
				// Test for simple include
				name: 'myapp/include',
				include: ["mypackage/foo"]
			}, {
				// Test for double include
				name: 'myapp/includeDouble',
				include: ["mypackage/foo", "mypackage/foo"]
			}, {
				// Test for double dependency include
				name: 'myapp/includeDoubleDeps',
				include: ["mypackage/foo", "mypackage/qux"]
			}, {
				// Test for simple includeShallow
				name: 'myapp/includeShallow',
				includeShallow: ["mypackage/foo"]
			}, {
				// Test for double includeShallow
				name: 'myapp/includeShallowDouble',
				includeShallow: ["mypackage/foo", "mypackage/foo"]
			}, {
				// Test for include layer currently building
				name: 'myapp/includeLayer',
				includeLayers: ["myapp/include"]
			}, {
				// Test for include layer currently building without deps
				name: 'myapp/includeLayerShallow',
				includeLayers: ["myapp/includeShallow"]
			}, {
				// Test for include layer already existing
				name: 'myapp/includeExistingLayer',
				includeLayers: ["existingLayer"]
			}, {
				// Test for exclude layer currently building
				name: 'myapp/excludeLayer',
				include: ["mypackage/qux"],
				excludeLayers: ["myapp/include"]
			}, {
				// Test for exclude layer currently building without deps
				name: 'myapp/excludeLayerShallow',
				include: ["mypackage/qux"],
				excludeLayers: ["myapp/includeShallow"]
			}, {
				// Test for exclude layer already existing
				name: 'myapp/excludeExistingLayer',
				include: ["mypackage/qux"],
				excludeLayers: ["existingLayer"]
			}, {
				// Test explicitly included, implicitly excluded
				name: 'myapp/mustIncludeBarNotFoo',
				include: ["mypackage/bar"],
				exclude: ["mypackage/foo"]
			}, {
				// Test implicitly included, explicitly excluded
				name: 'myapp/mustIncludeFooNotBar',
				include: ["mypackage/foo"],
				exclude: ["mypackage/bar"]
			}, {
				// Test implicitly included, implicitly excluded
				name: 'myapp/mustIncludeFooNotBarNotQux',
				include: ["mypackage/foo"],
				exclude: ["mypackage/qux"]
			}, {
				// Test explicitly included, explicitly excluded
				name: 'myapp/mustBeEmpty1',
				include: ["mypackage/foo"],
				exclude: ["mypackage/foo"]
			}, {
				// Test explicitly includedShallow, explicitly excluded
				name: 'myapp/mustBeEmpty2',
				includeShallow: ["mypackage/foo"],
				exclude: ["mypackage/foo"]
			}, {
				// Test explicitly included, explicitly excludedShallow
				name: 'myapp/mustBeEmpty3',
				include: ["mypackage/foo"],
				excludeShallow: ["mypackage/foo"]
			}, {
				// Test explicitly includedShallow, explicitly excludedShallow
				name: 'myapp/mustBeEmpty4',
				includeShallow: ["mypackage/foo"],
				excludeShallow: ["mypackage/foo"]
			}, {
				// Include resource
				name: 'myapp/pluginResource',
				include: ["myapp/plugin!fooResource"]
			}, {
				// IncludeShallow resource
				name: 'myapp/pluginResourceShallow',
				includeShallow: ["myapp/plugin!includeShallowResource"]
			}, {
				// IncludeShallow resource and exclude plugin
				name: 'myapp/excludePlugin',
				includeShallow: ["myapp/plugin!resourceButNoPlugin"],
				exclude: ["myapp/plugin"]
			}, {
				// Include resource and excludeShallow plugin
				name: 'myapp/excludePlugin2',
				include: ["myapp/plugin!resourceButNoPlugin"],
				excludeShallow: ["myapp/plugin"]
			}, {
				// Include resource plugin deps and its deps
				name: 'myapp/PluginDepsAndDeps',
				include: ["myapp/plugin!addModules"]
			}, {
				// Include resource plugin deps
				name: 'myapp/PluginDeps',
				includeShallow: ["myapp/plugin!addModules"]
			}, {
				// Include resource without plugin deps
				name: 'myapp/NoPluginDeps',
				include: ["myapp/plugin!addModules"],
				exclude: ["mypackage/foo"]
			}, {
				// Include resource without plugin deps
				name: 'myapp/NoPluginDepsShallow',
				include: ["myapp/plugin!addModules"],
				excludeShallow: ["mypackage/foo"]
			}, {
				// Exclude resource
				name: 'myapp/noResource',
				include: ["myapp/src"],
				exclude: ["myapp/plugin!srcResource"]
			}, {
				// Exclude resource shallow
				name: 'myapp/noResourceShallow',
				include: ["myapp/src"],
				excludeShallow: ["myapp/plugin!srcResource"]
			}]
        },
        amdreportjson: {
            dir: outdir
        },
        concat: {
            options: { separator: ';\n' },
            dist: common
        },
        copy: {
            plugins: {
                expand: true,
                cwd: tmpdir,
                src: '<%= ' + outprop + '.plugins.rel %>',
                dest: outdir
            }
        },
        clean: {
            finish: [tmpdir]
        }
    });
    grunt.registerTask('amdbuild', function (amdloader) {
        var name = this.name, layers = grunt.config(name).layers;
        layers.forEach(function (layer) {
			grunt.task.run("amdshim:" + layer.name + ":" + name + ":" + amdloader);
			grunt.task.run('amddepsscan:' + layer.name + ':' + name + ':' + amdloader);
			grunt.task.run('amdserialize:' + layer.name + ':' + name + ':' + outprop);
            grunt.task.run('concat');
            grunt.task.run('copy:plugins');
        });
    });
    grunt.registerTask('build', [
        'amdbuild:amdloader',
        'amdreportjson:amdbuild',
        'clean:finish'
    ]);
};