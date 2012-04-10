//////////////////////////////////////////////////////////////////////
//
// mazeServer.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var jsmaze = require('../shared/jsmaze.js');

module.exports = new MazeServer();

function MazeServer() {
  var self = this;
  var map = jsmaze.getDefaultMap();
  var maze = new jsmaze.Maze(map);
  var sockets = {};

  self.getmaze = getmaze;
  function getmaze(socket, args) {
    var name = (args && args.name) || 'Random';
    sockets[socket] = {name: name,
                       pos: {i:0,j:0},
                       dir: {i:0,j:1}};
    socket.emit('eval', ['setMaze',{map: map}]);
  }

  self.removeSocket = removeSocket;
  function removeSocket(socket) {
    sockets[socket] = null;
  }

  self.move = move;
  function move(socket, args, fun) {
    var state = sockets[socket];
    var pos = state.pos;
    var dir = state.dir;
    if (!state) socket.emit('eval',['log',{message: 'No state for socket.'}]);
    var form = null;
    switch(fun) {
    case 'moveForward':
      if (maze.canMoveForward(pos, dir)) {
        pos.i += dir.i;
        pos.j += dir.j;
        form = ['moveto',{pos: pos}];
      }
      break;
    case 'moveBack':
      if (maze.canMoveBackward(pos, dir)) {
        pos.i -= dir.i;
        pos.j -= dir.j;
        form = ['moveto',{pos: pos}];
      }
      break;
    case 'turnRight':
      var di = dir.i;
      dir.i = -dir.j;
      dir.j = di;
      form = ['turn',{dir: dir}];
      break;
    case 'turnLeft':
      var di = dir.i;
      dir.i = dir.j;
      dir.j = -di;
      form = ['turn',{dir: dir}];
      break;
    }
    if (form) {
      socket.emit('eval', form);
    }
  }
}