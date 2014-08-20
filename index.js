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
      lang: {type: String, required: true},
      type: {type: String, default: 'elements'},
      targetid: {type: elements.ObjectId},
      targeturl: {type: String},
      status: {type: String, default: 'active'}
    };

    var schemaDefinition = {
      schemaName: 'url',
      schema: self.urlSchema,
      options: {indexable: false, avoidTranslate: true, avoidUrl: true},
      indexes: [
        [{url: 1, lang: 1, status: 1},{unique: true}]
      ]
    };
    elements.registerSchemaDefinition(schemaDefinition);
  });

  /**
  * url findByUrl function
  */
  molecuel.on('mlcl::elements::setElementType:post::url', function( elements, model) {
    self.findByUrl = self._findByUrl(model);
    elements.findByUrl = self._findByUrl(model);
    self.createUrlEntry = self._createUrlEntry(model);
    elements.createUrlEntry = self._createUrlEntry(model);
    self.deleteUrlsById = self._deleteUrlsById(model);
    elements.deleteUrlsById = self._deleteUrlsById(model);
    self.deleteUrlsByUrl = self._deleteUrlsByUrl(model);
    elements.deleteUrlsByUrl = self._deleteUrlsByUrl(model);
    self.deleteUrlsByTargetUrl = self._deleteUrlsByTargetUrl(model);
    elements.deleteUrlsByTargetUrl = self._deleteUrlsByTargetUrl(model);
  });

  molecuel.on('mlcl::elements::setElementType:post', function(elements, name, model) {
    if(name !== 'url') {
      model.registerSaveHandler(self.saveHandler);
    }
  });

  /**
   * Add plugin to the created models
   */
  molecuel.on('mlcl::elements::registerSchema:post', function(elements, schemaname, modelRegistryElement) {
    if(schemaname !== 'url') {
      var options = modelRegistryElement.options;
      var model =  modelRegistryElement.schema;
      // check if the schema configuration avoids url creation.
      if(options && !options.avoidUrl) {
        model.plugin(self._pluginDefintion, {modelname: schemaname, urlhandler: self});
      }
    }
  });

};

/*************************************************************************
 SINGLETON CLASS DEFINITION
*************************************************************************/
var instance = null;

var getInstance = function(){
  return instance || (instance = new url());
};


/**
 * _findByUrl - Returns the function which finds the correct object for the url
 *
 * @param  {object} model This is the url model
 * @return {function}     The find function based on the model
 */
url.prototype._findByUrl = function _findByUrl(model) {
  return function(url, lang, callback) {
    model.findOne(
      {
        url: url,
        '$or': [
          {lang: lang},
          {$exists: {lang: false}}
        ]
      }, callback);
  };
};


/**
 * _createUrlEntry - Creates a new url entry
 *
 * @param  {object} model The url model
 * @return {function}     The function which creates new url entries
 */
url.prototype._createUrlEntry = function _createUrlEntry(model) {
  return function(entry, callback) {
    var urlentry = new model({
      url: entry.url,
      lang: entry.lang,
      targetid: entry._id,
    });

    urlentry.save(function(err, result) {
      if(err) {
        molecuel.log.error('mlcl_url','Error while creating url' + err);
      }
      callback(err, result);
    });
  };
};


/**
 * _deleteUrlsById - Deletes all urls found for a target id.
 *
 * This should be used if a new element fails to be saved
 *
 * @param  {object} model the url model
 * @return {function}     returns the remove functions
 */
url.prototype._deleteUrlsById = function _deleteUrlsById(model) {
  return function(entry, callback) {
    model.remove({targetid: entry._id}, function(err) {
      if(err) {
        molecuel.log.error('mlcl_url','Error while deleting url' + err);
      }
      callback(err);
    });
  };
};

/**
 * _deleteUrlsByUrl - Deletes all entries found by url and language from mongodb
 *
 * @param  {object} model the url model
 * @return {function}     returns the remove functions
 */
url.prototype._deleteUrlsByUrl = function _deleteUrlsByUrl(model) {
  return function(entry, callback) {
    model.remove({url: entry.url, lang: model.lang}, function(err) {
      if(err) {
        molecuel.log.error('mlcl_url','Error while deleting url' + err);
      }
      callback(err);
    });
  };
};

 /**
  * _deleteUrlsByTargetUrl - Deletes all entries found with the target url from mongodb
  *
  * @param  {object} model The model to initialize the function
  * @return {function} returns the remove function
  */
url.prototype._deleteUrlsByTargetUrl = function _deleteUrlsByTargetUrl(model) {
  return function(entry, callback) {
    model.remove({targeturl: entry.targeturl}, function(err) {
      if(err) {
        molecuel.log.error('mlcl_url','Error while deleting url' + err);
      }
      callback(err);
    });
  };
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
   *
   * @todo handle rewrites here
   */
  schema.path('url').set(function(newval) {
    if(this.url !== newval)  {
      molecuel.emit('mlcl::url::changedurl::'+options.modelname, options.urlhandler, this, this.url, newval );
      molecuel.emit('mlcl::url::changedurl', options.urlhandler, options.modelname, this, this.url, newval );
    }
    return newval;
  });

  /**
   * anonymous function - pre validation function to create a url if it does not exist yet
   *
   * @param  {function} next callback function can ship error if error is added as parameter
   * @return {function}      the callback should not return a error to succeed
   */
  schema.pre('save', function (next) {
    var self = this;
    var url = options.urlhandler;
    if(!this.url) {
      url.generateUrl(options.modelname, this, function(err, result) {
        if(!err) {
          url.findByUrl(result, self.lang, function(err, res) {
            if(!err) {
              // check if there is already a url
              if(!res) {
                self.url = result;
                url.createUrlEntry(self, function(err) {
                  if(err) {
                    next(err);
                  } else {
                    next();
                  }
                });
              } else {
                // check if i found myself
                if(res._id === self._id) {
                  next();
                } else {
                  var total = 1;
                  var count = 0;
                  var myurl;
                  async.whilst(
                    function() {
                      return total >=1;
                    },
                    function(callback) {
                      myurl = result + '-' + count;
                      url.findByUrl(myurl, self.lang, function(err, res) {
                        if(!res) {
                          self.url = myurl;
                          total = 0;
                          callback();
                        } else {
                          total = 1;
                          count = count + 1;
                          callback();
                        }
                      });
                    },
                    function() {
                      self.url = myurl;
                      url.createUrlEntry(self, function(err) {
                        if(err) {
                          next(err);
                        } else {
                          next();
                        }
                      });
                    }
                  );
                }
              }
            } else {
              next(err);
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

  schema.pre('save', function(next) {
    if(this.isNew) {
      this.wasNew = true;
    }
    next();
  });

  if (options && options.index) {
    schema.path('url').index(options.index);
  }
};

/**
 * Save handler for mongoose which will be executed before the callback function returns
 * @param err
 * @param result
 * @param options
 * @param callback
 **/
url.prototype.saveHandler = function(err, result, options, callback) {
  var url = getInstance();
  if(err && options.isNew) {
    url.deleteUrlsById(result, function(err, res) {
      if(err) {
        molecuel.log('mlcl_url', 'Error while deleteing url after save error for ' + res._id + ' message: s'+ err);
      }
      callback();
    });
  } else {
    callback();
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
  return getInstance();
};

module.exports = init;
