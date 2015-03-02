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
				// basic include
				name: 'myapp/base',
				includeFiles: ["myapp/src.js"]
			}, {
				// globbing patterns
				name: 'myapp/glob',
				includeFiles: ["myapp/*.js"]
			}, {
				// exclude
				name: 'myapp/exclude',
				includeFiles: ["myapp/*.js"],
				excludeFiles: ["myapp/src*"]
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
			grunt.task.run('amddirscan:' + layer.name + ':' + name + ':' + amdloader);
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