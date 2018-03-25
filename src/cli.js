
/* REQUIRE */

const _ = require ( 'lodash' ),
      argv = require ( 'yargs' ).argv,
      caporal = require ( 'caporal' ),
      readPkg = require ( 'read-pkg-up' ),
      updateNotifier = require ( 'update-notifier' ),
      gutil = require ( './gutil' );

/* CLI */

async function CLI () {

  /* APP */

  const {pkg} = await readPkg ({ cwd: __dirname });

  updateNotifier ({ pkg }).notify ();

  const app = caporal.version ( pkg.version );

  /* TASKS */

  const taskNames = [
    'clean/client', 'clean/server', 'clean/static', 'clean',
    'watch/client', 'watch/server', 'watch/static', 'watch',
    'build/client', 'build/server', 'build/static', 'build',
    'serve',
    'open',
    'deploy'
  ];
  const tasks = taskNames.map ( name => require ( `./tasks/${name}` ) );
  tasks.forEach ( task => {
    const hidden = ( task.group === 'all' && !argv.all );
    const command = app.command ( task.displayName, task.description ).action ( task ).visible ( !hidden );
    if ( task.displayName === 'open' ) {
      command.option ( '--remote', 'Open the remote url' );
    }
  });

  /* DEFAULT TASK */

  const task = require ( './tasks/default' );
  app.command ( task.displayName, task.description ).action ( task );
  app.action ( task );

  /* HELP */

  app.command ( 'help', 'Display help' )
     .option ( '--all', 'Show all available commands' );

  /* PARSE */

  caporal.parse ( process.argv );

}

/* EXPORT */

module.exports = CLI;
