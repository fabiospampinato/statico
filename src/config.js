
/* REQUIRE */

const _ = require ( 'lodash' ),
      rdf = require ( 'require-dot-file' );

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
    port: 3000,
    ui: false,
    notify: false
  }
};

const custom = rdf ( 'statico.json', process.cwd () ) || {};

/* EXPORT */

module.exports = _.merge ( {}, defaults, custom );
