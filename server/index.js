//////////////////////////////////////////////////////////////////////
//
// index.js
// Top-level of the jsMaze server
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var argv = require('optimist').argv;
var port = argv.p || argv.port || 6293;
var uid = argv.uid || argv.u;
var gid = argv.gid || argv.g;

var network = require('./lib/network');
network.start(port, uid, gid);

// Enable REPL via telnet locahost 5001
var replport = 6292;
require('net').createServer(function (socket) {
  var server = require('repl').start("node via TCP socket> ", socket);
  server.context.network = network;
}).listen(replport);
console.log('Listening for REPL connection on port', replport);
