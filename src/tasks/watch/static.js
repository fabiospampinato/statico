
/* REQUIRE */

const gulp = require ( 'gulp' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' ),
      buildStatic = require ( '../build/static' );

/* TASK */

function task () {

  return gulp.watch ( config.input.static, buildStatic );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'watch-static', 'Watch static files', 'all' );
