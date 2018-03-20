
/* REQUIRE */

const _ = require ( 'lodash' );

/* HELPERS */

const helpers = {

  '>': function ( template ) {

    if ( template === this.config.layoutTemplate ) { // Main page template

      return this.page.template.content;

    } else { // Another template

      const obj = this.templates[template];

      if ( !obj ) throw new Error ( `Template "${template}" not found` );

      return obj.content;

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
