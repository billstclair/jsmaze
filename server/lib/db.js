//////////////////////////////////////////////////////////////////////
//
// db.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var mongoose = require('mongoose');
var fs = require('fs');
var crypto = require('crypto');

module.exports = new DB();
function DB() {
  var self = this;

  // Models
  var Account;
  var Player;
  var Maze;
  var Image;
  var Counters;

  init();

  function addJSONVirtual(model, vfield, field) {
    model.virtual(vfield)
      .get(function() {
        var val = this[field];
        return (val===undefined) ? undefined : JSON.parse(val);
      })
      .set(function(val) {
        this.set(field, JSON.stringify(val));
      });
  }

  function init() {
    self.mongoose = mongoose;
    mongoose.connect('mongodb://localhost/jsmaze');
    
    var Schema = mongoose.Schema;
    var noId = {noId: true};
    var number0 = {type: Number, default: 0};

    Account = new Schema({
      userid: {type: String, unique: true},
      pwhash: {type: String},
      email: {type: String}
    }, noId);
    Account = mongoose.model('Account', Account);

    // An account can have multiple players
    Player = new Schema({
      name: {type: String, unique: true},
      userid: {type: String, index: true},
      _appearance: String,      // {left:l, right:r, front:f, back:b}
      maze: String,             // name of last maze
      _pos: String,             // {i:<i>,j:<j>}
      _dir: String,             // {i:<i>,j:<j>}
      size: number0
    }, noId);
    addJSONVirtual(Player, 'appearance', '_appearance');
    addJSONVirtual(Player, 'pos', '_pos');
    addJSONVirtual(Player, 'dir', '_dir');
    Player.pre('save', preSavePlayer);
    Player.pre('remove', preRemovePlayer);
    Player = mongoose.model('Player', Player);

    Maze = new Schema({
      name: {type: String, unique: true},  // unique name (good idea?)
      userid: {type: String, index: true}, // user who owns this maze
      _map: String,                        // arg to new jsmaze.Maze()
      _walls: String,                      // {'i,j':<idx>, ...}
      size: number0
    }, noId);
    addJSONVirtual(Maze, 'map', '_map');
    addJSONVirtual(Maze, 'walls', '_walls');
    Maze.pre('save', preSaveMaze);
    Maze.pre('remove', preRemoveMaze);
    Maze = mongoose.model('Maze', Maze);

    Image = new Schema({
      idx: {type: Number, unique: true},
      userid: {type: String, index: true},
      url: String,
      urlSize: number0,
      size: number0
    }, noId);
    Image.pre('save', preSaveImage);
    Image.pre('remove', preRemoveImage);
    Image = mongoose.model('Image', Image);

    Stats = new Schema({
      userid: {type: String, unique: true},
      playerCount: number0,
      playerSize: number0,
      mazeCount: number0,
      mazeSize: number0,
      imageCount: number0,
      imageSize: number0
    });
    Stats.virtual('totalSize').
      get(function() {
        return this.playerSize + this.mazeSize + this.imageSize;
      });
    Stats = mongoose.model('Stats', Stats);    

    Counters = new Schema({
      imageIdx: number0
    });
    // http://stackoverflow.com/questions/7334390/has-mongoose-support-findandmodify-mongodb-method
    Counters.statics.findAndModify = function(query, sort, doc, options, cb) {
      return this.collection.findAndModify(query, sort, doc, options, cb);
    }
    Counters = mongoose.model('Counters', Counters);
    initCounters();
  }

  function initCounters() {
    Counters.findOne({}, function(err, res) {
      if (!res) {
        var counters = new Counters();
        counters.save(function(err, res) {
          if (err) console.log('Error making Counters instance: ' + err);
          else console.log('Created counters instance.')
        });
      }
    });
  }

  function incrementCounter(counter, _return) {
    var inc = {};
    inc[counter] = 1;
    Counters.findAndModify(
      {}, [], {$inc: inc}, {new:true}, cb(_return, function(res) {
        _return(null, res[counter]);
      }));
  }

  self.incrementImageIdx = incrementImageIdx;
  function incrementImageIdx(_return) {
    incrementCounter('imageIdx', _return);
  }

  self.print = function(error, result) {
    console.log(error ? 'error: ' + error : result);
  }

  function ensureCallback(cb) {
    return (typeof(cb) == 'function') ? cb : self.print;
  }

  self.sha256 = sha256;
  function sha256(string) {
    var hash = crypto.createHash('sha256');
    hash.update(string);
    return hash.digest('hex');
  }

  function pwhash(login, password) {
    return sha256(login + password);
  }

  //
  // Account functions
  //

  self.makeAccount = function(login, password, email, _return) {
    _return = ensureCallback(_return);
    var hash = pwhash(login, password);
    var acct = new Account({login: login, pwhash: hash, email: email});
    acct.save(function(err, res) {
      if (err) _return('An account already exists for: ' + login);
      else _return(null, res);
    });
  }

  function eachModel(model, each) {
    if (!(typeof(each) == 'function')) each = console.log;
    var stream = model.find().stream();
    stream.on('data', function(doc) {
      each(doc);
    });
    stream.on('close', function() {
      each(null);
    });
  }

  function countModel(model, _return) {
    _return = ensureCallback(_return);
    model.count(_return);
  }

  self.eachAccount = function(each) {
    eachModel(Account, each);
  }

  self.countAccounts = function(_return) {
    countModel(Account, _return)
  }

  // Don't be tempted to just call model.remove.
  // That doesn't run the remove middleware
  // https://github.com/LearnBoost/mongoose/issues/439
  function removeDoc(model, query, _return) {
    _return = ensureCallback(_return);
    model.findOne(query, cb(_return, function(doc) {
      doc.remove(_return);
    }));
  }

  self.removeAccount = function(login, _return) {
    removeDoc(Account, {login: login}, _return);
  }

  self.findAccount = function(login, _return) {
    _return = ensureCallback(_return);
    Account.findOne({login: login}, _return);
  }

  self.login = function(login, password, _return) {
    _return = ensureCallback(_return);
    var badmsg = 'Unknown login or wrong password';
    Account.findOne({login: login}, function(err, res) {
      if (err || res==null) return _return(err || badmsg);
      var hash = pwhash(login, password);
      if (res.pwhash != hash) _return(badmsg);
      else _return(null, res);
    });
  }

  function cb(user, local) {
    return function(err, res) {
      if (err) user && user(err);
      else local(res);
    };
  }

  //
  // Player functions
  //
  self.makePlayer = function(name, userid, _return) {
    _return = ensureCallback(_return);
    self.findAccount(userid, cb(_return, function(user) {
      if (!user) _return('No user with userid: ' + userid);
      else {
        var player = new Player({name: name, userid: userid});
        player.save(function(err, res) {
          if (err) _return('Player already exists with name: ' + name);
          else _return(null, res);
        });
      }
    }));
  }

  self.findPlayer = function(name, _return) {
    _return = ensureCallback(_return);
    Player.findOne({name: name}, _return);
  }

  self.findUserPlayers = function(userid, _return) {
    _return = ensureCallback(_return);
    Player.find({userid: userid}, _return);
  }

  self.eachPlayer = function(each) {
    eachModel(Player, each);
  }

  self.countPlayers = function(_return) {
    countModel(Player, _return)
  }

  self.removePlayer = function(name, _return) {
    removeDoc(Player, {name: name}, _return);
  }

  //
  // Maze functions
  //

  self.makeMaze = function(name, userid, map, _return) {
    _return = ensureCallback(_return);
    self.findAccount(userid, cb(_return, function(user) {
      if (!user) _return('No user with userid: ' + userid);
      else {
        var maze = new Maze({name: name, userid: userid});
        if (map) maze.map = map;
        maze.save(function(err, res) {
          if (err) _return('Maze already exists with name: ' + name);
          else _return(null, res);
        });
      }
    }));
  }

  self.findMaze = function(name, _return) {
    _return = ensureCallback(_return);
    Maze.findOne({name: name}, _return);
  }

  self.findUserMazes = function(userid, _return) {
    _return = ensureCallback(_return);
    Maze.find({userid: userid}, _return);
  }

  self.eachMaze = function(each) {
    eachModel(Maze, each);
  }

  self.countMazes = function(_return) {
    countModel(Maze, _return)
  }

  self.removeMaze = function(name, _return) {
    removeDoc(Maze, {name: name}, _return);
  }

  //
  // Image functions
  //

  self.makeImage = function(userid, url, urlSize, _return) {
    _return = ensureCallback(_return);
    self.findAccount(userid, cb(_return, function(user) {
      if (!user) _return('No user with userid: ' + userid);
      else {
        incrementImageIdx(cb(_return, function(idx) {
          var image = new Image({idx: idx, userid: userid, url: url,
                                 urlSize: urlSize});
          image.save(function(err, res) {
            if (err) _return('Image already exists with idx: ' + idx);
            else _return(null, res);
          });
        }));
      }
    }));
  }

  self.findImage = function(idx, _return) {
    _return = ensureCallback(_return);
    Image.findOne({idx: idx}, _return);
  }

  self.findUserImages = function(userid, _return) {
    _return = ensureCallback(_return);
    Image.find({userid: userid}, _return);
  }

  self.eachImage = function(each) {
    eachModel(Image, each);
  }

  self.countImages = function(_return) {
    countModel(Image, _return)
  }

  self.removeImage = function(idx, _return) {
    removeDoc(Image, {idx: idx}, _return);
  }

  //
  // Stats functions
  //

  self.getStats = function(userid, _return) {
    _return = ensureCallback(_return);
    Stats.findOne({userid: userid}, cb(_return, function(res) {
      if (res) _return(null, res);
      else {
        self.findAccount(userid, cb(_return, function(user) {
          if (!user) _return('No user with userid: ' + userid);
          else {
            var stats = new Stats({userid: userid});
            stats.save(_return);
          }
        }));
      }
    }));
  }

  self.getTotalSize = function(userid, _return) {
    _return = ensureCallback(_return);
    self.getStats(userid, cb(_return, function(stats) {
      _return(null, stats.totalSize);
    }));
  }

  //
  // Middleware to track sizes
  //

  function osize(o) {
    var sum = 0;
    for (var i in o.schema.paths) {
      var val = o[i];
      sum += i.length + 4 + ((typeof(val) == 'string') ? val.length+2 : 4);
    }
    return sum;
  }

  function playerSize(player) {
    return osize(player);
  }

  function mazeSize(maze) {
    return osize(maze);
  }

  function imageSize(image) {
    return osize(image) + image.urlSize;
  }

  function preSave(o, next, sizefun, count, size) {
    var oldsize = o.size;
    var newsize = sizefun(o);
    o.size = newsize;
    var inc = {}
    if (oldsize==0) inc[count] = 1;
    inc[size] = (newsize - oldsize);
    Stats.update({userid: o.userid}, {$inc: inc}, null, next);
  }

  function preRemove(o, next, count, size) {
    var inc = {};
    inc[count] = -1;
    inc[size] = -o.size;
    Stats.update({userid: o.userid}, {$inc: inc}, null, next);
  }

  function preSavePlayer(next) {
    preSave(this, next, playerSize, 'playerCount', 'playerSize');
  }

  function preRemovePlayer(next) {
    preRemove(this, next, 'playerCount', 'playerSize');
  }

  function preSaveMaze(next) {
    preSave(this, next, mazeSize, 'mazeCount', 'mazeSize');
  }

  function preRemoveMaze(next) {
    preRemove(this, next, 'mazeCount', 'mazeSize');
  }

  function preSaveImage(next) {
    preSave(this, next, imageSize, 'imageCount', 'imageSize');
  }

  function preRemoveImage(next) {
    preRemove(this, next, 'imageCount', 'imageSize');
  }
}
