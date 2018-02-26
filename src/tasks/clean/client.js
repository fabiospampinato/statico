
/* REQUIRE */

const del = require ( 'del' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  return del ( config.clean.client );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'clean-client', 'Clean generated client files', 'all' );
