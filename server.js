'use strict';

var http = require('http');
var fs = require('fs');
var parse = require('url').parse;
var join = require('path').join;
var child_process = require('child_process');
var host = require('./host');
var conf = require('./configure');

var root = __dirname;

var server = http.createServer(function (req, res) {
  var filePath = join(root, parse(req.url).pathname);
  var stream = fs.createReadStream(filePath);
  stream.pipe(res);
})

host.getLanIP(function (err, lanIP) {
  server.listen(conf.port, lanIP, function () {
    console.log(`ruff file server is listening on ${lanIP}:${conf.port}...`);
  });
})