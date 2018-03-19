
/* REQUIRE */

const _ = require ( 'lodash' );

/* HELPERS */

const helpers = {

  '>': function ( template ) {

    if ( template === this.config.layoutTemplate ) { // Main page template

      return this.page.template.content;

    } else { // Another template

      return this.templates[template].content;

    }

  },

  title: function ( homepage, advanced ) {

    if ( this.page.template.name === this.config.layoutMainTemplate ) return homepage;

    const title = _.startCase ( this.page.template.title || this.page.template.name );

    return advanced.replace ( '[title]', title );

  }

};

/* EXPORT */

module.exports = helpers;
