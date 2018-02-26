
/* REQUIRE */

const path = require ( 'path' ),
      gutil = require ( '../../gutil' ),
      clientfy = require ( '../../plugins/clientfy' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  const cwd = process.cwd (),
        src = path.join ( cwd, config.input.client ),
        dist = path.join ( cwd, config.output.client );

  return clientfy ({ src, dist });

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'build-client', 'Build client files', 'all' );
