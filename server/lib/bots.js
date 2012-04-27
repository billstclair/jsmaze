//////////////////////////////////////////////////////////////////////
//
// bots.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var jsmaze = require('../shared/jsmaze.js');

exports.makeBullet = makeBullet;
function makeBullet(player) {
  var name = null;
  var pos = {i:player.pos.i, j:player.pos.j};
  var dir = {i:player.dir.i, j:player.dir.j};
  var script = function(server, bullet) {
    bulletScript(server, bullet, player);
  };
  var maze = player.maze;
  return jsmaze.makePlayer({name:name, pos:pos, dir:dir, images:'bullet',
                            script:script, maze:maze, isBullet:true,
                            warring:true});
}

function bulletScript(server, bullet, player) {
  if (!player.maze) {
    // Our player disappeared. We go with him.
    return server.removePlayerFromTables(bullet);
  }
  var maze = bullet.maze;
  var pos = bullet.pos;
  var dir = bullet.dir;
  if (maze.canMoveForward(pos, dir)) {
    var newpos = {i:pos.i+dir.i, j:pos.j+dir.j};
    server.doMove(bullet, newpos);
    var list = maze.getPlayerMap(newpos);
    if (list) {
      for (var i=0; i<list.length; i++) {
        var victim = list[i];
        if (victim != bullet && victim.warring) {
          server.killPlayer(victim, player, bullet);
          return;
        }
      }
    }
  } else {
    server.removePlayerFromTables(bullet, 'hitWall');
  }
}