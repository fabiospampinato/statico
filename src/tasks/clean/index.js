
/* REQUIRE */

const del = require ( 'del' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  return del ( config.clean.all );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'clean', 'Clean generated files' );
