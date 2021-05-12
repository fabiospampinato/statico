
//TODO: Same as `pacco`'s, publish this as a package

/* REQUIRE */

const _ = require ( 'lodash' ),
      argv = require ( 'yargs' ).argv,
      asyncDone = require ( 'async-done' ),
      fancyLog = require ( 'fancy-log' ),
      gulp = require ( 'gulp' ),
      time = require ( 'pretty-time' ),
      {color} = require ( 'specialist' ),
      config = require ( './config' );

/* GUTIL */

const gutil = {

  log: fancyLog,

  sequence ( type, ...tasks ) { // In order to make the invoker return a promise instead of undefined

    return function invoker ( callback ) {

      return new Promise ( resolve => {

        gulp.series ( gulp[type].call ( gulp, ...tasks ), resolve )( callback );

      });

    }

  },

  series ( ...tasks ) {

    return gutil.sequence ( 'series', ...tasks );

  },

  parallel ( ...tasks ) {

    return gutil.sequence ( 'parallel', ...tasks );

  },

  task: {

    catchError ( result ) {

      if ( !result || !result.catch ) return result;

      return result.catch ( err => console.error ( err.message ) );

    },

    withLogger ( task, name ) {

      function withLogger ( ...args ) {

        let startTime;

        function start () {

          startTime = process.hrtime ();

          gutil.log ( `Starting '${color.cyan ( name )}'...` );

        }

        function end () {

          const elapsed = process.hrtime ( startTime );

          gutil.log ( `Finished '${color.cyan ( name )}' after ${color.magenta ( time ( elapsed ) )}` );

        }

        start ();

        const res = task ( ...args );

        asyncDone ( () => res, end );

        return gutil.task.catchError ( res );

      }

      return withLogger;

    },

    withMetadata ( task, name, description, group, args ) {

      if ( name ) task.displayName = name;
      if ( description ) task.description = description;
      if ( group ) task.group = group;
      if ( args ) task.args = args;

      return task;

    },

    enhance ( task, ...metadata ) {

      const withLogger = argv.quiet ? task : gutil.task.withLogger ( task, ...metadata ),
            withMetadata = gutil.task.withMetadata ( withLogger, ...metadata );

      return withMetadata;

    }

  }

};

/* EXPORT */

module.exports = gutil;
