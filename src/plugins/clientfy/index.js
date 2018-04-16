
//TODO: Publish as `clientfy` or something

/* REQUIRE */

const _ = require ( 'lodash' ),
      decache = require ( 'decache' ),
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

let MtimesCache = {};

async function getMtime ( filepath ) {

  if ( MtimesCache[filepath] ) return MtimesCache[filepath];

  return MtimesCache[filepath] = new Promise ( resolve => {

    pify ( fs.stat )( filepath )
      .then ( stat => resolve ( stat.mtime.getTime () ) )
      .catch ( () => resolve ( -1 ) );

  });

}

async function isNewer ( filepath1, filepath2 ) {

  const [Mtime1, Mtime2] = await Promise.all ([
    _.isNumber ( filepath1 ) ? filepath1 : getMtime ( filepath1 ),
    _.isNumber ( filepath2 ) ? filepath2 : getMtime ( filepath2 )
  ]);

  return Mtime1 > Mtime2;

}

const requireHotMtimesCache = {};

async function requireHot ( filepath ) { //TODO: Publish as a standalone module

  const Mtime = await getMtime ( filepath );

  if ( await isNewer ( Mtime, requireHotMtimesCache[filepath] || 0 ) ) {
    decache ( filepath );
    requireHotMtimesCache[filepath] = Mtime;
  }

  return require ( filepath );

}

