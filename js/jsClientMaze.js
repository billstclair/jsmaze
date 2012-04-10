//////////////////////////////////////////////////////////////////////
//
// jsClientMaze.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

// Our one global variable.
// Global functions are properties of jsClientMaze.
// Requires that server/shared/jsmaze.js is also loaded
var jsClientMaze = {};

// Global properties/functions:
//
// jsClientMaze.ClientMaze(map)
//   Instantiate with "new jsClientMaze.ClientMaze(mapOrMaze)"
//   The mapOrMaze arg is optional, but you'll have to populate
//   the maze() property with an instance of jsmaze.Maze if you omit it.
//   If mapOrMaze is a jsmaze.Maze instance, just use it.
//   Otherwise, it is an array of strings, as returned by the toMap() method.
//   The even strings describe the horizontal walls.
//   The odd strings describe the vertical walls.
//   Anything other than a space represents a wall.
//   The odd (vertical) strings are one character longer than the even strings.
//   The array is of an odd length, putting horizontal walls
//   first and last.
// jsClientMaze.eventPos(event)
//    Return the position of a click or tap event as {x:posx, y:posy}
//    You can subtract $(canvas).offset() .left & .top from that to get
//    the position relative to canvas. See clickListener() below.
// jsClientMaze.UP
// jsClientMaze.DOWN
// jsClientMaze.RIGHT
// jsClientMaze.LEFT
//    Values for direction as {i:<di>, j:<dj>}, one of i & j is 0, and
//    the other is 1 or -1.
//    Down means down the screen on the top view.
//
// jsClientMaze.ClientMaze properties/methods:
//
//  maze(newMaze)
//    If newMaze is included, set the current maze to newMaze.
//    Return the current maze.
//  clone()
//    Return a copy of this ClientMaze instance, including a copy
//    of its maze property, but not including any position, direction,
//    or canvas bindings.
//  pos
//  dir
//    Current position and direction of 3D view "eye".
//  topViewCanvas(canvas)
//    If canvas is included, set the current canvas for drawtop().
//    If new canvas is non-null, draw the top view on canvas
//    Return the current canvas.
//  threeDCanvas(canvas)
//    If canvas is included, set the current canvas for draw3d().
//    If new canvas is non-null, draw the 3D view on canvas
//    Return the current canvas.
//  topdraw(canvas)
//    Draw the top view on canvas or, if canvas is not included, on topViewCanvas()
//    If canvas is included, set the top view canvas to it.
//  topdrawpos(erase)
//    Draw the current position on the topViewCanvas(), as a blue triangle.
//    Initialize the current position to {i:0,j:0} and the current direction to
//    {i:0,j:1}, if they are not already set.
//  lastEvent
//    For debugging. The last event passed to jsClientMaze.eventPos()
//  edit(canvas)
//    Start editing the top view on canvas, after drawing it there.
//    If canvas is not specified, use the current topViewCanvas()
//  endEdit
//    Stop editing on the canvas currently being edited upon.
//  toMap
//    Return a map for calling new jsClientMaze.ClientMaze() or
//    new jsmaze.Maze()
//    A jsmaze map is an array of strings.
//  draw3d(canvas, pos, dir)
//    Draw the 3d maze view on the canvas with the "eye" at pos looking in
//    direction dir.
//    Use the current values of topViewCanvas(), pos, and dir, if the
//    parameters are omitted.
//    Set the current values if they are included.
//  keyevent
//    The last key event processed by the threeDCanvas()
//  moveForward()
//  moveBack()
//  turnRight()
//  turnLeft()
//    Move or turn the "eye" for the threeDView()
//

