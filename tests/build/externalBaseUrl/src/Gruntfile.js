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
            baseUrl: '../libs/',
            packages: [
                {
                    name: 'myapp',
                    location: '../src/myapp'
                }
            ]
        },
        amdbuild: {
            dir: tmpdir,
            layers: [{
				name: 'myapp/layer',
				include: ["myapp/src"]
			}]
        },
        amdreportjson: {
            dir: outdir
        },
        concat: {
            options: { separator: ';\n' },
            dist: common
        },
        clean: {
            finish: [tmpdir]
        }
    });
    grunt.registerTask('amdbuild', function (amdloader) {
        var name = this.name, layers = grunt.config(name).layers;
        layers.forEach(function (layer) {
			grunt.task.run('amddepsscan:' + layer.name + ':' + name + ':' + amdloader);
			grunt.task.run('amdserialize:' + layer.name + ':' + name + ":" + amdloader + ':' + outprop);
            grunt.task.run('concat');
        });
    });
    grunt.registerTask('build', [
        'amdbuild:amdloader',
        'amdreportjson:amdbuild'/*,
        'clean:finish'*/
    ]);
};