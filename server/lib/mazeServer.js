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
  var players = {};             // {<socketid>:<player>,...}
  var canSeeTab = {};           // {"i,j":[<player>, ...], ...}

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
    emitter('setMaze',{map: map});
    var name = (args && args.name) || 'Random';
    var player = jsmaze.makePlayer({name: name,
                                    maze: maze});
    players[socketid] = player;
    player.emitter = emitter;
    doMove(player, player.pos);
  }

  function knownPlayers(player) {
    return player.knownPlayers;
  }

  function addKnownPlayer(player, knownPlayer) {
    if (!player.knownPlayers) player.knownPlayers = {};
    player.knownPlayers[knownPlayer.uid] = knownPlayer;
    if (player.emitter) {
      player.emitter('addPlayer', {player: knownPlayer.clientProps()});
    }
  }

  function isKnownPlayer(player, knownPlayer) {
    return player.knownPlayers && player.knownPlayers[knownPlayer.uid];
  }

  function removeKnownPlayer(player, knownPlayer) {
    var knownPlayers = player.knownPlayers;
    if (knownPlayers) {
      var uid = knownPlayer.uid;
      if (knownPlayers[uid]) {
        delete player.knownPlayers[uid];
        player.emitter('removePlayer', {uid: uid});
      }
    }
  }

  function clearKnownPlayers(player) {
    var known = player.knownPlayers;
    delete player.knownPlayers;
    if (known) {
      for (var uid in known) {
        removeKnownPlayer(known[uid], player);
      }
    }
  }

  self.removePlayer = removePlayer;
  function removePlayer(socketid) {
    player = players[socketid];
    if (player) {
      delete players[socketid];
      delete player.emitter;
      removeCanSee(player);
      var mazePlayers = maze.getPlayers();
      for (var uid in mazePlayers) {
        var otherPlayer = mazePlayers[uid];
        if (otherPlayer != player) {
          removeKnownPlayer(otherPlayer, player);
        }
      }
      maze.removePlayer(player);
      clearKnownPlayers(player)
    }
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
      if (player.emitter) {
        var visible = maze.getPlayerMap(pos);
        if (visible) {
          for (var i=0; i<visible.length; i++) {
            var vis = visible[i];
            if (vis != player) {
              if (!isKnownPlayer(player, vis)) {
                addKnownPlayer(player, vis);
              }
            }
          }
        }
      }
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

  function whoCanSee(pos, notifyTab) {
    if (!notifyTab) notifyTab = {};
    var list = canSeeTab[posstr(pos)];
    if (list) {
      for (var i=0; i<list.length; i++) {
        var player = list[i];
        notifyTab[player.uid] = player;
      }
    }
    return notifyTab;
  }

  function sendRefreshNotifications(player, notifyTab, which) {
    var uid= player.uid;
    for (var key in notifyTab) {
      var otherPlayer = notifyTab[key];
      if (isKnownPlayer(otherPlayer, player)) {
        var args = {uid:uid, pos:player.pos, dir:player.dir};
        otherPlayer.emitter('setPlayerPos', args);
      } else {
        addKnownPlayer(otherPlayer, player);
      }      
    }
  }

  function doMove(player, pos) {
    removeCanSee(player);
    var notifyTab = whoCanSee(player.pos);
    maze.movePlayer(player, pos);
    addCanSee(player);
    notifyTab = whoCanSee(player.pos, notifyTab);
    if (player.emitter) player.emitter('moveto', {pos: pos});
    sendRefreshNotifications(player, notifyTab);
  }

  function doTurn(player, dir) {
    removeCanSee(player);
    player.dir = dir;
    addCanSee(player);
    notifyTab = whoCanSee(player.pos);
    if (player.emitter) player.emitter('turn', {dir: dir});
    sendRefreshNotifications(player, notifyTab);
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
        doMove(player, {i:pos.i+dir.i, j:pos.j+dir.j});
      }
      break;
    case 'moveBack':
      if (maze.canMoveBackward(pos, dir)) {
        doMove(player, {i:pos.i-dir.i, j:pos.j-dir.j});
      }
      break;
    case 'turnRight':
      doTurn(player, {i:-dir.j, j:dir.i});
      break;
    case 'turnLeft':
      doTurn(player, {i:dir.j, j:-dir.i});
      break;
    }
  }
}
