
//TODO: Avoid `sync` methods
//TODO: Avoid writing the same file to the the disk if it didn't actually change
//TODO: Publish as `clientfy` or something

/* REQUIRE */

const _ = require ( 'lodash' ),
      fs = require ( 'fs' ),
      globby = require ( 'globby' ),
      minify = require ( 'html-minifier' ).minify,
      minimistStr = require ( 'minimist-string' ),
      mkdirp = require ( 'mkdirp' ),
      path = require ( 'path' ),
      pify = require ( 'pify' ),
      stringMatches = require ( 'string-matches' ).default,
      defaultHelpers = require ( './helpers' );

/* UTILITIES */

async function getMtime ( filepath ) {

  try {

    return ( await pify ( fs.stat )( filepath ) ).mtime.getTime ();

  } catch ( e ) {

    return NaN;

  }

}

async function isNewer ( filepath1, filepath2 ) {

  return await getMtime ( filepath1 ) > await getMtime ( filepath2 );

}

function parseArgs ( str ) {

  if ( !str ) return [[], undefined];

  str = ` ${str}`.replace ( / (\S+=)/g, ' --$1' );

  const args = minimistStr ( str );
        arr = args._.filter ( val => val !== '' ),
        obj = _.mapValues ( _.omit ( args, '_' ), val => _.trim ( val, `"'` ) );

  return [arr, _.isEmpty ( obj ) ? undefined : obj];

}

function getGlobs ( config, globs ) {

  return globby ( globs, {
    cwd: config.src,
    absolute: true
  });

}

function readFile ( filepath ) {

  return fs.readFileSync ( filepath, { encoding: 'utf-8' } );

}

async function getHelpers ( config ) {

  const filepaths = await getGlobs ( config, config.helpersGlob );

  const helpers = filepaths.reduce ( ( acc, filepath ) => {

    const namespace = path.parse ( filepath ).name;

    acc[namespace] = require ( filepath );

    return acc;

  }, {} );

  return _.merge ( {}, defaultHelpers, helpers );

}

async function getLayouts ( config ) {

  const filepaths = await getGlobs ( config, config.layoutsGlob );

  return filepaths.reduce ( ( acc, filepath ) => {

    const {name} = path.parse ( filepath ),
          content = readFile ( filepath );

    acc[name] = { name, content };

    return acc;

  }, {} );

}

async function getPages ( config ) {

  const pages = {},
        filepaths = await getGlobs ( config, config.pagesGlob ),
        srcLength = config.src.length + config.pagesGlob.indexOf ( '*' );

  for ( let filepath of filepaths ) {

    const relPath = filepath.substr ( srcLength ),
          distPath = path.join ( config.dist, relPath );

    if ( await isNewer ( distPath, filepath ) ) continue; // Skipping, the source didn't change

    const template = path.parse ( filepath ).name,
          content = '';

    pages[filepath] = { path: filepath, distPath, template, content };

  }

  return pages;

}

function getTemplates ( config, pages ) {

  const templates = {},
        filepaths = Object.keys ( pages );

  filepaths.forEach ( filepath => {

    const pageContent = readFile ( filepath ),
          tags = stringMatches ( pageContent, config.templateRe ),
          headers = tags.map ( match => match[1] ),
          contents = tags.map ( match => match[2] );

    if ( !tags.length ) throw new Error ( `No templates found in "${filepath}"` );

    let missingNames = 0;

    tags.forEach ( ( tag, i ) => {

      const header = headers[i],
            content = contents[i],
            [tagArr, tagData] = parseArgs ( header ),
            baseData = { layout: config.layout, content },
            data = _.merge ( baseData, tagData );

      if ( !data.name ) {

        if ( missingNames ) throw new Error ( `More than 1 template with implicit name in "${filepath}"` );

        data.name = pages[filepath].template;

        missingNames++;

      }

      templates[data.name] = data;

    });

  });

  return templates;

}

function renderPages ( config, helpers, layouts, templates, pages ) {

  _.forOwn ( pages, page => renderPage ( config, helpers, layouts, templates, pages, page ) );

}

function renderPage ( config, helpers, layouts, templates, pages, page ) {

  const template = templates[page.template];

  if ( !template ) throw new Error ( `No template with name "${name}" found in "${page.path}"` );

  const layout = layouts[template.layout];

  if ( !layout ) throw new Error ( `No layout with name "${layout}" found` );

  page.content = layout.content;

  renderHelpers ( config, helpers, layouts, templates, pages, page );

}

function renderHelpers ( config, helpers, layouts, templates, pages, page ) {

  while ( true ) {

    const match = config.helpersRe.exec ( page.content );

    if ( !match ) break;

    const method = _.trim ( match[1] || match[3] ),
          args = _.trim ( match[2] || match[4] ),
          helper = _.get ( helpers, method );

    if ( !helper ) throw new Error ( `Helper "${method}" not found` );

    const thisArg = { config, helpers, layouts, templates, pages, page },
          [arr, obj] = parseArgs ( args ),
          result = helper.call ( thisArg, ...arr, obj ),
          sanitized = match[0].startsWith ( '{{{' ) ? result : _.escape ( result );

    page.content = `${page.content.substr ( 0, match.index )}${sanitized}${page.content.substr ( match.index + match[0].length )}`;

  }

}

function minifyPages ( config, pages ) {

  const minifyOptions = {
    collapseWhitespace: true,
    minifyCSS: false,
    minifyJS: false,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true
  };

  _.forOwn ( pages, page => {

    page.content = minify ( page.content, minifyOptions );

  });

}

async function writePages ( config, pages ) {

  _.forOwn ( pages, page => {

    const folderpath = path.dirname ( page.distPath );

    if ( !fs.existsSync ( folderpath ) ) {
      mkdirp.sync ( folderpath );
    }

    fs.writeFileSync ( page.distPath, page.content );

  });

}

/* CLIENTFY */

async function clientfy ( config ) {

  /* CONFIG */

  config = _.merge ({
    src: process.cwd (),
    dist: path.join ( process.cwd (), 'dist' ),
    helpersGlob: 'helpers/**/*.js',
    layoutsGlob: 'layouts/*.html',
    pagesGlob: 'pages/**/*.html',
    templateRe: /<template([^>]*)>([^]*?)<\/template>/gmi,
    helpersRe: /{{{([^} ]+)(.*?)}}}|{{([^} ]+)(.*?)}}/,
    layout: 'master',
    layoutTemplate: 'template',
    layoutMainTemplate: 'index'
  }, config );

  /* CLIENTFY */

  const helpers = await getHelpers ( config ),
        layouts = await getLayouts ( config ),
        pages = await getPages ( config ),
        templates = getTemplates ( config, pages );

  renderPages ( config, helpers, layouts, templates, pages );
  minifyPages ( config, pages );
  writePages ( config, pages );

}

/* EXPORT */

module.exports = clientfy;
