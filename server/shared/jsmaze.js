//////////////////////////////////////////////////////////////////////
//
// jsmaze.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

//
// This file will work in the browser or in node.js.
// In the browser, just put a path to it in a <script> tag:
//     <script src='server/shared/jsmaze.js'></script>
// In node.js:
//    var jsmaze = require('./server/shared/jsmaze.js');
// In browser, sets the jsmaze global variable
//   (and the exports global variable).
//
// Global properties/functions:
//
// jsmaze.Maze(map)
//   Instantiate with "new jsmaze.Maze(map)"
//   The map arg is optional, but if you omit it, you'll have to populate
//   the vert, horiz, width, and height properties yourself.
//   A Maze <map> is an array of strings.
//   The even strings describe the horizontal walls.
//   The odd strings describe the vertical walls.
//   Anything other than a space represents a wall.
//   The odd (vertical) strings are one character longer than the even strings.
//   The array is of an odd length, putting horizontal walls
//   first and last.
// jsmaze.makeMaze(width, height, val)
//   Make a new jsmaze.Maze instance with the given width and height,
//   empty if val is false, or filled if val is true.
//
// jsmaze.Maze properties/methods:
//
// width
// height
//   the width and height of the maze. Positive integers.
// horiz()
// vert()
//   Return the two-dimensional arrays for the horizontal and vertical walls.
//   horiz[j][i] true means that the horizontal wall at location [i,j]
//   is there. Note that the vertical dimension comes first.
//   With an argument, set the corresponding array.
// clone()
//   Return a copy of this jsmaze.Maze instance
//  toMap()
//    Return a map for calling "new jsmaze.Maze(map)"
//    A jsmaze map is an array of strings.
// canMoveForward(pos, dir)
// canMoveBackward(pos, dir)
//   True if an "eye" at location pos pointing in direction dir
//   can move forward/backward without running into a wall.
//   pos = {i:<i>,j:<j>}
//   dir = {i:<diri>,j:<dirj>}
//     One of <diri> & <dirj> is 0. The other is 1 or -1.
//

if (typeof exports === 'undefined') {
  var jsmaze = {};
} else {
  var jsmaze = exports;
}

