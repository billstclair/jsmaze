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
  var players = {};

  self.maze = function() {
    return maze;
  }

  self.players = function() {
    return players;
  }

  self.initEvaluator = function(evaluator) {
    evaluator.register('getMaze', getmaze,
                       'moveForward', move,
                       'moveBack', move,
                       'turnLeft', move,
                       'turnRight', move);
  }

  self.getmaze = getmaze;
  function getmaze(emitter, args) {
    var name = (args && args.name) || 'Random';
    players[emitter] = jsmaze.makePlayer({name: name,
                                          maze: maze});
    emitter('setMaze',{map: map});
  }

  self.removeEmitter = removeEmitter;
  function removeEmitter(emitter) {
    players[emitter] = null;
  }

  self.move = move;
  function move(emitter, args, fun) {
    var player = players[emitter];
    if (!player) return emitter('log',{message: 'No player for connection.'});
    var pos = player.pos;
    var dir = player.dir;
    switch(fun) {
    case 'moveForward':
      if (maze.canMoveForward(pos, dir)) {
        var oldpos = {i:pos.i,j:pos.j};
        pos.i += dir.i;
        pos.j += dir.j
        maze.movePlayer(player, emitter, pos, oldpos);
      }
      break;
    case 'moveBack':
      if (maze.canMoveBackward(pos, dir)) {
        var oldpos = {i:pos.i,j:pos.j};
        pos.i -= dir.i;
        pos.j -= dir.j
        maze.movePlayer(player, emitter, pos, oldpos);
      }
      break;
    case 'turnRight':
      var olddir = {i:dir.i, j:dir.j};
      var di = dir.i;
      dir.i = -dir.j;
      dir.j = di;
      maze.turnPlayer(player, emitter, dir, olddir);
      break;
    case 'turnLeft':
      var olddir = {i:dir.i, j:dir.j};
      var di = dir.i;
      dir.i = dir.j;
      dir.j = -di;
      maze.turnPlayer(player, emitter, dir, olddir);
      break;
    }
  }
}