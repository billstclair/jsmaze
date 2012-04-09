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
var eval = require('../shared/evalFactory').makeEval();
var mazeServer = require('./mazeServer');

var defaultPort = 6293;          // MAZE on the telephone dialpad

initEval();

exports.start = function(port) {
  if (!port) port = defaultPort;
  app.listen(port);
}

exports.stop = function() {
  app.close();
}

io.sockets.on('connection', function (socket) {
  mazeServer.registerSocket(socket);
  socket.on('eval', function (data) {
    eval.eval(socket, data, console.log);
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

function initEval() {
  eval.register('getMaze', mazeServer.getmaze,
                'moveForward', mazeServer.move,
                'moveBack', mazeServer.move,
                'turnLeft', mazeServer.move,
                'turnRight', mazeServer.move);
}