function parseArgs ( str ) { //FIXME: This is not very robust

  if ( !str ) return [[], undefined];

  str = ` ${str}`.replace ( / (\S+=)/g, ' --$1' ).replace ( /'/g, '`' );

  const args = minimistStr ( str );
        arr = args._.filter ( val => val !== '' ).map ( val => _.isString ( val ) ? val.replace ( /`/g, "'" ) : val ),
        obj = _.mapValues ( _.omit ( args, '_' ), val => _.isString ( val ) ? _.trim ( val, `"'` ).replace ( /`/g, "'" ) : val );

  return [arr, _.isEmpty ( obj ) ? undefined : obj];

}

async function getGlobs ( config, globs ) {

  return globby ( globs, {
    cwd: config.src,
    absolute: true
  });

}

async function readFile ( filepath ) {

  return pify ( fs.readFile )( filepath, { encoding: 'utf-8' } );

}

async function writeFile ( filepath, content ) {

  return pify ( fs.writeFile )( filepath, content );

}

function getPageTemplateNames ( config, filepath ) {

  return _.uniq ( config.templateNamesRe.exec ( filepath ).slice ( 1 ) );

}

function isPageTemplate ( page, template ) {

  return page.templateNames.includes ( template.name );

}

async function getHelpers ( config ) {

  const filepaths = await getGlobs ( config, config.helpersGlob ),
        customHelpers = {};

  await Promise.all ( filepaths.map ( async filepath => {

    const namespace = path.parse ( filepath ).name;

    customHelpers[namespace] = await requireHot ( filepath );

  }));

  const helpers = _.merge ( {}, defaultHelpers, customHelpers );

  return [filepaths, helpers];

}

async function getLayouts ( config ) {

  const filepaths = await getGlobs ( config, config.layoutsGlob ),
        layouts = {};

  await Promise.all ( filepaths.map ( async filepath => {

    const {name} = path.parse ( filepath ),
          content = await readFile ( filepath ),
          layout = { path: filepath, name, content };

    layouts[name] = layout;

  }));

  return [filepaths, layouts];

}

async function canSkipPage ( page, helpersPaths, layoutsPaths ) { // Checking if the output will be the same

  if ( await isNewer ( page.path, page.distPath ) ) return false;

  for ( let helperPath of helpersPaths ) {

    if ( await isNewer ( helperPath, page.distPath ) ) return false;

  }

  for ( let layoutPath of layoutsPaths ) {

    if ( await isNewer ( layoutPath, page.distPath ) ) return false;

  }

  return true;

}

async function getPages ( config ) {

  const pages = {},
        filepaths = await getGlobs ( config, config.pagesGlob ),
        srcLength = config.src.length + config.pagesGlob.indexOf ( '*' );

  await Promise.all ( filepaths.map ( async filepath => {

    const relPath = filepath.substr ( srcLength ),
          distPath = path.join ( config.dist, relPath ),
          templateNames = getPageTemplateNames ( config, filepath ),
          page = { path: filepath, distPath, templateNames };

    pages[filepath] = page;

  }));

  return [filepaths, pages];

}

async function getPagesToRender ( config, pages, helpersPaths, layoutsPaths ) {

  const pagesToRender = {},
        filepaths = Object.keys ( pages );

  await Promise.all ( filepaths.map ( async filepath => {

    const page = pages[filepath];

    if ( await canSkipPage ( page, helpersPaths, layoutsPaths ) ) return;

    pagesToRender[filepath] = page;

  }));

  return pagesToRender;

}

async function getTemplates ( config, pages ) {

  const filepaths = Object.keys ( pages ),
        templates = {};

  await Promise.all ( filepaths.map ( async filepath => {

    const page = pages[filepath],
          pageContent = await readFile ( filepath ),
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
            template = _.merge ( baseData, tagData );

      if ( !template.name ) {

        if ( missingNames ) throw new Error ( `More than 1 template with implicit name in "${filepath}"` );

        template.name = page.templateNames[0];

        missingNames++;

      }

      if ( !page.template && isPageTemplate ( page, template ) ) {

        page.template = template;

      }

      templates[template.name] = template;

    });

  }));

  return templates;

}

function renderPages ( config, helpers, layouts, templates, pages ) {

  _.forOwn ( pages, page => renderPage ( config, helpers, layouts, templates, pages, page ) );

}

function renderPage ( config, helpers, layouts, templates, pages, page ) {

  const {template} = page;

  if ( !template ) throw new Error ( `No template with name(s) ${page.templateNames.map ( name => `"${name}"` ).join ( ', ' )} found in "${page.path}"` );

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
          helper = _.get ( helpers, `${method}.index` ) || _.get ( helpers, method );

    if ( !_.isFunction ( helper ) ) throw new Error ( `Helper "${method}" not found` );

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

  const filepaths = Object.keys ( pages );

  for ( let filepath of filepaths ) {

    const page = pages[filepath],
          folderpath = path.dirname ( page.distPath );

    if ( await getMtime ( folderpath ) === -1 ) {
      await pify ( mkdirp )( folderpath );
    }

    await writeFile ( page.distPath, page.content );

  }

}

/* CLIENTFY */

async function clientfy ( config ) {

  /* RESETTING */

  MtimesCache = {}; // This shouldn't be cached across executions

  /* CONFIG */

  config = _.merge ({
    src: process.cwd (),
    dist: path.join ( process.cwd (), 'dist' ),
    helpersGlob: 'helpers/**/*.js',
    layoutsGlob: 'layouts/*.html',
    pagesGlob: 'pages/**/*.html',
    templateNamesRe: /pages\/(.*?([^/]*))\.html$/i,
    templateRe: /<template([^>]*)>([^]*?)<\/template>/gmi,
    helpersRe: /{{{([^} ]+)(.*?)}}}|{{([^} ]+)(.*?)}}/,
    layout: 'master',
    layoutTemplate: 'template',
    layoutMainTemplate: 'index'
  }, config );

  /* CLIENTFY */

  const [helpersPaths, helpers] = await getHelpers ( config ),
        [layoutsPaths, layouts] = await getLayouts ( config ),
        [pagesPaths, pages] = await getPages ( config ),
        templates = await getTemplates ( config, pages ),
        pagesToRender = await getPagesToRender ( config, pages, helpersPaths, layoutsPaths );

  renderPages ( config, helpers, layouts, templates, pagesToRender );
  minifyPages ( config, pagesToRender );
  writePages ( config, pagesToRender );

}

/* EXPORT */

module.exports = clientfy;
