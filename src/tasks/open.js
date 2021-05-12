
/* REQUIRE */

const _ = require ( 'lodash' ),
      argv = require ( 'yargs' ).argv,
      fs = require ( 'fs' ),
      open = require ( 'open' ),
      path = require ( 'path' ),
      pify = require ( 'pify' ),
      {color} = require ( 'specialist' ),
      gutil = require ( '../gutil' ),
      config = require ( '../config' );

/* TASK */

async function task () {

  let url;

  if ( argv.remote ) {

    const CNAME = path.join ( process.cwd (), config.input.all, 'CNAME' );

    try {

      const content = await pify ( fs.readFile )( CNAME, { encoding: 'utf8' } );

      url = `http://${_.trim ( content )}`;

    } catch ( e ) {

      throw new Error ( `CNAME file not found in "${color.underline ( CNAME )}"` );

    }

  } else {

    url = `http://localhost:${config.browserSync.port}`;

  }

  open ( url );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'open', 'Open your website' );
