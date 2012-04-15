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
                        'log', socketLog,
                        'addPlayer', addPlayer,
                        'setPlayerPos', setPlayerPos,
                        'removePlayer', removePlayer,
                        'moveto', moveto,
                        'turn', turn);
  }

  function log(x) {
    console.log(x);
  }

  self.connect = connect;
  function connect(serverURL, newCanvas3d, newCanvas, resource, name) {
    canvas3d = newCanvas3d;
    canvas = newCanvas;
    // The resource value here needs to be computed from the requesting URL
    socket = io.connect(serverURL, {'force new connection': true,
                                     resource: resource});
    socket.on('eval', function(data) {
      evaluator.evaluate(socket.id, socket, data);  //, log);
    });
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

  function setMaze(socket, args) {
    var map = args.map;
    maze = new jsClientMaze.ClientMaze(map);
    maze.serverProxy(proxy);
    maze.draw3d(canvas3d);
    maze.topdraw(canvas);
  }
  
  function socketLog(socket, args) {
    console.log('Server message: ' + args.message);
  }

  function moveto(socket, args) {
    maze.topdrawpos(true);
    maze.pos = args.pos;
    maze.draw3d();
    maze.topdrawpos();
  }

  function turn(socket, args) {
    maze.topdrawpos(true);
    maze.dir = args.dir;
    maze.draw3d();
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

  var proxy = {moveForward: moveForward,
                moveBack: moveBack,
                turnRight: turnRight,
                turnLeft: turnLeft};
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
    if (!uid) {
      console.log('Server sent removePlayer with no uid.');
      return;
    }
    maze.removePlayer(uid);
  }

  function setPlayerPos(socket, args) {
    var uid = args.uid;
    var pos = args.pos;
    var dir = args.dir;
    if (!(uid && (pos || dir))) {
      console.log('Server sent setPlayerPos with missing parameter.');
      return;
    }
    maze.setPlayerPos(uid, pos, dir);
  }

}
