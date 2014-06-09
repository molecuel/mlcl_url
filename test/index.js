/**
 * Created by dob on 14.04.14.
 */
var assert = require('assert'),
  url = require('../'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  should = require('should'),
  mlcl_database = require('mlcl_database'),
  mlcl_elastic = require('mlcl_elastic');

describe('url', function(){
  var mytestobject;
  var mlcl;
  var molecuel;
  var mongo;
  var elastic;
  var simplepattern;
  var advancedpattern;
  var filetestpattern;

  before(function (done) {
    mlcl = function() {
      return this;
    };
    util.inherits(mlcl, EventEmitter);
    molecuel = new mlcl();

    molecuel.config = { };
    molecuel.config.search = {
      hosts: ['http://localhost:9200'],
      prefix: 'mlcl-url-unit'
    };
    molecuel.config.database = {
      type: 'mongodb',
      uri: 'mongodb://localhost/mlcl-url-unit'
    };
    molecuel.config.url = {
      pattern: {
        default: '{{t title}}',
        file: '{{t file}}/{{f filename}}',
        news: 'news/{{t title}}'
      }
    };
    mongo = mlcl_database(molecuel);
    elastic = mlcl_elastic(molecuel);
    simplepattern = '{{t title}}';
    advancedpattern = 'content/{{t _id}}/{{t title}}';
    filetestpattern = 'file/{{f title}}';
    mytestobject = {
      _id: 'f8f8asdf9afsdsafa9',
      title: 'Test?! ""- Die süße Hündin läuft in die Höhle des Bären und aß ein.стейк'
    };
    done();
  });

  describe('url', function () {
    it('should be a function', function () {
      assert('function' === typeof url);
    });
  });

  describe('urlgenerate', function(){
    var u;

    before(function(){
      u = new url(molecuel);
    });

    it('should be a object', function () {
      assert('object' === typeof u);
    });

    it('should create a valid url from simple pattern', function(done) {
      u.generateUrlFromPattern(simplepattern, mytestobject, function(err, result) {
        result.should.be.an.String;
        // check for whitespaces
        result.should.not.match('/^s*$/');
        // check for string length
        assert(result.length > 2);
        assert(result === 'test-die-suesse-huendin-laeuft-in-die-hoehle-des-baeren-und-ass-ein-stejk');
        done();
      });
    });

    it('should create a valid url from advanced pattern', function(done) {
      u.generateUrlFromPattern(advancedpattern, mytestobject, function(err, result) {
        result.should.be.an.String;
        // check for whitespaces
        result.should.not.match('/^s*$/');
        // check for string length
        assert(result.length > 2);
        assert(result === 'content/f8f8asdf9afsdsafa9/test-die-suesse-huendin-laeuft-in-die-hoehle-des-baeren-und-ass-ein-stejk');
        done();
      });
    });

    it('should create a valid url from test file pattern', function(done) {
      u.generateUrlFromPattern(filetestpattern, mytestobject, function(err, result) {
        result.should.be.an.String;
        // check for whitespaces
        result.should.not.match('/^s*$/');
        // check for string length
        assert(result.length > 2);
        assert(result === 'file/test-die-suesse-huendin-laeuft-in-die-hoehle-des-baeren-und-ass-ein.stejk');
        done();
      });
    });
  });

  describe('molecuel url generate', function() {
    var searchcon;
    var dbcon;
    var testmodel;
    var fakeelements;
    var u;

    before(function(){
      u = new url(molecuel);
      var myElements = function() {
        return this;
      };
      util.inherits(myElements, EventEmitter);
      fakeelements = new myElements();
    });

    it('should initialize db connection', function(done) {
      molecuel.once('mlcl::database::connection:success', function(database) {
        dbcon = database;
        database.should.be.a.object;
        done();
      });
      molecuel.emit('mlcl::core::init:post', molecuel);
    });

    it('should initialize search connection', function(done) {
      molecuel.once('mlcl::search::connection:success', function(search) {
        searchcon = search;
        search.should.be.a.object;
        done();
      });
      molecuel.emit('mlcl::core::init:post', molecuel);
    });

    it('should initialize schema plugin', function(done) {
      var Schema = dbcon.database.Schema;
      var testSchema = new Schema({
        title: {type: String}
      });

      var registryElement= {
        schema: testSchema,
        config: {indexable: true}
      };

      molecuel.emit('mlcl::elements::registerSchema:post', fakeelements, 'test', registryElement);
      testmodel = dbcon.registerModel('test', testSchema, {indexable:true});
      testmodel.schema.paths.url.should.be.a.Object;
      done();
    });
    it('should generate a new url', function(done) {
      var testobject = new testmodel({title: 'testname'});
      testobject.save(function(err) {
        should.not.exist(err);
      });
      molecuel.on('mlcl::url::changedurl', function() {
        done();
      });
    });

    after(function(done) {
      searchcon.deleteIndex('*', function() {
        done();
      });
    });
  });
});