(function() {
  jsmaze.Maze = Maze;
  function Maze(map) {
    var self = this;
    if (map) init(map);

    var vert;
    self.vert = function(newvert) {
      if (newvert === undefined) return vert;
      vert = newvert;
    }

    var horiz;
    self.horiz = function(newhoriz) {
      if (newhoriz === undefined) return horiz;
      horiz = newhoriz;
    }

    function init (map) {
      if (map.length % 2 != 1) {
        throw('map must be an odd-length array of strings');
      }
      horiz = new Array();
      vert = new Array();
      var w = map[0].length;
      var h = (map.length-1)/2;
      var idx = 0;
      for (var j=0; j<map.length; j+=2) {
        var hs = map[j];
        var vs = map[j+1]
        var dov = ((j+1) != map.length);
        if (typeof(hs)!='string' || (dov && typeof(vs)!='string')) {
          throw 'map must be an array of strings';
        }
        if (hs.length!=w || (dov && vs.length!=(w+1))) {
          throw 'map has inconsistent element length';
        }
        var ha = new Array();
        var va = new Array();
        for (var i=0; i<w; i++) {
          ha[i] = (hs[i]==' ') ? 0 : 1;
          if (dov) va[i] = (vs[i]==' ') ? 0 : 1;
        }
        if (dov) {
          va[w] = (vs[w]==' ') ? 0 : 1;
          vert[idx] = va;
        }
        horiz[idx] = ha;
        idx++;
      }
      self.width = w;
      self.height = h;
    }

    function copy2d(arr) {
      var res = new Array();
      for (var i=0; i<arr.length; i++) {
        row = arr[i];
        var resrow = new Array();
        for (var j=0; j<row.length; j++) {
          resrow[j] = row[j];
        }
        res[i] = resrow;
      }
      return res;
    }

    self.clone = clone;
    function clone() {
      var maze = new Maze();
      maze.width = self.width;
      maze.height = self.height;
      maze.horiz(copy2d(horiz));
      maze.vert(copy2d(vert));
      return maze;
    }

    self.toMap = toMap;
    function toMap() {
      var map = new Array();
      var idx = 0;
      for (var i=0; i<=self.height; i++) {
        var dov = (i<self.height);
        var ha = horiz[i];
        var va = dov ? vert[i] : null;
        var hs = '';
        var vs = '';
        for (var j=0; j<=self.width; j++) {
          var doh = (j<self.width);
          if (doh) hs += ha[j] ? '-' : ' ';
          if (dov) vs += va[j] ? '|' : ' ';
        }
        map[idx++] = hs;
        if (dov) map[idx++] = vs;
      }
      return map;
    }

    self.canMoveForward = canMoveForward;
    function canMoveForward(pos, dir) {
      var i = pos.i;
      var j = pos.j
      return dir.i ?
        !vert[j][(dir.i>0) ? i+1 : i] :
        !horiz[(dir.j>0) ? j+1 : j][i];
    }

    self.canMoveBackward = canMoveBackward;
    function canMoveBackward(pos, dir) {
      return canMoveForward(pos, {i:-dir.i, j:-dir.j});
    }

    var players = {};
    self.getPlayers = function() {
      return players;
    }

    self.forEachPlayer = forEachPlayer;
    function forEachPlayer(fun) {
      for (uid in players) {
        fun(players[uid]);
      }
    }

    self.getPlayer = getPlayer;
    function getPlayer(uid) {
      return players[uid];
    }

    self.addPlayer = addPlayer;
    function addPlayer(player) {
      if (player.maze) player.maze.removePlayer(player);
      player.maze = self;
      players[player.uid] = player;
      movePlayer(player, player.pos);
    }

    self.removePlayer = removePlayer;
    function removePlayer(player) {
      movePlayer(player, null, null);
      player.maze = null;
      delete players[player.uid];
    }

    var playerMap = {};         // ['i,j':[player,...],...}
    self.getPlayerMap = function(pos) {
      if (pos) return playerMap[posstr(pos)];
      return playerMap;
    }

    self.movePlayer = movePlayer;
    function movePlayer(player, topos, frompos) {
      if (!frompos) frompos = player.pos;
      if (frompos) {
        var key = posstr(frompos);
        var list = playerMap[key];
        if (list) {
          for (var i=0; i<list.length; i++) {
            if (list[i] == player) {
              list.splice(i,1);
              if (list.length == 0) delete playerMap[key];
              break;
            }
          }
        }
      }
      if (topos) {
        player.pos = topos;
        var key = posstr(topos);
        var list = playerMap[key];
        if (list) list[list.length] = player;
        else playerMap[key] = [player];
      }
    }

    self.canSee = canSee;
    function canSee(pos2, pos, dir) {
      if (pos2.pos) pos2 = pos2.pos;
      if (pos.pos) {
        if (!dir) dir = pos.dir;
        pos = pos.pos;
      }
      pos2i = pos2.i;
      pos2j = pos2.j;
      diri = dir.i;
      dirj = dir.j;
      while (canMoveForward(pos, dir)) {
        pos = {i:pos.i+diri, j:pos.j+dirj};
        if (pos2i==pos.i && pos2j==pos.j) return true;
      }
      return false;      
    }

    self.forEachCouldSee = forEachCouldSee;
    function forEachCouldSee(player, fun, heretoo) {
      function each(dir) {
        function doit(pos) {
          var vis = maze.getPlayerMap(pos);
          if (vis) {
            for (var i=0; i<vis.length; i++) {
              fun(vis[i]);            
            }
          }
        }
        var pos = {i: player.pos.i, j:player.pos.j};
        if (heretoo) {
          doit(pos);
          heretoo = false;
        }
        while (maze.canMoveForward(pos, dir)) {
          pos.i += dir.i;
          pos.j += dir.j;
          doit(pos);
        }
      }
      each({i:0, j:1});
      each({i:1, j:0});
      each({i:-1, j:0});
      each({i:0, j:-1});
    }



    // Convenient to have this here as well as jsmaze.makePlayer
    self.makePlayer = jsmaze.makePlayer;

  }

  jsmaze.makeMaze = makeMaze;
  function makeMaze(width, height, val) {
    val = val ? 1 : 0;
    if (!height) height = width;
    var maze = new Maze();
    maze.width = width;
    maze.height = height;
    var horiz = new Array();
    var vert = new Array();
    var idx = 0;
    for (var j=0; j<=height; j++) {
      var dov = (j < height);
      var ha = new Array();
      var va = dov ? new Array() : null;
      for (var i=0; i<width; i++) {
        ha[i] = val;
        if (dov) va[i] = val;
      }
      if (dov) va[width] = val;
      horiz[idx] = ha;
      if (dov) vert[idx] = va;
      idx++;
    }
    maze.horiz(horiz);
    maze.vert(vert);
    return maze;
  }

  var DEFAULT_MAP = ["----------",
                     "||        |",
                     "  ------- ",
                     "| |      ||",
                     "   -----  ",
                     "|| |    |||",
                     "    ---   ",
                     "||| |  ||||",
                     "     -    ",
                     "||||| | |||",
                     "    -     ",
                     "||||   | ||",
                     "   ----   ",
                     "|||     | |",
                     "  ------  ",
                     "||       ||",
                     " -------- ",
                     "|         |",
                     "----------"];

  jsmaze.getDefaultMap = getDefaultMap;
  function getDefaultMap() {
    return DEFAULT_MAP;
  }

  jsmaze.makeDefaultMaze = makeDefaultMaze;
  function makeDefaultMaze() {
    return new Maze(DEFAULT_MAP);
  }

  jsmaze.makeUID = makeUID;
  function makeUID() {
    var time = new Date().getTime();
    var rand = (''+Math.random()).slice(2);
    return '' + time + '.' + rand;
  }

  jsmaze.Player = Player;
  function Player(props) {
    var self = this;
    init(props);

    function init(props) {
      if (!props) props = {};
      self.uid = props.uid || makeUID();
      self.name = props.name;
      self.images = props.images; // {front:<url>,back:<url>,left:<url>,right:<url>}
      self.scales = props.scales; // {front:<f>,back:<b>,left:<l>,right:<r>}
      self.pos = props.pos || {i:0,j:0};
      self.dir = props.dir || {i:0,j:1};
      self.ghost = props.ghost; // true if can move through other players
      self.maze = props.maze;
      self.script = props.script; // script(player) updates player
      self.score = props.score;   // {kills:<num>,deaths:<num>}
      self.warring = props.warring; // Warring & non-warring players can't see
                                    // each other.
      self.isBullet = props.isBullet;
      self.isBot = !!self.script;
      if (self.maze) {
        self.maze.addPlayer(self);
      }
    }

    self.clientProps  = function() {
      return {uid: self.uid,
              name: self.name,
              images: self.images,
              scales: self.scales,
              score: self.score,
              pos: self.pos,
              dir: self.dir,
              ghost: self.ghost,
              warring: self.warring,
              isBot: self.isBot,
              isBullet: self.isBullet};
    }
  }

  jsmaze.makePlayer = function(props) {
    return new Player(props);
  }

  jsmaze.posstr = posstr;
  function posstr(pos) {
    return '' + pos.i + ',' + pos.j;
  }

})();                 // execute the function() at the top of the file
