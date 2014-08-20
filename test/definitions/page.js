/**
 * Created by Dominic Böttger on 11.05.2014
 * INSPIRATIONlabs GmbH
 * http://www.inspirationlabs.com
 */
var elements;

var definition = function() {
  this.schemaName = 'page';
  this.options = {
    indexable: true
  };
  this.schema = {
    title: {type: String, required: true},
    keyword: {type: String, required: true},
    body: {type: String},
    url: {type: String},
    lang: {type: String},
    file: {type: elements.coreSchema.Types.Mixed, form: {type: 'fileuploader'}}
  };
  return this;
};

var init = function(el) {
  elements = el;
  return new definition();
};

module.exports = init;
