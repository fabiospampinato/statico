
/* REQUIRE */

const gutil = require ( '../../gutil' ),
      watchClient = require ( './client' ),
      watchServer = require ( './server' ),
      watchStatic = require ( './static' );

/* TASK */

const task = gutil.parallel ( watchClient, watchServer, watchStatic );

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'watch', 'Watch files for changes and rebuild' );
