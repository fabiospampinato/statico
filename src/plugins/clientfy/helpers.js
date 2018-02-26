
/* HELPERS */

const helpers = {

  '>': function ( template ) {

    template = ( template === this.config.layoutTemplate ) ? this.page.template : template;

    return this.templates[template].content;

  }

};

/* EXPORT */

module.exports = helpers;
