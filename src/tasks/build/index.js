
/* REQUIRE */

const gutil = require ( '../../gutil' ),
      buildClient = require ( './client' ),
      buildServer = require ( './server' ),
      buildStatic = require ( './static' );

/* TASK */

const task = gutil.parallel ( buildClient, buildServer, buildStatic );

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'build', 'Build your website' );
