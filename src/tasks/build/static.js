
/* REQUIRE */

const gulp = require ( 'gulp' ),
      newer = require ( 'gulp-newer' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  return gulp.src ( config.input.static, { dot: true, base: config.input.all } )
             .pipe ( newer ( config.output.static ) )
             .pipe ( gulp.dest ( config.output.static ) );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'build-static', 'Build static files', 'all' );
