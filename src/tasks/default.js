
/* REQUIRE */

const gutil = require ( '../gutil' ),
      build = require ( './build' ),
      watch = require ( './watch' );

/* TASK */

const task = gutil.series ( build, watch );

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'default', 'Build and watch' );
