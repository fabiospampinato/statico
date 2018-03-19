
/* REQUIRE */

const path = require ( 'path' ),
      gutil = require ( '../../gutil' ),
      serverfy = require ( '../../plugins/serverfy' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  const cwd = process.cwd (),
        src = path.join ( cwd, config.input.server ),
        dist = path.join ( cwd, config.output.server );

  return serverfy ({ src, dist });

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'build-server', 'Build server files', 'all' );
