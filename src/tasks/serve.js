
/* REQUIRE */

const browserSync = require ( 'browser-sync' ),
      gutil = require ( '../gutil' ),
      config = require ( '../config' );

/* TASK */

function task () {

  return browserSync ( config.browserSync );

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'serve', 'Serve your website' );
