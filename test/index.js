'use strict';

var cp = require('child_process');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var Promise = require('promise');
var request = require('request');
var color = require('bash-color');
var requestSync = require('../');


var server = cp.spawn('node', [path.normalize(__dirname + '/server.js')], {stdio: 'inherit'});

var requestA = {
  method: 'post',
  url: 'http://localhost:3000/foo/bar?bing=bong',
  qs: { bang: 'tang' },
  headers: { 'header-a': 'value-a', 'header-b': 'value-b' },
  auth: { username: 'my user', password: 'really:secure' },
  body: new Buffer('Hello my name is Forbes'),
  encoding: null
};

var requestB = {
  method: 'post',
  url: 'http://foo:bar:baz@localhost:3000/foo/bar?bing=bong',
  qs: { bang: 'tang' },
  headers: { 'header-a': 'value-a', 'header-b': 'value-b' },
  body: new Buffer('Hello my name is Forbes'),
  encoding: 'base64'
};

function getResponses(req) {
  return new Promise(function (resolve, reject) {
    var responses = {};
    console.log(color.purple('http-sync'));
    requestSync.httpSync = require('http-sync');
    requestSync.native = true;
    responses['http-sync'] = requestSync(req);
    console.log(util.inspect(responses['http-sync'], {colors: true}).replace(/^/gm, '  '));
    setTimeout(function () {
      try {
        console.log(color.purple('http-sync-win'));
        requestSync.httpSync = require('http-sync-win');
        requestSync.native = false;
        responses['http-sync-win'] = requestSync(req);
        console.log(util.inspect(responses['http-sync-win'], {colors: true}).replace(/^/gm, '  '));
        setTimeout(function () {
          try {
            console.log(color.purple('request'));
            request(req, function (err, res, body) {
              if (err) return reject(err);
              responses['request'] = {
                statusCode: res.statusCode,
                headers: res.headers,
                body: body
              };
              console.log(util.inspect(responses['request'], {colors: true}).replace(/^/gm, '  '));
              resolve(responses);
            });
          } catch (ex) {
            reject(ex);
          }
        }, 200);
      } catch (ex) {
        reject(ex);
      }
    }, 200);
  });
}

setTimeout(function () {
  getResponses(requestA).then(function (responses) {
    assert(responses['http-sync'].body.toString('hex') === responses['request'].body.toString('hex'),
           'Expected `http-sync` response body to match `request` response body');
    assert(responses['http-sync-win'].body.toString('hex') === responses['request'].body.toString('hex'),
           'Expected `http-sync-win` response body to match `request` response body');
    return getResponses(requestB);
  }).then(function (responses) {
    assert(responses['http-sync'].body.toString('hex') === responses['request'].body.toString('hex'),
           'Expected `http-sync` response body to match `request` response body');
    assert(responses['http-sync-win'].body.toString('hex') === responses['request'].body.toString('hex'),
           'Expected `http-sync-win` response body to match `request` response body');
  }).done(function () {
    server.kill();
  }, function (err) {
    server.kill();
    setTimeout(function () {
      throw err;
    }, 500);
  });
}, 500);