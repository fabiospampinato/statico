
/* REQUIRE */

const gulp = require ( 'gulp' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  return gulp.src ( config.input.static, { base: config.input.all } )
             .pipe ( gulp.dest ( config.output.static ) );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'build-static', 'Build static files', 'all' );
