'use strict';

var http = require('http');
var fs = require('fs');
var parse = require('url').parse;
var join = require('path').join;
var host = require('./host');
var conf = require('./configure');

var root = __dirname;

function setupServer() {
  var server = http.createServer((req, res) => {
    var filePath = join(root, parse(req.url).pathname);
    console.log(`Get request from ${req.connection.remoteAddress} for ${filePath}`);
    var stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });

  server.on('error', (err) => {
    console.log("ruff file server error:", err);
  });

  host.getLanIP((err, lanIP) => {
    server.listen(conf.port, lanIP, () => {
      console.log(`ruff file server is listening on ${lanIP}:${conf.port}...`);
    });
  });
};

module.exports.setupServer = setupServer;

if (require.main === module) {
  setupServer();
}