
/* REQUIRE */

const path = require ( 'path' ),
      gutil = require ( '../gutil' ),
      config = require ( '../config' ),
      deploy = require ( '../plugins/deploy' );

/* TASK */

function task () {

  const website = path.join ( process.cwd (), config.output.all );

  return deploy ({ website });

}

/* EXPORT */

module.exports = gutil.task.enhance ( task, 'deploy', 'Deploy your website' );
