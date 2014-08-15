/**
 * This module registers a plugin for pre-save events of all
 * element with url field.
 *
 * First the url field is registered if avoidUrl is not configured on the element object.
 */
var molecuel;
var slug = require('speakingurl');
var handlebars = require('handlebars');
var async = require('async');

var url = function url() {
  var self = this;

  molecuel.on('mlcl::elements::registrations:pre', function(elements) {
    self.elements = elements;
    self.urlSchema = {
      url: {type: String, list: true, required: true},
      lang: {type: String},
      type: {type: String, default: 'elements'},
      targetid: {type: elements.ObjectId},
      targeturl: {type: String}
    };

    var schemaDefinition = {
      schemaName: 'url',
      schema: self.urlSchema,
      options: {indexable: true, avoidTranslate: true, avoidUrl: true},
      indexes: [
        [{url: 1, lang: 1},{unique: true}]
      ]
    };
    elements.registerSchemaDefinition(schemaDefinition);
  });
  /**
   * Add plugin to the created models
   */
  molecuel.on('mlcl::elements::registerSchema:post', function(elements, schemaname, modelRegistryElement) {
    var modelConfig = modelRegistryElement.config;
    var model =  modelRegistryElement.schema;
    // check if the schema configuration avoids url creation.
    if(modelConfig && !modelConfig.avoidUrl) {
      model.plugin(self._pluginDefintion, {modelname: schemaname, urlhandler: self});
    }
  });
};

/**
 * Return the definition of the plugin
 * @param schema
 * @param options
 */
url.prototype._pluginDefintion = function _pluginDefintion (schema, options) {
  schema.add({
    url: {type: String, required: false, elastic: {mapping: {type: 'string', index: 'not_analyzed'}}}
  });

  /**
   * emit event when url has been changed
   */
  schema.path('url').set(function(newval) {
    if(this.url !== newval)  {
      molecuel.emit('mlcl::url::changedurl::'+options.modelname, options.urlhandler, this, this.url, newval );
      molecuel.emit('mlcl::url::changedurl', options.urlhandler, options.modelname, this, this.url, newval );
    }
    return newval;
  });

  /**
   * pre validation function to create a url if it does not exist yet
   */
  schema.pre('validate', function (next) {
    var self = this;
    var url = options.urlhandler;
    if(!this.url) {
      url.generateUrl(options.modelname, this, function(err, result) {
        if(!err) {
          self.searchByUrl(result, self.lang, function(err, res) {
            if(res && res.hits) {
              if(res.hits.total === 0) {
                self.url = result;
                next();
              } else if (res.hits.total === 1 && res.hits.hits[0]._id === self._id){
                self.url = result;
                next();
              } else if(res.hits.total >= 1 && res.hits.hits[0]._id !== self._id ) {
                var total = res.hits.total;
                var count = 0;
                var myurl;
                async.whilst(
                  function() {
                    return total >=1;
                  },
                  function(callback) {
                    myurl = result + '-' + count;
                    self.searchByUrl(myurl, self.lang, function(err, res) {
                      if (res.hits.total === 1 && res.hits.hits[0]._id.toString() === self._id.toString()){
                        self.url = myurl;
                        next();
                      }
                      total = res.hits.total;
                      count = count + 1;
                      callback();
                    });
                  },
                  function() {
                    self.url = myurl;
                    next();
                  }
                );
              }
            } else {
              self.url = result;
              next();
            }
          });
        } else {
          next();
        }
      });
    } else {
      next();
    }
  });

  if (options && options.index) {
    schema.path('url').index(options.index);
  }
};

/**
 * Automatically generate a url based on type by loading the patterns from configuration
 * @param type
 * @param object
 * @param callback
 */
url.prototype.generateUrl = function generateUrl(type, object, callback) {
  var conf = molecuel.config.url;
  var pattern =  type + '/{{t _id}}';
  if(conf && conf.pattern && conf.pattern.default) {
    pattern = conf.pattern.default;

    if(conf.pattern[type]) {
      pattern = conf.pattern[type];
    }
  } else {
    console.log('missing default configuration - using fallback');
  }
  this.generateUrlFromPattern(pattern, object, callback);
};

/**
 * Generate a url from pattern
 * @param pattern
 * @param myurlobject
 * @param callback
 * @todo check for result length
 */
url.prototype.generateUrlFromPattern = function generateUrlFromPattern(pattern, myurlobject, callback) {
  handlebars.registerHelper('t', function(string) {
    if(string) {
      return slug(string);
    } else {
      return '';
    }
  });

  // preserve the dot for files
  handlebars.registerHelper('f', function(string) {
    if(string) {
      return slug(string, {
        custom: {
          '!': '-',
          '~': '-',
          '*': '-',
          '\'': '-',
          '(", ")': '-'
        },
        mark: true
      });
    } else {
      return '';
    }
  });
  var template = handlebars.compile(pattern);
  var result = template(myurlobject);

  if(!callback) {
    return result;
  } else {
    callback(null, result);
  }
};

var init = function(mlcl) {
  molecuel = mlcl;
  return new url();
};

module.exports = init;
