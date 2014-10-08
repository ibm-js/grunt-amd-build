module.exports = function (grunt) {
    'use strict';
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-amd-build');
    var outprop = 'amdoutput';
    var deploydir = './deploy/';
    var outdir = '../results/';
    var tmpdir = './tmp/';
    var common = {
            options: { banner: '<%= ' + outprop + '.header%>' },
            src: '<%= ' + outprop + '.modules.abs %>',
            dest: outdir + '<%= ' + outprop + '.layerPath %>'
        };
    grunt.initConfig({
        amdloader: {
            baseUrl: './bower_components/',
            packages: [
                {
                    name: 'myapp',
                    location: '../myapp'
                },
                {
                    name: 'mypackage',
                    location: '../mylocalpackage'
                }
            ],
            map: { 'mypackage/foo': { 'mypackage/bar': '../bar-mapped' } },
            paths: {
                'css': '../css',
                'mypackage/foo': '../patch/foo',
                'angular': 'angular/angular',
                'angular-loader': 'angular-loader/angular-loader',
				'jquery': 'jquery/dist/jquery'
            },
            shim: {
                'angular': {
                    exports: 'angular',
                    deps: ['angular-loader', 'jquery']
                },
                'angular-loader': {}
            },
            config: { 'requirejs-dplugins/i18n': { locale: 'fr-fr' } }
        },
        amdbuild: {
            dir: tmpdir,
            layers: [{
                    name: 'myapp/src'
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
            },
            deploy: {
                expand: true,
                cwd: outdir + '<%= amdloader.baseUrl %>',
                src: '**/*',
                dest: deploydir,
                dot: true
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
    grunt.registerTask('deploy', ['copy:deploy']);
};