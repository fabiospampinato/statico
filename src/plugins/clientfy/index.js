
//TODO: Parallelize async loops
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

  return !!page.templateNames.find ( name => name === template.name );

}

async function getHelpers ( config ) {

  const filepaths = await getGlobs ( config, config.helpersGlob ),
        helpers = {};

  for ( let filepath of filepaths ) {

    const namespace = path.parse ( filepath ).name;

    helpers[namespace] = require ( filepath );

  }

  return _.merge ( {}, defaultHelpers, helpers );

}

async function getLayouts ( config ) {

  const filepaths = await getGlobs ( config, config.layoutsGlob ),
        layouts = {};

  for ( let filepath of filepaths ) {

    const {name} = path.parse ( filepath ),
          content = await readFile ( filepath );

    layouts[name] = { name, content };

  }

  return layouts;

}

async function getPages ( config ) {

  const pages = {},
        filepaths = await getGlobs ( config, config.pagesGlob ),
        srcLength = config.src.length + config.pagesGlob.indexOf ( '*' );

  for ( let filepath of filepaths ) {

    const relPath = filepath.substr ( srcLength ),
          distPath = path.join ( config.dist, relPath );

    if ( await isNewer ( distPath, filepath ) ) continue; // Skipping, the source didn't change //TODO: Should also detect changes in the layouts

    const templateNames = getPageTemplateNames ( config, filepath );

    pages[filepath] = { path: filepath, distPath, templateNames };

  }

  return pages;

}

async function getTemplates ( config, pages ) {

  const filepaths = Object.keys ( pages ),
        templates = {};

  for ( let filepath of filepaths ) {

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

  }

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

  const filepaths = Object.keys ( pages );

  for ( let filepath of filepaths ) {

    const page = pages[filepath],
          folderpath = path.dirname ( page.distPath );

    if ( !await getMtime ( folderpath ) ) {
      await pify ( mkdirp )( folderpath );
    }

    await writeFile ( page.distPath, page.content );

  }

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
    templateNamesRe: /pages\/(.*?([^/]*))\.html$/i,
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
        templates = await getTemplates ( config, pages );

  renderPages ( config, helpers, layouts, templates, pages );
  minifyPages ( config, pages );
  writePages ( config, pages );

}

/* EXPORT */

module.exports = clientfy;
