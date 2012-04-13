//////////////////////////////////////////////////////////////////////
//
// network.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app);
var fs = require('fs');
var evaluator = require('../shared/evalFactory').makeEvaluator();
var mazeServer = require('./mazeServer');
var url = require('url');

exports.mazeServer = mazeServer;
exports.evaluator = evaluator;
exports.io = io;

var defaultPort = 6293;          // MAZE on the telephone dialpad

mazeServer.initEvaluator(evaluator);

exports.start = function(port, uid, gid) {
  if (!port) port = defaultPort;
  console.log('Listening for connections on port: ', port);
  app.listen(port);
  if (gid != undefined) {
    console.log('Setting gid to', gid);
    process.setgid(gid);
  }
  if (uid != undefined) {
    console.log('Setting uid to', uid);
    process.setuid(uid);
  }
}

exports.stop = function() {
  app.close();
}

// Handler for Express
// From https://github.com/spadin/simple-express-static-server

app.configure(function() {
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  var filepath = __dirname.split('/');
  filepath = filepath.splice(0, filepath.length-2).join('/');
  app.use(express.static(filepath));
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
  app.use(app.router);
});

function getSocketEmitter(socket) {
  if (socket.jsMazeEmitter) return socket.jsMazeEmitter;
  var emitter = function(fun, args) {
    if (!args) args = null;
    socket.emit('eval', [fun, args]);
  }
  socket.jsMazeEmitter = emitter;
  return emitter;
}

io.sockets.on('connection', function (socket) {
  var emitter = getSocketEmitter(socket)
  socket.on('eval', function (data) {
    evaluator.evaluate(socket.id, emitter, data, console.log);
  });
  socket.on('disconnect', function() {
    mazeServer.removePlayer(emitter);
  });
});
