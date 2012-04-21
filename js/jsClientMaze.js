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
//   Otherwise, it is an array of strings, as returned by the
//     jsmaze.toMap() method.
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

    var selfPlayer = {};
    self.selfPlayer = function() {
      return selfPlayer;
    }
    self.playerName = function(newName) {
      if (newName) selfPlayer.name = newName;
      return selfPlayer.name;
    }

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

    var builtinImages = {};
    this.builtinImages = builtinImages;
    function initBuiltinImages() {
      var path = 'images/sys/bullet/'
      var bulletImages = {front:[path+'bullet-front-1.gif',
                                 path+'bullet-front-2.gif',
                                 path+'bullet-front-3.gif',
                                 path+'bullet-front-4.gif'],
                          left: path+'bullet-left.gif',
                          back: [path+'bullet-rear-1.gif',
                                 path+'bullet-rear-2.gif',
                                 path+'bullet-rear-3.gif',
                                 path+'bullet-rear-4.gif'],
                          right: path+'bullet-right.gif'};
      builtinImages.bullet = {images: bulletImages,
                              scales: {front: 344/600, back: 344/600}};
      preloadImages({images: bulletImages});
    }
    initBuiltinImages();

    function replaceBuiltinImages(player) {
      var name = player.images;
      if (typeof(name) == 'string')  {
        tab = builtinImages[name];
        if (tab) {
          player.images = tab.images;
          player.scales = tab.scales;
        } else {
          console.log('No builtinImages for:', name);
          delete player.images;
        }
      }
    }

    function newImage(url, setter) {
      if (typeof(url) != 'string') return;
      var newonload = function(image, setter) {
        return function() {
          setter(image);
        };
      };
      var image = new Image();
      image.onload = newonload(image, setter);
      image.src = url;
      return image;
    }

    function preloadImageArray(urls) {
      function newSetter(ii) {
        return function(image) {
          urls[ii] = image;
        };
      }
      for (var i=0; i<urls.length; i++) {
        url = urls[i];
        newImage(url, newSetter(i));
      }
    }

    function preloadImageProp(images, prop, url) {
      var setter = function(image) {
        images[prop] = image;
      };
      newImage(url, setter);
    }

    function preloadImages(player) {
      replaceBuiltinImages(player);
      var images = player.images;
      if (images) {
        for (side in images) {
          var url = images[side];
          // Don't be tempted to inline preloadImageArray or preloadImageProp
          // Need the new vars they provide to close over.
          if ($.isArray(url)) {
            preloadImageArray(url);
          } else {
            preloadImageProp(images, side, url);
          }
        }
      }
    }

    self.addPlayer = function(props) {
      var player = jsmaze.makePlayer(props);
      preloadImages(player);
      maze.addPlayer(player);
      draw3d();
    }

    self.removePlayer = function(uid) {
      var player = maze.getPlayer(uid);
      if (!player) {
        console.log('removePlayer, no player for uid:', uid);
        return;
      }
      maze.removePlayer(player);
      draw3d();
    }

    self.setPlayerPos = function(uid, pos, dir) {
      var player = maze.getPlayer(uid);
      if (!player) {
        console.log('setPlayerPos, no player for uid:', uid);
      }
      if (pos) maze.movePlayer(player, pos);
      if (dir) player.dir = dir;
      draw3d();
    }

    self.playerProps = function(props, isSelf) {
      var player;
      if (isSelf) {
        player = selfPlayer;
      } else {
        if (!props.uid) return;
        player = maze.getPlayer(props.uid);
        if (!player) return self.addPlayer(props);
      }
      for (var p in props) {
        if (isSelf || p!='uid') {
          player[p] = props[p];
        }
      }
      draw3d();
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
      var vert = maze.vert();
      var horiz = maze.horiz();

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
        vert = maze.vert();
        i = round(i);
        j = floor(j);
        if (i<=0 || i>=maze.width || j<0 || j>=maze.height) return;
        
        vert[j][i] = vert[j][i] ? 0 : 1;
      } else {
        // It's a horizontal line
        horiz = maze.horiz();
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

    // If true, show spines even if no walls there.
    // Looks wrong when there is no spine, but in
    // a wide-open maze, you get lots of white space
    // that doesn't really belong there.
    // Eventually, render correctly in a wide-open maze, but
    // that's fairly complicated, on client AND server.
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
      if (!pos) {
        pos = self.pos;
      } else {
        self.pos = pos;
        selfPlayer.pos = pos;
      }
      if (!dir) {
        dir = self.dir;
      } else {
        self.dir = dir;
        selfPlayer.dir = dir;
      }
      
      if (!canvas) return;

      var ctx = canvas.getContext('2d');
      var width = canvas.width-2;
      var height = canvas.height-2;
      var left = 1;
      var top = 1;
      var vert = maze.vert();
      var horiz = maze.horiz();

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

      var playerStack = [];

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
        if (i<0 || i>width || j<0 || j>height) break;
        playerStack.push({i:i,j:j,x:x,y:y,dx:dx,dy:dy,s:s});
        dx = dx * factor;
        dy = dy * factor;
      }

      ctx.strokeStyle='black';
      ctx.stroke();

      var pnh = 18;
      if (self.playerName()) {
        drawPlayerName(ctx, self.playerName(), pnh, left, top+1.5*pnh, width);
      }
      if (lastChatMsg) {
        drawPlayerName(ctx, lastChatMsg, pnh,
                       left+width*0.05, top+height-1.5*pnh, 0.9*width);
      }
      if (chatMsg) {
        drawPlayerName(ctx, chatMsg, pnh,
                       left+width*0.05, top+height-0.25*pnh, 0.9*width);
      }

      drawPlayers(ctx, playerStack, left, top, width, height);
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

    // When I add images for players, need to draw all players,
    // from back to front, so transparent regions let players behind
    // show through.
    function drawPlayers(ctx, playerStack, left, top, width, height) {
      for (var idx=playerStack.length-1; idx>=0; idx--) {
        var p = playerStack[idx];
        if (!p) continue;
        var i = p.i;
        var j = p.j;
        var players = maze.getPlayerMap({i:i, j:j});
        if (!players) continue;
        var s = p.s;
        var x = p.x;
        var y = p.y;
        var dx = p.dx;
        var dy = p.dy;
        x += dx/2;
        y += dy/2;
        // Should loop through these, drawing the name of only the last one
        var player = players[players.length-1];
        drawPlayer(ctx, player, s, x, y, dx/2, dy/2, left, top, width, height);
      }
    }

    function drawPlayer(ctx, player, s, x, y, dx, dy, left, top, width, height) {
      var name = player.name;
      y += dy;
      left += x;
      top += y;
      width -= 2*x;
      height -= (2*y-dy);
      var factor = 0.3;
      dx = (factor * width)/2;
      left += dx;
      width -= 2*dx;
      dy = (factor * height)/2;
      top += dy;
      height -= dy;

      var dir = self.dir;
      var pdir = player.dir;
      var side = (dir.i==0) ?
        ((pdir.i==0) ?
         ((dir.j==pdir.j) ? 'back' : 'front') :
         ((dir.j==pdir.i) ? 'left' : 'right')) :
        ((pdir.i==0) ?
         ((dir.i==pdir.j) ? 'right' : 'left') :
         ((dir.i==pdir.i) ? 'back' : 'front'));

      if (player.images) {
        drawImagePlayer(ctx, player, s, side, left, top, width, height);
      } else {
        drawDefaultPlayer(ctx, player, side, left, top, width, height);
      }

      if (player.name) {
        drawPlayerName(ctx, player, dy, left, top, width);
      }
    }

    function drawDefaultPlayer(ctx, player, side, left, top, width, height) {
      var bodyleft = left;
      var bodywidth = width;
      var lrdelta = 0.2*width;
      if (side=='left' || side=='right') {
        bodywidth -= lrdelta;
        if (side=='left') bodyleft += lrdelta;
      }

      // clear space
      ctx.fillStyle = 'white';
      ctx.fillRect(bodyleft, top, bodywidth, height);

      // Start drawing lines
      ctx.beginPath();

      var w = ctx.lineWidth;
      ctx.lineWidth = 2;
      ctx.strokeStyle='blue';

      // Draw main rectangle
      ctx.moveTo(bodyleft, top);
      ctx.lineTo(bodyleft+bodywidth, top);
      ctx.lineTo(bodyleft+bodywidth, top+height);
      ctx.lineTo(bodyleft, top+height);
      ctx.lineTo(bodyleft, top);

      // Fill in features
      var nosetop = 0.25*height;
      var nosebot = 0.6*height;
      var earmid = 0.4*height;
      var earleft = 0.35*bodywidth;
      if (side == 'front') {
        var eyemid = 0.3*width;
        var eyewid = 0.2*width;
        var eyeleft = eyemid - eyewid/2;
        var eyetop = 0.2*height;
        var eyebot = 0.33*height;
        ctx.moveTo(left+eyeleft, top+eyebot);
        ctx.lineTo(left+eyemid, top+eyetop);
        ctx.lineTo(left+eyeleft+eyewid, top+eyebot);
        ctx.moveTo(left+width-eyeleft, top+eyebot);
        ctx.lineTo(left+width-eyemid, top+eyetop);
        ctx.lineTo(left+width-eyeleft-eyewid, top+eyebot);
        var nosetop = 0.4*height;
        var nosebot = 0.55*height;
        var noseleft = 0.4*width;
        ctx.moveTo(left+width/2, top+nosetop);
        ctx.lineTo(left+noseleft, top+nosebot);
        var mouthbot = 0.8*height;
        var mouthtop = 0.7*height;
        var mouthleft = eyeleft;
        var mouthmid = eyemid;
        ctx.moveTo(left+mouthleft, top+mouthtop);
        ctx.lineTo(left+mouthmid, top+mouthbot);
        ctx.lineTo(left+width-mouthmid, top+mouthbot);
        ctx.lineTo(left+width-mouthleft, top+mouthtop);
      } else if (side == 'left') {
        ctx.moveTo(bodyleft, top+nosetop);
        ctx.lineTo(left, top+nosebot);
        ctx.lineTo(bodyleft, top+nosebot);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bodyleft+bodywidth/2, top+nosetop);
        ctx.lineTo(bodyleft+bodywidth-earleft, top+nosetop);
        ctx.lineTo(bodyleft+bodywidth-earleft, top+earmid);
        ctx.lineTo(bodyleft+bodywidth/2, top+nosebot);
      } else if (side == 'right') {
        ctx.moveTo(left+bodywidth, top+nosetop);
        ctx.lineTo(left+width, top+nosebot);
        ctx.lineTo(left+bodywidth, top+nosebot);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bodyleft+bodywidth/2, top+nosetop);
        ctx.lineTo(bodyleft+earleft, top+nosetop);
        ctx.lineTo(bodyleft+earleft, top+earmid);
        ctx.lineTo(bodyleft+bodywidth/2, top+nosebot);
      }

      ctx.stroke();
      ctx.lineWidth = w;
    }

    var loadCount = 0;

    function drawImagePlayer(ctx, player, s, side, left, top, width, height) {
      var image = player.images[side];
      if (!image) {
        return drawDefaultPlayer(ctx, player, side, left, top, width, height);
      }
      var scales = player.scales;
      var scale = null;
      if (scales) scale = scales[side];
      if (scale) {
        var w = scale*width;
        left += (width-w)/2;
        width = w;
        var h = scale*height;
        top += (height-h)/2;
        height = h;
      }
      var setter = function(i) { player.images[side] = i; }
      if ($.isArray(image)) {
        // Distance-sensitive images
        var arr = image;
        var idx = s % image.length;
        setter = function(i) { arr[idx] = i; }
        image = arr[idx];
      }
      var ldcnt = ++loadCount;
      if (typeof(image) == 'string') {
        var i = new Image();
        i.onload = function() {
          setter(i);
          if (ldcnt==loadCount && player.maze) {
            drawImage(ctx, i, player, left, top, width, height);
          }
        }
        i.src = image;
      } else {
        drawImage(ctx, image, player, left, top, width, height);
      }
    }

    function drawImage(ctx, image, player, left, top, width, height) {
      var w = image.width;
      var h = image.height;
      if (width/w <= height/h) {
        var h = h * width/w;
        top += (height - h) / 2;
        height = h;
      } else {
        w = w * height/h;
        top += (width - w) / 2;
        width = w;
      }
      ctx.drawImage(image, left, top, width, height);
    }

    // Not used
    function drawTrivialPlayer(ctx, player, side, left, top, width, height) {
      ctx.fillStyle = 'lightblue';
      ctx.fillRect(left, top, width, height);
    }

    function drawPlayerName(ctx, playerOrName, dy, left, top, width) {
      var name = playerOrName;
      if (typeof(name) != 'string') name = playerOrName.name;
      ctx.fillStyle = 'purple';
      ctx.font = Math.floor(dy) + 'px Arial';
      var textWidth = ctx.measureText(name).width;
      if (textWidth > width) textWidth = width;
      ctx.fillText(name, left + width/2 - textWidth/2, top - dy/4, textWidth);
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

    var touchTimeout = null;

    function do3dTouch(event, canvas) {
      if (event.type == 'touchend') {
        if (touchTimeout) {
          touchTimeout(true);
          touchTimeout = null;
        }
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
      var timeOut = 120;
      var initialTimeout = 250;
      if (action==turnLeft || action==turnRight) {
        timeOut = 500;
        initialTimeout = null;
      }
      
      if (action) {
        if (touchTimeout) touchTimeout(true);
        event.preventDefault();
        var tof = function(clear) {
          if (clear) action = null;
          else if (action) {
            action();
            window.setTimeout(tof, initialTimeout || timeOut);
            initialTimeout = null;
          }
        };
        touchTimeout = tof;
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
      else if (key==67) chatPrompt();                      // C
      else if (key==32) shoot();                           // spacebar
      else nodefault = false;
      if (nodefault) event.preventDefault();
    }

    function move(i, j) {
      if (i>=0 && i<maze.width && j>=0 && j<maze.height) {
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

    var chatPromptFun = null;
    self.chatPromptFun = function(fun) {
      if (fun) chatPromptFun = fun;
      return chatPromptFun;
    }

    function chatPrompt() {
      if (chatPromptFun) chatPromptFun(self);
    }

    var lastChatMsg = null;
    var chatMsg = null;
    self.receiveChat = function(name, msg) {
      lastChatMsg = chatMsg;
      chatMsg = name + ': ' + msg;
      draw3d();
    }

    function shoot() {
      if (_proxy) return _proxy.shoot();
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
