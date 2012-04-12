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

  var _evaluator;
  var _socket;
  var _maze;
  var _canvas3d;
  var _canvas;

  self.evaluator = function() {
    return _evaluator;
  }

  self.socket = function() {
    return _socket;
  }

  self.maze = function() {
    return _maze;
  }

  function init() {
    _evaluator = evalFactory.makeEvaluator();
    _evaluator.register('setMaze', setMaze,
                       'log', socketLog,
                       'moveto', moveto,
                       'turn', turn);
  }

  function log(x) {
    console.log(x);
  }

  self.connect = connect;
  function connect(serverURL, canvas3d, canvas, resource) {
    _canvas3d = canvas3d;
    _canvas = canvas;
    // The resource value here needs to be computed from the requesting URL
    _socket = io.connect(serverURL, {'force new connection': true,
                                     resource: resource});
    _socket.on('eval', function(data) {
      _evaluator.evaluate(_socket, data, log);
    });
    emitEval('getMaze');
  }

  self.disconnect = disconnect;
  function disconnect() {
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
    if (_maze) {
      _maze.endEdit();
      _maze.threeDCanvas(null);
      _maze.serverProxy(_proxy);
      _maze = null;
    }
  }

  function setMaze(socket, args) {
    var map = args.map;
    _maze = new jsClientMaze.ClientMaze(map);
    _maze.serverProxy(_proxy);
    _maze.draw3d(_canvas3d);
    _maze.topdraw(_canvas);
  }
  
  function socketLog(socket, args) {
    console.log('Server message: ' + args.message);
  }

  function moveto(socket, args) {
    _maze.topdrawpos(true);
    _maze.pos = args.pos;
    _maze.draw3d();
    _maze.topdrawpos();
  }

  function turn(socket, args) {
    _maze.topdrawpos(true);
    _maze.dir = args.dir;
    _maze.draw3d();
    _maze.topdrawpos();
  }

  function emitEval(fun, args) {
    if (!args) args = null;
    var form = [fun, args];
    console.log('Emitting eval: ' + JSON.stringify(form));
    _socket.emit('eval', form);
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

  var _proxy = {moveForward: moveForward,
                moveBack: moveBack,
                turnRight: turnRight,
                turnLeft: turnLeft};
  self.proxy = _proxy;
}
