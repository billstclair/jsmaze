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
  var canSeeTab = {};           // map "i,j" to {<player>:<player>, ...}

  self.maze = function() {
    return maze;
  }

  self.players = function() {
    return players;
  }

  self.canSeeTab = function() {
    return canSeeTab;
  }

  self.initEvaluator = function(evaluator) {
    evaluator.register('getMaze', getmaze,
                       'moveForward', move,
                       'moveBack', move,
                       'turnLeft', move,
                       'turnRight', move);
  }

  self.getmaze = getmaze;
  function getmaze(emitter, args, socketid) {
    var name = (args && args.name) || 'Random';
    var player = jsmaze.makePlayer({name: name,
                                    maze: maze});
    players[socketid] = player;
    addCanSee(player);
    emitter('setMaze',{map: map});
  }

  self.removePlayer = removePlayer;
  function removePlayer(socketid) {
    players[socketid] = null;
  }

  var posstr = jsmaze.posstr;

  function forEachCanSee(player, f) {
    var pos = {i:player.pos.i, j:player.pos.j};
    var dir = player.dir;
    while (maze.canMoveForward(pos, dir)) {
      pos.i += dir.i;
      pos.j += dir.j;
      var key = posstr(pos);
      var tab = canSeeTab[key];
      f(pos, tab, key);
    }
  }

  function addCanSee(player) {
    forEachCanSee(player, function(pos, tab, key) {
      if (!tab) canSeeTab[key] = tab = [];
      if (tab.indexOf(player)<0) tab.push(player);
    });
  }

  function removeCanSee(player) {
    forEachCanSee(player, function(pos, tab, key) {
      if (tab) {
        var i = tab.indexOf(player);
        if (i >= 0) {
          tab.splice(i,1);
          if (tab.length == 0) delete canSeeTab[key];
        }
      }
    });
  }

  function doMove(player, emitter, pos) {
    removeCanSee(player);
    maze.movePlayer(player, pos);
    addCanSee(player);
    if (emitter) emitter('moveto', {pos: pos});
  }

  function doTurn(player, emitter, dir) {
    removeCanSee(player);
    player.dir = dir;
    addCanSee(player);
    if (emitter) emitter('turn', {dir: dir});
  }

  self.move = move;
  function move(emitter, args, socketid, fun) {
    var player = players[socketid];
    if (!player) return emitter('log',{message: 'No player for connection.'});
    var pos = player.pos;
    var dir = player.dir;
    switch(fun) {
    case 'moveForward':
      if (maze.canMoveForward(pos, dir)) {
        doMove(player, emitter, {i:pos.i+dir.i, j:pos.j+dir.j});
      }
      break;
    case 'moveBack':
      if (maze.canMoveBackward(pos, dir)) {
        doMove(player, emitter, {i:pos.i-dir.i, j:pos.j-dir.j});
      }
      break;
    case 'turnRight':
      doTurn(player, emitter, {i:-dir.j, j:dir.i});
      break;
    case 'turnLeft':
      doTurn(player, emitter, {i:dir.j, j:-dir.i});
      break;
    }
  }
}