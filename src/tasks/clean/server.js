
/* REQUIRE */

const del = require ( 'del' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  return del ( config.clean.server );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'clean-server', 'Clean generated server files', 'all' );
