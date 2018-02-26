
//TODO: Avoid `sync` methods
//TODO: Publish as `serverfy` or something

/* REQUIRE */

const _ = require ( 'lodash' ),
      fs = require ( 'fs' ),
      globby = require ( 'globby' ),
      mkdirp = require ( 'mkdirp' ),
      path = require ( 'path' ),
      pify = require ( 'pify' ),
      webpack = require ( 'webpack' );

/* UTILITIES */

function readFile ( filepath ) {

  return pify ( fs.readFile )( filepath, { encoding: 'utf-8' } );

}

function writeFile ( filepath, template ) {

  const folderpath = path.dirname ( filepath );

  mkdirp.sync ( folderpath );

  fs.writeFileSync ( filepath, template );

}

function getGlobs ( config, globs ) {

  return globby ( globs, {
    cwd: config.src,
    absolute: true
  });

}

function parseTemplate ( config, template, filepaths ) {

  const requires = `[${filepaths.map ( filepath => `require ( '${filepath}' )`).join ( ', ')}]`;

  return template.replace ( config.injectionRe, requires );

}

async function compileTemplate ( config, template ) {

  /* TEMP */

  const TEMP_PATH = path.join ( __dirname, '.temp_server.js' );

  fs.writeFileSync ( TEMP_PATH, template );

  /* COMPILE */

  const TEMP_WEBPACK_PATH = path.join ( __dirname, '.temp_webpack_server.js' );

  const webpackConfig = _.merge ({
    entry: TEMP_PATH,
    output: {
      path: __dirname,
      filename: '.temp_webpack_server.js'
    }
  }, config.webpack );

  const stats = await pify ( webpack )( webpackConfig );

  if ( stats.hasErrors () ) throw stats.toJson ().errors;

  const compiled = await readFile ( TEMP_WEBPACK_PATH );

  /* CLEAN UP */

  fs.unlinkSync ( TEMP_PATH );
  fs.unlinkSync ( TEMP_WEBPACK_PATH );

  return compiled;

}

/* SERVERFY */

async function serverfy ( config ) {

  /* CONFIG */

  config = _.merge ({
    src: process.cwd (),
    dist: path.join ( process.cwd (), 'dist', 'server.js' ),
    template: path.join ( __dirname, 'template.js' ),
    requestsGlob: '**/*.js',
    injectionRe: /\/\* REQUIRES:INJECT \*\//,
    webpack: {
      mode: 'development'
    }
  }, config );

  /* SERVERFY */

  const requests = await getGlobs ( config, config.requestsGlob );

  if ( !requests.length ) return;

  const template = await readFile ( config.template ),
        templateParsed = parseTemplate ( config, template, requests ),
        templateCompiled = await compileTemplate ( config, templateParsed );

  writeFile ( config.dist, templateCompiled );

}

/* EXPORT */

module.exports = serverfy;
