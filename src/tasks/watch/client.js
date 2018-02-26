
/* REQUIRE */

const gulp = require ( 'gulp' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' ),
      buildClient = require ( '../build/client' );

/* TASK */

function task () {

  return gulp.watch ( config.input.client, buildClient );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'watch-client', 'Watch client files', 'all' );
