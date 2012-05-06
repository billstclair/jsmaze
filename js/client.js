//////////////////////////////////////////////////////////////////////
//
// client.js
// Networking client code. Talks to server/lib/network.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var client = new Client();
function Client() {
  var self = this;
  
  init();

  var evaluator;
  var socket;
  var maze;
  var canvas3d;
  var canvas;

  self.evaluator = function() {
    return evaluator;
  }

  self.socket = function() {
    return socket;
  }

  self.maze = function() {
    return maze;
  }

  function init() {
    evaluator = evalFactory.makeEvaluator();
    evaluator.register('setMaze', setMaze,
                       'playerProps', playerProps,
                       'log', socketLog,
                       'addPlayer', addPlayer,
                       'setPlayerPos', setPlayerPos,
                       'removePlayer', removePlayer,
                       'moveto', moveto,
                       'turn', turn,
                       'chat', receiveChat);
  }

  function log(x) {
    console.log(x);
  }

  var playerName = null;
  self.chatPromptFun = null;
  self.scoreUpdateFun = null;
  self.audioSpecs = null;

  self.connect = connect;
  function connect(serverURL, newCanvas3d, newCanvas, resource, name) {
    canvas3d = newCanvas3d;
    canvas = newCanvas;
    // The resource value here needs to be computed from the requesting URL
    socket = io.connect(serverURL, {'force new connection': true,
                                     Resource: resource});
    socket.on('eval', function(data) {
      evaluator.evaluate(socket.id, socket, data);  //, log);
    });
    playerName = name;
    emitEval('getMaze', {name: name});
  }

  self.disconnect = disconnect;
  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    if (maze) {
      maze.endEdit();
      maze.threeDCanvas(null);
      maze.serverProxy(proxy);
      maze = null;
    }
  }

  self.changeName = function(newName) {
    maze.playerName(newName);
    emitEval('playerProps', {name: newName});
    maze.draw3d();
  }

  var soundEnabled = true;
  self.soundEnabled = function(enabled) {
    if (!(enabled == undefined)) soundEnabled = enabled;
    if (maze) maze.soundEnabled(enabled);
    return soundEnabled;
  }

  function setMaze(socket, args) {
    var map = args.map;
    maze = new jsClientMaze.ClientMaze(map);
    maze.chatPromptFun(self.chatPromptFun);
    maze.scoreUpdateFun(self.scoreUpdateFun);
    maze.soundEnabled(soundEnabled);
    maze.audioSpecs(self.audioSpecs);

    maze.playerName(playerName);
    maze.serverProxy(proxy);
    maze.draw3d(canvas3d);
    maze.topdraw(canvas);
  }
  
  function socketLog(socket, args) {
    console.log('Server message: ' + args.message);
  }

  function moveto(socket, args) {
    maze.moveSound(args.reason);
    maze.topdrawpos(true);
    maze.draw3d(null, args.pos);
    maze.topdrawpos();
  }

  function turn(socket, args) {
    maze.turnSound();
    maze.topdrawpos(true);
    maze.draw3d(null, null, args.dir);
    maze.topdrawpos();
  }

  function emitEval(fun, args) {
    if (!args) args = null;
    var form = [fun, args];
    console.log('Emitting eval: ' + JSON.stringify(form));
    socket.emit('eval', form);
  }

  function moveForward() {
    emitEval('moveForward');
  }

  function moveBack() {
    emitEval('moveBack');
  }

  function turnRight() {
    emitEval('turnRight');
  }

  function turnLeft() {
    emitEval('turnLeft');
  }

  self.shoot = shoot;
  function shoot() {
    if (maze && maze.selfPlayer().warring) {
      emitEval('shoot');
    }
  }

  self.warring = warring;
  function warring(newWarring) {
    if (!(newWarring === undefined)) {
      emitEval('warring', newWarring);
    } else {
      return maze.selfPlayer().warring;
    }
  }

  var proxy = {moveForward: moveForward,
               moveBack: moveBack,
               turnRight: turnRight,
               turnLeft: turnLeft,
               shoot: shoot};
  self.proxy = proxy;

  // Other players

  function addPlayer(socket, args) {
    var props = args.player;
    if (!props) {
      console.log('Server sent addPlayer with no props');
      return;
    }
    maze.addPlayer(props);
  }

  function removePlayer(socket, args) {
    var uid = args.uid;
    var reason = args.reason;
    if (!uid) {
      console.log('Server sent removePlayer with no uid.');
      return;
    }
    maze.removePlayer(uid, reason);
  }

  function setPlayerPos(socket, args) {
    var uid = args.uid;
    var pos = args.pos;
    var dir = args.dir;
    var reason = args.reason;
    if (!(uid && (pos || dir))) {
      console.log('Server sent setPlayerPos with missing parameter.');
      return;
    }
    maze.setPlayerPos(uid, pos, dir, reason);
  }

  function playerProps(socket, args) {
    var props = args.props;
    var isSelf = args.isSelf;
    maze.playerProps(props, isSelf);
  }

  self.chat = function(msg) {
    emitEval('chat', {msg: msg});
  }

  self.chatListener = null;

  // Need to have a hook so index.html can add the message
  // to a scrolling TextArea.
  function receiveChat(socket, args) {
    var name = args.name;
    var msg = args.msg;
    maze.receiveChat(name, msg);
    if (self.chatListener) self.chatListener(name, msg);
  }
}
