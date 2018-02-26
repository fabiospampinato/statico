
/* REQUIRE */

const gulp = require ( 'gulp' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' ),
      buildServer = require ( '../build/server' );

/* TASK */

function task () {

  return gulp.watch ( config.input.server, buildServer );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'watch-server', 'Watch server files', 'all' );
