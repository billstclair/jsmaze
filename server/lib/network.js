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

var defaultPort = 6293;          // MAZE on the telephone dialpad

initEvaluator();

exports.start = function(port) {
  if (!port) port = defaultPort;
  app.listen(port);
}

exports.stop = function() {
  app.close();
}

io.sockets.on('connection', function (socket) {
  socket.on('eval', function (data) {
    evaluator.evaluate(socket, data, console.log);
  });
  socket.on('disconnect', function() {
    mazeServer.removeSocket(socket);
  });
});

function handler (req, res) {
  fs.readFile(__dirname + '/../index.html',
              function (err, data) {
                res.writeHead(200);
                if (err) {
                  return res.end('This is a jsMaze server.' +
                                 'Talk to it with a jsMaze client.');
                }
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

