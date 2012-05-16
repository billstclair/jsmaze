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
var bots = require('./bots.js');
var accounts = require('./accounts.js');

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
                       'turnRight', move,
                       'playerProps', playerProps,
                       'chat', chat,
                       'shoot', shoot,
                       'warring', warring,
                       'login', login,
                       'register', register,
                       'logout', logout);
  }

  function getmaze(emitter, args, socketid) {
    emitter('setMaze',{map: map});
    var name = (args && args.name) || 'Random';
    var player = jsmaze.makePlayer({name: name,
                                    maze: maze});
    players[socketid] = player;
    player.emitter = emitter;
    doMove(player, player.pos);
    emitter('playerProps', {isSelf: true, props: player.clientProps()});
  }

  function knownPlayers(player) {
    return player.knownPlayers;
  }

  function addKnownPlayer(player, knownPlayer) {
    if (!player.warring != !knownPlayer.warring) return;
    if (!player.knownPlayers) player.knownPlayers = {};
    player.knownPlayers[knownPlayer.uid] = knownPlayer;
    if (player.emitter) {
      player.emitter('addPlayer', {player: knownPlayer.clientProps()});
    }
  }

  function isKnownPlayer(player, knownPlayer) {
    return player.knownPlayers && player.knownPlayers[knownPlayer.uid];
  }

  function removeKnownPlayer(player, knownPlayer, reason) {
    var knownPlayers = player.knownPlayers;
    if (knownPlayers) {
      var uid = knownPlayer.uid;
      if (knownPlayers[uid]) {
        delete player.knownPlayers[uid];
        if (player.emitter) {
          player.emitter('removePlayer', {uid: uid, reason: reason});
        }
      }
    }
  }

  function clearKnownPlayers(player) {
    var known = player.knownPlayers;
    if (known) {
      delete player.knownPlayers;
      for (var uid in known) {
        removeKnownPlayer(known[uid], player);
      }
    }
  }

  self.forEachKnower = forEachKnower;
  function forEachKnower(player, fun) {
    var uid = player.uid;
    for (var socketid in players) {
      var p = players[socketid];
      if (p!=player && p.knownPlayers && p.knownPlayers[uid]) {
        fun(p);
      }
    }
  }

  self.removePlayer = removePlayer;
  function removePlayer(socketid) {
    player = players[socketid];
    if (player) {
      delete players[socketid];
      delete player.emitter;
      removePlayerFromTables(player);
    }
  }

  self.removePlayerFromTables = removePlayerFromTables;
  function removePlayerFromTables(player, reason) {
    if (botTable[player.uid]) removeBot(player);
    removeCanSee(player);
    var mazePlayers = maze.getPlayers();
    for (var uid in mazePlayers) {
      var otherPlayer = mazePlayers[uid];
      if (otherPlayer != player) {
        removeKnownPlayer(otherPlayer, player, reason);
      }
    }
    maze.removePlayer(player);
    clearKnownPlayers(player)
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

  function addCanSee(player, noPos) {
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
              } else if (!noPos) {
                var args = {uid:vis.uid, pos:vis.pos, dir:vis.dir};
                player.emitter('setPlayerPos', args);
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

  function sendRefreshNotifications(player, notifyTab, reason) {
    var uid= player.uid;
    for (var key in notifyTab) {
      var otherPlayer = notifyTab[key];
      if (isKnownPlayer(otherPlayer, player)) {
        var args = {uid:uid, pos:player.pos, dir:player.dir, reason: reason};
        if (otherPlayer.emitter) {
          otherPlayer.emitter('setPlayerPos', args);
        }
      } else {
        addKnownPlayer(otherPlayer, player);
      }      
    }
  }

  self.doMove = doMove;
  function doMove(player, pos, reason) {
    removeCanSee(player);
    var notifyTab = whoCanSee(player.pos);
    maze.movePlayer(player, pos);
    addCanSee(player, true);
    notifyTab = whoCanSee(player.pos, notifyTab);
    if (player.emitter) player.emitter('moveto', {pos: pos, reason: reason});
    forEachKnower(player, function(otherPlayer) {
      notifyTab[otherPlayer.uid] = otherPlayer;
    });
    sendRefreshNotifications(player, notifyTab, reason);
  }

  function doTurn(player, dir) {
    removeCanSee(player);
    player.dir = dir;
    addCanSee(player);
    notifyTab = whoCanSee(player.pos);
    if (player.emitter) player.emitter('turn', {dir: dir});
    sendRefreshNotifications(player, notifyTab);
  }

  function getPlayerOrWarn(socketid, emitter) {
    var player = players[socketid];
    if (!player) emitter('log', {message: 'No player for connection.'});
    return player;
  }

  function move(emitter, args, socketid, fun) {
    var player = getPlayerOrWarn(socketid, emitter);
    if (!player) return;
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

  function playerProps(emitter, args, socketid, fun) {
    var player = getPlayerOrWarn(socketid, emitter);
    if (!player) return;
    // Eventually we may allow change of other props
    var name = args.name;
    if (name) {
      player.name = name;
      updatePlayerProps(player, {uid:player.uid, name: name});
    }
  }

  function updatePlayerProps(player, props, selftoo) {
    if (selftoo && player.emitter) {
      player.emitter('playerProps', {isSelf: true, props: props});
    }
    forEachKnower(player, function(otherPlayer) {
      if (otherPlayer.emitter) {
        otherPlayer.emitter('playerProps', {props:props});
      }
    });
  }

  function forEachCouldSee(player, fun, heretoo) {
    return maze.forEachCouldSee(player, fun, heretoo);
  }

  function chat(emitter, args, socketid, fun) {
    var player = getPlayerOrWarn(socketid, emitter);
    if (!player) return;
    var msg = args.msg;
    if (!msg) return;
    var name = player.name;
    args = {name:name, msg:msg};
    var hearers = {};
    var ifWarring = false;
    var addEmitter = function(otherPlayer) {
      if (otherPlayer.emitter && (!ifWarring || otherPlayer.warring)) {
        hearers[otherPlayer.uid] = otherPlayer.emitter;
      }
    };
    forEachCouldSee(player, addEmitter, true);
    if (player.warring) {
      ifWarring = true;
      forEachKnower(player, addEmitter);
    }
    for (uid in hearers) {
      hearers[uid]('chat', args);
    }
  }

  var botTable = {};
  var botCount = 0;

  function addBot(bot) {
    doMove(bot, bot.pos);
    botTable[bot.uid] = bot;
    if (botCount++ == 0) startBots();
  }

  function removeBot(bot) {
    var uid = bot.uid;
    if (botTable[uid]) {
      delete botTable[uid];
      if (--botCount <= 0) stopBots();
    }
  }

  var botTimeoutID = null;
  var botPeriod = 100;

  function startBots() {
    if (!botTimeoutID) {
      botTimeoutID = setTimeout(botUpdate, botPeriod);
    }
  }

  function botUpdate() {
    // Will eventually need some time limits here
    for (var uid in botTable) {
      var bot = botTable[uid];
      var script = bot.script;
      if (script) {
        script(self, bot);
      }
    }
    // Maybe startBots should use setInterval(), but this is
    // much less likely to saturate the server with bot updates.
    botTimeoutID = setTimeout(botUpdate, botPeriod);
  }

  function stopBots() {
    if (botTimeoutID) {
      clearTimeout(botTimeoutID);
      botTimeoutID = null;
    }
  }

  function warring(emitter, args, socketid, fun) {
    var player = getPlayerOrWarn(socketid, emitter);
    if (!player) return;
    var warring = args;
    if (!warring == !player.warring) return;
    player.warring = warring;
    if (player.emitter) {
      player.emitter('playerProps', {isSelf: true, props:{warring:warring}});
    }
    var props = {uid:player.uid, warring:warring};
    var args = {props:props};
    var updater = forEachUpdater('playerProps', args);
    forEachKnower(player, updater);
    addCanSee(player, true);
    var key = posstr(player.pos);
    var tab = canSeeTab[key];
    if (tab) {
      for (var i=0; i<tab.length; i++) {
        var seer = tab[i];
        var emitter = seer.emitter;
        if (!seer.warring==!player.warring) {
          addKnownPlayer(seer, player);
        }
      }
    }
  }

  function shoot(emitter, args, socketid, fun) {
    var player = getPlayerOrWarn(socketid, emitter);
    if (!player) return;
    if (!player.warring) return;
    var bullet = bots.makeBullet(player);
    addBot(bullet);
    console.log('Made bullet for player:', player.name);
  }

  self.killPlayer = killPlayer;
  function killPlayer(player, killer, bullet) {
    var maze = player.maze;
    if (maze) {
      var width = maze.width;
      var height = maze.height;
      var i = Math.floor(width*Math.random());
      var j = Math.floor(height*Math.random());
      if (i == width) i--;
      if (j == height) j--;
      doMove(player, {i:i, j:j}, 'killed');
      updateScores(player, killer);
      if (bullet) {
        removePlayerFromTables(bullet);
      }
    }
  }

  function forEachUpdater(fun, args) {
    return function(p) {
      if (p.emitter) {
        p.emitter(fun, args);
      }
    }
  }

  function updateScores(player, killer) {
    var score = player.score;
    if (score) {
      score.deaths++;
    } else {
      score = {kills:0, deaths:1};
      player.score = score;
    }
    if (player.emitter) {
      player.emitter('playerProps', {isSelf: true, props:{score:score}});
    }
    var props = {uid: player.uid, score: score};
    var args = {props: props};
    updater = forEachUpdater('playerProps', args);
    forEachKnower(player, updater);

    score = killer.score;
    if (score) {
      score.kills++;
    } else {
      score = {kills: 1, deaths: 0};
      killer.score = score;
    }
    if (killer.emitter) {
      killer.emitter('playerProps', {isSelf: true, props:{score:score}});
    }
    props = {uid: killer.uid, score: score};
    args.props = props;
    forEachKnower(killer, updater);
  }

  function register(emitter, args, socketid, fun) {
    var res = accounts.register(args);
    emitter('register', res);
  }

  function login(emitter, args, socketid, fun) {
    var player = players.socketid;
    var errmsg = null;

    if (!player) errmsg = 'No player for socket';
    else if (player.userid) errmsg = 'Already logged in';
    if (errmsg) return emitter('login', {errmsg: errmsg});

    var res = accounts.login(args);
    if (res.errmsg) return emitter('login', res);

    var dbplayer = res.dbplayer;
    player.userid = dbplayer.userid;
    var name = dbplayer.name;
    var images = dbplayer.images;
    var scales = dbplayer.scales;
    var props = {name: name};
    if (images) props.images = images;
    if (scales) props.scales = scales;
    updatePlayerProps(player, props, true);
  }

  function logout(emitter, args, socketid, fun) {
    var player = players[socketid];
    var errmsg = null;
    if (!player) errmsg = 'No player for socket';
    else if (!player.userid) errmsg = 'Not logged in';
    if (errmsg) return emitter('popupmsg', errmsg);
    accounts.logout(player.uid);
  }

}
