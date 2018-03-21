
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

async function readFile ( filepath ) {

  return pify ( fs.readFile )( filepath, { encoding: 'utf-8' } );

}

async function writeFile ( filepath, content ) {

  const folderpath = path.dirname ( filepath );

  await pify ( mkdirp )( folderpath );

  await pify ( fs.writeFile )( filepath, content );

}

async function unlinkFile ( filepath ) {

  return pify ( fs.unlink )( filepath );

}

async function getGlobs ( config, globs ) {

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

  await writeFile ( TEMP_PATH, template );

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

  if ( stats.hasErrors () ) throw new Error ( _.first ( _.castArray ( stats.toJson ().errors ) ) );

  const compiled = await readFile ( TEMP_WEBPACK_PATH );

  /* CLEAN UP */

  await unlinkFile ( TEMP_PATH );
  await unlinkFile ( TEMP_WEBPACK_PATH );

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
