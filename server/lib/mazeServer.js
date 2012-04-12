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
  var emitters = {};

  self.getmaze = getmaze;
  function getmaze(emitter, args) {
    var name = (args && args.name) || 'Random';
    emitters[emitter] = {name: name,
                       pos: {i:0,j:0},
                       dir: {i:0,j:1}};
    emitter('setMaze',{map: map});
  }

  self.removeEmitter = removeEmitter;
  function removeEmitter(emitter) {
    emitters[emitter] = null;
  }

  self.move = move;
  function move(emitter, args, fun) {
    var state = emitters[emitter];
    if (!state) return emitter('log',{message: 'No state for emitter.'});
    var pos = state.pos;
    var dir = state.dir;
    switch(fun) {
    case 'moveForward':
      if (maze.canMoveForward(pos, dir)) {
        pos.i += dir.i;
        pos.j += dir.j;
        emitter('moveto', {pos: pos});
      }
      break;
    case 'moveBack':
      if (maze.canMoveBackward(pos, dir)) {
        pos.i -= dir.i;
        pos.j -= dir.j;
        emitter('moveto', {pos: pos});
      }
      break;
    case 'turnRight':
      var di = dir.i;
      dir.i = -dir.j;
      dir.j = di;
      emitter('turn', {dir: dir});
      break;
    case 'turnLeft':
      var di = dir.i;
      dir.i = dir.j;
      dir.j = -di;
      emitter('turn', {dir: dir});
      break;
    }
  }
}