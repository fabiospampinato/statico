
/* REQUIRE */

const _ = require ( 'lodash' ),
      findUp = require ( 'find-up-json' );

/* CONFIG */

const defaults = {
  input: {
    all: 'src',
    client: 'src/client',
    server: 'src/server',
    static: ['src/static/**/*', 'src/*.*', 'src/CNAME']
  },
  output: {
    all: 'dist',
    client: 'dist',
    server: 'dist/server.js',
    static: 'dist'
  },
  clean: {
    all: 'dist',
    client: 'dist/**/*.html',
    server: 'dist/server.js',
    static: ['dist/static', 'dist/*.*', '!dist/*.html']
  },
  browserSync: {
    server: 'dist',
    files: 'dist',
    ignore: 'dist/**/*.scss',
    port: 3000,
    ui: false,
    notify: false
  }
};

const dotfile = findUp ( 'statico.json', process.cwd () );

const custom = dotfile ? dotfile.content : {};

/* EXPORT */

module.exports = _.merge ( {}, defaults, custom );