(function() {
  // Values for draw3d() direction arg
  jsClientMaze.UP = {i:0, j:-1};
  jsClientMaze.DOWN = {i:0, j:1};
  jsClientMaze.RIGHT = {i:1, j:0};
  jsClientMaze.LEFT = {i:-1, j:0};

  var round = Math.round;
  var abs = Math.abs;
  var floor = Math.floor;

  var alertp = false;
  function maybeAlert(msg) {
    if (alertp) alert(msg);
  }

  jsClientMaze.ClientMaze = ClientMaze;
  function ClientMaze(mapOrMaze) {
    var self = this;

    var maze;
    if (mapOrMaze && mapOrMaze!=undefined) {
      if (mapOrMaze instanceof jsmaze.Maze) maze = mapOrMaze;
      else maze = new jsmaze.Maze(mapOrMaze);
    }

    self.maze = accessMaze;
    function accessMaze(newMaze) {
      if (!(newMaze === undefined)) maze = newMaze;
      return maze;
    }

    self.clone = clone;
    function clone() {
      return new ClientMaze(maze.clone());
    }

    function initPos() {
      if (!self.pos) self.pos = {i:0,j:0};
      if (!self.dir) self.dir = {i:0,j:1};
    }

    self.topViewCanvas = topViewCanvas;
    pTopViewCanvas = null;
    function topViewCanvas(canvas) {
      if (canvas === undefined) {
        return pTopViewCanvas;
      }
      pTopViewCanvas = canvas;
      if (canvas) topdraw();
      return canvas;
    }

    self.threeDCanvas = threeDCanvas;
    pThreeDCanvas = null;
    function threeDCanvas(canvas) {
      if (canvas === undefined) {
        return pThreeDCanvas;
      }
      pThreeDCanvas = canvas;
      if (canvas) {
        initPos();
        addKeyListener(canvas);
        draw3d();
      } else {
        removeKeyListener();
      }
      return canvas;
    }

    self.topdraw = topdraw;
    function topdraw(canvas) {
      if (canvas === undefined) canvas = topViewCanvas();
      else topViewCanvas(canvas)
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var width = canvas.width-2;
      var height = canvas.height-2;
      var left = 1;
      var top = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var vert = maze.vert;
      var horiz = maze.horiz;

      ctx.beginPath();

      // Draw horizontal lines
      for (var j=0; j<=maze.height; j++) {
        var y = round(j*height/maze.height);
        var pendown = false
        var row = horiz[j];
        var lastx = 0;
        for (var i=0; i<maze.width; i++) {
          var x = round((i+1)*width/maze.width);
          if (row[i]) {
            if (!pendown) {
              ctx.moveTo(left+lastx, top+y);
              pendown = true;
            }
          } else {
            if (pendown) {
              ctx.lineTo(left+lastx, top+y);
              pendown = false;
            }
          }
          lastx = x;
        }
        if (pendown) ctx.lineTo(left+x, top+y);
      }

      // Draw vertical lines
      for (i=0; i<=maze.width; i++) {
        var x = round(i*width/maze.width);
        var pendown = false
        var lasty = 0;
        for (var j=0; j<maze.height; j++) {
          var y = round((j+1)*height/maze.height);
          if (vert[j][i]) {
            if (!pendown) {
              ctx.moveTo(left+x, top+lasty);
              pendown = true;
            }
          } else {
            if (pendown) {
              ctx.lineTo(left+x, top+lasty);
              pendown = false;
            }
          }
          lasty = y;
        }
        if (pendown) ctx.lineTo(left+x, top+y);
      }

      ctx.strokeStyle='black';
      ctx.stroke();
      topdrawpos();
    };

    self.topdrawpos = topdrawpos;
    function topdrawpos(erase) {
      if (erase === undefined) erase = false;
      var canvas = topViewCanvas();
      if (!canvas) return;
      initPos();
      var pos = self.pos;
      var dir = self.dir;
      var width = canvas.width-2;
      var height = canvas.height-2;
      var left = 1;
      var top = 1;
      var deltax = width/maze.width;
      var deltay = height/maze.height;
      var x = left + (pos.i * deltax) + 4;
      var y = top + (pos.j * deltay) + 4;
      deltax -= 8;
      deltay -= 8;
      ctx = canvas.getContext('2d');
      if (erase) {
        ctx.clearRect(x-2, y-2, deltax+4, deltay+4);
      } else {
        ctx.beginPath();
        if (dir.i) {
          if (dir.i > 0) {
            ctx.moveTo(x, y);
            ctx.lineTo(x+deltax, y+deltay/2);
            ctx.lineTo(x, y+deltay);
            ctx.lineTo(x, y);
          } else {
            ctx.moveTo(x, y+deltay/2);
            ctx.lineTo(x+deltax, y);
            ctx.lineTo(x+deltax, y+deltay);
            ctx.lineTo(x, y+deltay/2);
          }
        } else {
          if (dir.j > 0) {
            ctx.moveTo(x, y);
            ctx.lineTo(x+deltax, y);
            ctx.lineTo(x+deltax/2, y+deltay);
            ctx.lineTo(x, y);
          } else {
            ctx.moveTo(x+deltax/2, y);
            ctx.lineTo(x+deltax, y+deltay);
            ctx.lineTo(x, y+deltay);
            ctx.lineTo(x+deltax/2, y);
          }
        }
        ctx.strokeStyle='blue';
        ctx.stroke();
      }
    }

    // For debugging
    self.lastEvent = null;

    self.edit = edit;
    function edit(canvas) {
      if (self.editListener) endEdit();
      if (canvas === undefined) canvas = topViewCanvas();
      if (!canvas) return;

      var listener = function(e) {
        clickListener(e, canvas);
      };
      document.addEventListener('mousedown', listener, false); // PC
      canvas.addEventListener('touchstart', listener, false);  // touch screen
      self.editListener = listener;
      self.editCanvas = canvas;
      topViewCanvas(canvas);
    }

    self.endEdit = endEdit;
    function endEdit() {
      var listener = self.editListener;
      if (!listener) return;
      var canvas = self.editCanvas;
      document.removeEventListener('mousedown', listener, false);
      canvas.removeEventListener('touchstart', listener, false);
      self.editListener = null;
      self.editCanvas = null;
    }

    function clickListener(e, canvas) {
      var pos = eventPos(e);
      if (!pos) return;

      var offset = $(canvas).offset();
      var x = pos.x - offset.left
      var y = pos.y - offset.top;

      var i = (x * maze.width / canvas.width);
      var j = (y * maze.height / canvas.height);
      var diffi = abs(rem0(i, floor(i)) - 0.5);
      var diffj = abs(rem0(j, floor(j)) - 0.5);
      if (diffj < diffi) {
        // It's a vertical line
        vert = maze.vert;
        i = round(i);
        j = floor(j);
        if (i<=0 || i>=maze.width || j<0 || j>=maze.height) return;
        
        vert[j][i] = vert[j][i] ? 0 : 1;
      } else {
        // It's a horizontal line
        horiz = maze.horiz;
        i = floor(i);
        j = round(j);
        if (i<0 || i>=maze.height || j<=0 || j>=maze.height) return;
        horiz[j][i] = horiz[j][i] ? 0 : 1;
      }

      topdraw();
      draw3d();
      if (threeDCanvas()) {
        window.setTimeout(function(){threeDCanvas().focus();}, 1);
      }
    }

    self.toMap = toMap;
    function toMap() {
      var map = new Array();
      var horiz = maze.horiz;
      var vert = maze.vert;
      var idx = 0;
      for (var i=0; i<=maze.height; i++) {
        var dov = (i<maze.height);
        var ha = horiz[i];
        var va = dov ? vert[i] : null;
        var hs = '';
        var vs = '';
        for (var j=0; j<=maze.width; j++) {
          var doh = (j<maze.width);
          if (doh) hs += ha[j] ? '-' : ' ';
          if (dov) vs += va[j] ? '|' : ' ';
        }
        map[idx++] = hs;
        if (dov) map[idx++] = vs;
      }
      return map;
    }

    // If true, show spines even if no walls there.
    // Looks wrong when there is no spine, but in
    // a wide-open maze, you get lots of white space
    // that doesn't really belong there.
    self.showSpines = true;

    self.draw3d = draw3d;
    function draw3d(canvas, pos, dir) {
      initPos();
      if (!canvas) {
        canvas = threeDCanvas();
      } else {
        threeDCanvas(canvas);
        return;
      }
      if (pos === undefined) pos = self.pos;
      else self.pos = pos;
      if (dir === undefined) dir = self.dir;
      else self.dir = dir;
      
      if (!canvas) return;

      var ctx = canvas.getContext('2d');
      var width = canvas.width-2;
      var height = canvas.height-2;
      var left = 1;
      var top = 1;
      var vert = maze.vert;
      var horiz = maze.horiz;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left+width, top);
      ctx.lineTo(left+width, top+height);
      ctx.lineTo(left, top+height);
      ctx.lineTo(left, top);

      var maxsteps = 15;
      var factor = 0.8;
      var sizex = width/2;
      var sizey = height/2;

      var sumx = 0;
      var sumy = 0;
      for (var s=1; s<=maxsteps; s++) {
        sizex = sizex * factor;
        sizey = sizey * factor;
        sumx += sizex;
        sumy += sizey;
      }
      sizex = width/2;
      sizey = height/2;
      var cx = sizex/sumx;
      var cy = sizey/sumy;

      var i = pos.i;
      var j = pos.j;
      var di = dir.i;
      var dj = dir.j
      var x = 0;
      var y = 0;

      var dx = sizex * factor * cx;
      var dy = sizey * factor * cy;
      var nextx = x + dx;
      var nexty = y + dy;
      var lastxLeft = null;
      var lastyLeft = null;
      var lastxRight = null;
      var lastyRight = null;
      var lastWallLeft = true;
      var lastWallRight = true;

      // Loop
      for (s=1; s<maxsteps; s++) {
        nextx = x + dx;
        nexty = y + dy;

        maybeAlert('i:'+i+', j:'+j+', x:'+round(x)+', y:'+round(y)+', nextx:'+round(nextx)+', nexty:'+round(nexty));

        if (di ? horiz[di>0 ? j : j+1][i] : vert[j][dj>0 ? i+1 : i]) {
          // Draw left wall
          if (!lastWallLeft) {
            drawNewWallLeft(
              ctx, x, y, lastxLeft, left, top, width, height);
          }
          drawWallLeft(
            ctx, x, y, nextx, nexty, left, top, width, height);
          lastWallLeft = true;
        } else {
          // Draw left door
          if (self.showSpines ||
              lastWallLeft ||
              ((di ?
                vert[di>0 ? j-1 : j+1][di>0 ? i : i+1] :
                horiz[dj>0 ? j : j+1][dj>0 ? i+1 : i-1]))) {
            drawNewWallLeft(
              ctx, x, y, lastWallLeft?null:lastxLeft, left, top, width, height);
            lastxLeft = x;
            lastyLeft = y;
          }
          lastWallLeft = false;
        }
        if (di ? horiz[di>0 ? j+1 : j][i] : vert[j][dj>0 ? i : i+1]) {
          // Draw right wall
          if (!lastWallRight) {
            drawNewWallRight(
              ctx, x, y, lastxRight, left, top, width, height);
          } 
          drawWallRight(
            ctx, x, y, nextx, nexty, left, top, width, height);
          lastWallRight = true;
        } else {
          // Draw right door
          if (self.showSpines ||
              lastWallRight ||
              ((di ?
                vert[di>0 ? j+1 : j-1][di>0 ? i : i+1] :
                horiz[dj>0 ? j : j+1][dj>0 ? i-1 : i+1]))) {
            drawNewWallRight(
              ctx, x, y, lastWallRight?null:lastxRight, left, top, width, height);
            lastxRight = x;
            lastyRight = y;
          }
          lastWallRight = false;
        }

        x = nextx;
        y = nexty;
        if (di ? vert[j][di>0 ? i+1 : i] : horiz[dj>0 ? j+1 : j][i]) {
          // At end wall
          drawEndFloorCeiling(
            ctx, x, y, left, top, width, height);
          if (lastWallLeft) {
            drawEndFromWallLeft(
              ctx, x, y, left, top, width, height);
          } else {
            drawEndFromDoorLeft(
              ctx, x, y, lastxLeft, left, top, width, height);
          }
          if (lastWallRight) {
            drawEndFromWallRight(
              ctx, x, y, left, top, width, height);
          } else {
            drawEndFromDoorRight(
              ctx, x, y, lastxRight, left, top, width, height);
          }
          break;
        }
        i += di;
        j += dj;
        dx = dx * factor;
        dy = dy * factor;
        if (i<0 || i>width || j<0 || j>height) break;
      }

      ctx.strokeStyle='black';
      ctx.stroke();
    }

    function drawWallRight(ctx, x, y, nextx, nexty, left, top, width, height) {
      x = round(x);
      y = round(y);
      nextx = round(nextx);
      nexty = round(nexty);
      maybeAlert(JSON.stringify(['drawWallRight',x,y,nextx,nexty]));
      ctx.moveTo(left+width-x, top+y);
      ctx.lineTo(left+width-nextx, top+nexty);
      ctx.moveTo(left+width-x, top+height-y);
      ctx.lineTo(left+width-nextx, top+height-nexty);
    }

    function drawWallLeft(ctx, x, y, nextx, nexty, left, top, width, height) {
      x = round(x);
      y = round(y);
      nextx = round(nextx);
      nexty = round(nexty);
      maybeAlert(JSON.stringify(['drawWallLeft',x,y,nextx,nexty]));
      ctx.moveTo(left+x, top+y);
      ctx.lineTo(left+nextx, top+nexty);
      ctx.moveTo(left+x, top+height-y);
      ctx.lineTo(left+nextx, top+height-nexty);
    }

    function drawNewWallLeft(ctx, x, y, lastxLeft, left, top, width, height) {
      x = round(x);
      y = round(y);
      if (lastxLeft != null) lastxLeft = round(lastxLeft);
      maybeAlert(JSON.stringify(['drawNewWallLeft',x,y,lastxLeft]));
      if (lastxLeft != null) {
        ctx.moveTo(left+lastxLeft, top+y);
        ctx.lineTo(left+x, top+y);
      } else {
        ctx.moveTo(left+x, top+y);
      }
      ctx.lineTo(left+x, top+height-y);
      if (lastxLeft != null) {
        ctx.lineTo(left+lastxLeft, top+height-y);
      }
    }

    function drawNewWallRight(ctx, x, y, lastxRight, left, top, width, height) {
      x = round(x);
      y = round(y);
      if (lastxRight != null) lastxRight = round(lastxRight);
      maybeAlert(JSON.stringify(['drawNewWallRight',x,y,lastxRight]));
      if (lastxRight != null) {
        ctx.moveTo(left+width-lastxRight, top+y);
        ctx.lineTo(left+width-x, top+y);
      } else {
        ctx.moveTo(left+width-x, top+y);
      }
      ctx.lineTo(left+width-x, top+height-y);
      if (lastxRight != null) {
        ctx.lineTo(left+width-lastxRight, top+height-y);
      }
    }

    function drawEndFloorCeiling(ctx, x, y, left, top, width, height) {
      x = round(x);
      y = round(y);
      maybeAlert(JSON.stringify(['drawEndFloorCeiling',x,y]));
      ctx.moveTo(left+x, top+y);
      ctx.lineTo(left+width-x, top+y);
      ctx.moveTo(left+width-x, top+height-y);
      ctx.lineTo(left+x, top+height-y);
    }

    function drawEndFromWallLeft(ctx, x, y, left, top, width, height) {
      x = round(x);
      y = round(y);
      maybeAlert(JSON.stringify(['drawEndFromWallLeft',x,y]));
      ctx.moveTo(left+x, top+y);
      ctx.lineTo(left+x, top+height-y);
    }

    function drawEndFromWallRight(ctx, x, y, left, top, width, height) {
      x = round(x);
      y = round(y);
      maybeAlert(JSON.stringify(['drawEndFromWallRight',x,y]));
      ctx.moveTo(left+width-x, top+y);
      ctx.lineTo(left+width-x, top+height-y);
    }

    function drawEndFromDoorLeft(ctx, x, y, lastxLeft, left, top, width, height) {
      x = round(x);
      y = round(y);
      lastxLeft = round(lastxLeft);
      maybeAlert(JSON.stringify(['drawEndFromDoorLeft',x,y,lastxLeft]));
      ctx.moveTo(left+x, top+y);
      ctx.lineTo(left+lastxLeft, top+y);
      ctx.moveTo(left+x, top+height-y);
      ctx.lineTo(left+lastxLeft, top+height-y);
    }

    function drawEndFromDoorRight(ctx, x, y, lastxRight, left, top, width, height) {
      x = round(x);
      y = round(y);
      lastxRight = round(lastxRight);
      maybeAlert(JSON.stringify(['drawEndFromDoorRight',x,y,lastxRight]));
      ctx.moveTo(left+width-x, top+y);
      ctx.lineTo(left+width-lastxRight, top+y);
      ctx.moveTo(left+width-x, top+height-y);
      ctx.lineTo(left+width-lastxRight, top+height-y);
    }

    function addKeyListener(canvas) {
      removeKeyListener();
      var listener = function(event) {
        doKeyListener(event);
      }
      self.keyListener = listener;
      self.keyListenerCanvas = canvas;
      canvas.addEventListener('keydown', listener, false);
      listener = function(event) {
        do3dTouch(event, canvas);
      }
      self.keyTouchListener = listener;
      canvas.addEventListener('touchstart', listener, false);
      canvas.addEventListener('touchend', listener, false);
    }

    function removeKeyListener() {
      var listener = self.keyListener;
      if (listener) {
        var canvas = self.keyListenerCanvas;
        self.keyListener = null;
        self.keyListenerCanvas = null;
        canvas.removeEventListener('keydown', listener, false);
        listener = self.keyTouchListener;
        self.keyTouchListener = null;
        canvas.removeEventListener('touchstart', listener, false);
        canvas.removeEventListener('touchend', listener, false);
      }
    }

    function do3dTouch(event, canvas) {
      if (event.type == 'touchend') {
        self.touchingAction = false;
        return;
      }
      var pos = eventPos(event);
      if (!pos) return;

      var offset = $(canvas).offset();
      var x = pos.x - offset.left
      var y = pos.y - offset.top;
      w4 = canvas.width / 3;
      h4 = canvas.height / 3;
      var action = null;
      if (y < h4) action = moveForward;
      else if (y > canvas.height-h4) action = moveBack;
      else if (x <= w4) action = turnLeft;
      else if (x >= canvas.width-w4) action = turnRight;
      var timeOut = 100;
      if (action==turnLeft || action==turnRight) timeOut = 250;
      if (action) {
        event.preventDefault();
        self.touchingAction = action;
        var tof = function() {
          if (self.touchingAction) {
            self.touchingAction();
            window.setTimeout(tof, timeOut);
          }
        };
        tof();
      }
    }

    // For debugging
    self.keyevent = null;

    function doKeyListener(event) {
      self.keyevent = event;
      var key = event.key;
      if (key == undefined) key = event.keyCode;
      var nodefault = true;
      // http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
      if (key==87 || key==73 || key==38) moveForward(); // WI^
      else if (key==83 || key==75 || key==40) moveBack(); // SKv
      else if (key==65 || key==74 || key==37) turnLeft(); // AJ<
      else if (key==68 || key==76 || key==39) turnRight(); // DL>
      else nodefault = false;
      if (nodefault) event.preventDefault();
    }

    function move(i, j) {
      if (i>=0 && i<maze.width && j>=0 && j<maze.height) {
        topdrawpos(true);
        self.pos.i = i;
        self.pos.j = j;
        draw3d();
        topdraw();
        topdrawpos();
      }
    }

    var _proxy = null;
    self.serverProxy = serverProxy;
    function serverProxy(proxy) {
      if (proxy === undefined) return _proxy;
      _proxy = proxy;
    }

    self.moveForward = moveForward;
    function moveForward() {
      var pos = self.pos;
      var dir = self.dir;
      if (maze.canMoveForward(pos, dir)) {
        if (_proxy) return _proxy.moveForward();
        move(pos.i + dir.i, pos.j + dir.j);
      }
    }

    self.moveBack = moveBack;
    function moveBack() {
      var pos = self.pos;
      var dir = self.dir;
      if (maze.canMoveBackward(pos, dir)) {
        if (_proxy) return _proxy.moveBack();
        move(pos.i - dir.i, pos.j - dir.j);
      }
    }

    self.turnRight = turnRight;
    function turnRight() {
      if (_proxy) return _proxy.turnRight();
      topdrawpos(true);
      di = self.dir.i;
      self.dir.i = -self.dir.j;
      self.dir.j = di;
      draw3d();
      topdrawpos();
    }

    self.turnLeft = turnLeft;
    function turnLeft() {
      if (_proxy) return _proxy.turnLeft();
      topdrawpos(true);
      di = self.dir.i;
      self.dir.i = self.dir.j;
      self.dir.j = -di;
      draw3d();
      topdrawpos();
    }
  }

  // Necessary for browser compatibility
  // http://www.quirksmode.org/js/events_properties.html
  jsClientMaze.eventPos = eventPos;
  function eventPos(event) {
    var posx = 0;
    var posy = 0;
    if (!event) event = window.event;
    self.lastEvent = event;

    var touches = event.targetTouches;
    if (touches) {
      // iphone startTouch event
      if (touches.length != 1) return null;
      posx = touches[0].pageX;
      posy = touches[0].pageY;
    } else if (event.pageX || event.pageY) 	{
      posx = event.pageX;
      posy = event.pageY;
    }
    else if (event.clientX || event.clientY) 	{
      posx = event.clientX + document.body.scrollLeft
	+ document.documentElement.scrollLeft;
      posy = event.clientY + document.body.scrollTop
	+ document.documentElement.scrollTop;
    }
    return {x:posx, y:posy};
  }

  function rem0(x, y) {
    return (y==0) ? x : x%y;
  }
})();                           // execute the function() at the top of the file
