module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      options: {
        browserifyOptions: {
          extensions: ['.jsx'],
        },
        transform: [['babelify', {
          stage: 0,
        }]],
      },
      dist: {
        files: {
          './build/game.js': './src/game.jsx',
        },
      }
    },
    less: {
      dist: {
        files: {
          './build/game.css': './src/game.less',
        },
      },
    },
    watch: {
      main: {
        files: ['src/*'],
        tasks: ['default'],
      },
    },
  });

  grunt.registerTask('default', ['browserify', 'less']);
};