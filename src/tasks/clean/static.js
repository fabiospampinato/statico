
/* REQUIRE */

const del = require ( 'del' ),
      gutil = require ( '../../gutil' ),
      config = require ( '../../config' );

/* TASK */

function task () {

  return del ( config.clean.static );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'clean-static', 'Clean generated static files', 'all' );
