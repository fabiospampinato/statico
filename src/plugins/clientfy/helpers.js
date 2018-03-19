
/* REQUIRE */

const _ = require ( 'lodash' );

/* HELPERS */

const helpers = {

  '>': function ( template ) {

    template = ( template === this.config.layoutTemplate ) ? this.page.template : template;

    return this.templates[template].content;

  },

  title: function ( homepage, advanced ) {

    if ( this.page.template === this.config.layoutMainTemplate ) return homepage;

    const title = this.templates[this.page.template].title || this.page.template;

    return advanced.replace ( '[title]', _.startCase ( title ) );

  }

};

/* EXPORT */

module.exports = helpers;
