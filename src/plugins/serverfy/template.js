
'use strict';

/* REQUIRE */

const _ = require ( 'lodash' );

/* STARTUP */

function startup () {

  self.addEventListener ( 'install', () => self.skipWaiting () );
  self.addEventListener ( 'activate', () => self.clients.claim () );

}

startup ();

/* REQUESTS */

function getRawRequests () {

  return /* REQUIRES:INJECT */; // An array of raw requests objects will be injected here

}

function getRequests () {

  const requestsRaw = getRawRequests () || [],
        requests = _.merge ( {}, ...requestsRaw ),
        requestsEnhanced = enhanceRequests ( requests );

  return requestsEnhanced;

}

function enhanceRequests ( requests ) {

  const defaultRequest = {
    delay: 1000,
    verbs: ['GET', 'POST']
  };

  return _.mapValues ( _.cloneDeep ( requests ), ( obj, url ) => {

    if ( _.isPlainObject ( obj ) ) {

      if ( obj.verb ) {

        obj.verbs = _.castArray ( obj.verb );

      }

      if ( obj.url ) {

        obj.urls = _.castArray ( obj.url );

      }

      if ( obj.urls ) {

        obj.urls = _.flatten ( obj.urls.map ( url => [url, `${url}\\?*`] ) );

      }

    } else if ( _.isFunction ( obj ) ) {

      obj = {
        handler: obj
      };

    }

    if ( !obj.urls ) {

      obj.urls = [url, `${url}\\?*`];

    }

    return _.merge ( {}, defaultRequest, obj );

  });

}

/* SERVICE WORKER WARE */

function workerInit () {

  require ( './sww' );

  const worker = new ServiceWorkerWare ();

  workerRequests ( worker );

  worker.init ();

}

function workerRequests ( worker ) {

  const requests = getRequests ();

  _.forOwn ( requests, request => {

    workerRequest ( worker, request );

  });

}

function workerRequest ( worker, request ) {

  const handler = workerHandler ( request );

  request.verbs.forEach ( verb => {

    verb = verb.toLowerCase ();

    request.urls.forEach ( url => {

      worker[verb].call ( worker, url, handler );

    });

  });

}

function workerHandler ( request ) {

  return async function ( ...args ) {

    await new Promise ( resolve => setTimeout ( resolve, request.delay ) );

    const result = await request.handler ( ...args ),
          resultStr = _.isPlainObject ( result ) ? JSON.stringify ( result, undefined, 2 ) : result,
          response = new Response ( resultStr );

    return response;

  };

}

workerInit ();
