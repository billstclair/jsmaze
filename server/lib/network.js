//////////////////////////////////////////////////////////////////////
//
// network.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);
var fs = require('fs');
var evaluator = require('../shared/evalFactory').makeEvaluator();
var mazeServer = require('./mazeServer');
var url = require('url');

var defaultPort = 6293;          // MAZE on the telephone dialpad

initEvaluator();

exports.start = function(port) {
  if (!port) port = defaultPort;
  app.listen(port);
}

exports.stop = function() {
  app.close();
}

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
    evaluator.evaluate(emitter, data, console.log);
  });
  socket.on('disconnect', function() {
    mazeServer.removeEmitter(emitter);
  });
});

function handler (req, res) {
  var urlpath = url.parse(req.url).pathname;
  if (urlpath.slice(-1) == '/') urlpath += 'index.html';
  var filepath = __dirname + '/../..' + urlpath;
  console.log('Getting ' + filepath + ' for URL: ' + urlpath);
  fs.readFile(filepath,
              function (err, data) {
                if (err) {
                  res.writeHead(500);
                  return res.end('Page not found');
                }
                res.writeHead(200);
                res.end(data);
              });
}

function initEvaluator() {
  evaluator.register('getMaze', mazeServer.getmaze,
                     'moveForward', mazeServer.move,
                     'moveBack', mazeServer.move,
                     'turnLeft', mazeServer.move,
                     'turnRight', mazeServer.move);
}

