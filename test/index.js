/**
 * Created by dob on 14.04.14.
 */
var assert = require('assert'),
  url = require('../'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  should = require('should'),
  mlcl_database = require('mlcl_database'),
  mlcl_elements = require('mlcl_elements'),
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

    molecuel.config.elements = {
      schemaDir: __dirname + '/definitions'
    };

    molecuel.config.url = {
      pattern: {
        default: '{{t title}}',
        file: '{{t file}}/{{f filename}}',
        news: 'news/{{t title}}'
      }
    };

    molecuel.config.log = {
      ttl: '4w',
      overwriteConsole: false
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
    var fakeelements;
    var elements;
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

    it('should construct elements module', function(done) {
      molecuel.once('mlcl::elements::init:pre', function(module) {
        module.should.be.a.object;
        done();
      });
      elements = new mlcl_elements(molecuel);
    });

    it('should finalize elements registrations', function(done) {
      molecuel.once('mlcl::elements::init:post', function(module) {
        module.should.be.a.object;
        done();
      });
      molecuel.emit('mlcl::database::connection:success', dbcon);
      molecuel.emit('mlcl::search::connection:success', searchcon);
    });

    it('should have registered url model', function(done) {
      assert('function' === typeof elements.modelRegistry['url']);
      done();
    });

    it('should have the findByUrl function available', function(done) {
      elements.findByUrl('testUrl', 'en', function(err) {
        should.not.exist(err);
        done();
      });
    });

    var testobject;
    it('should generate url for a object', function(done) {
      var testmodel = elements.getElementType('page');
      testobject = new testmodel({
        title: 'testname',
        lang: 'en',
        keyword: 'test'
      });
      testobject.save(function(err) {
        should.not.exist(err);
        testobject.url.should.be.a.string;
        done();
      });
    });

    it('should save the url in the url mongo collection', function(done) {
      elements.findByUrl(testobject.url, testobject.lang, function(err, result) {
        should.not.exists(err);
        result.should.be.a.object;
      });
      done();
    });

    var testobject2;
    it('should generate url for a second object whicht should be differnt', function(done) {
      var testmodel = elements.getElementType('page');
      testobject2 = new testmodel({
        title: 'testname',
        lang: 'en',
        keyword: 'test'
      });

      testobject2.save(function(err) {
        should.not.exist(err);
        testobject2.url.should.be.a.string;
        assert(testobject2.url !== testobject.url);
        done();
      });
    });

    it('should save the url in the url mongo collection', function(done) {
      elements.findByUrl(testobject2.url, testobject2.lang, function(err, result) {
        should.not.exists(err);
        result.should.be.a.object;
      });
      done();
    });

    var testobject3;
    it('should fail to save', function(done) {
      var testmodel = elements.getElementType('page');
      testobject3 = new testmodel({
        title: 'test2name',
        lang: 'en'
      });

      testobject3.save(function(err) {
        should.exist(err);
        done();
      });
    });

    it('should have removed the url from the mongo collection', function(done) {
      elements.findByUrl(testobject3.url, testobject3.lang, function(err, result) {
        should.not.exists(err);
        should.not.exists(result);
      });
      done();
    });

    after(function(done) {
      elements.database.database.connection.db.dropDatabase(function(error) {
        should.not.exists(error);
        elements.elastic.deleteIndex('*', function(error) {
          should.not.exists(error);
          done();
        });
      });
    });
  });
});
