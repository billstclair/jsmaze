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
      size: Number
    }, noId);
    addJSONVirtual(Player, 'appearance', '_appearance');
    addJSONVirtual(Player, 'pos', '_pos');
    addJSONVirtual(Player, 'dir', '_dir');
    Player = mongoose.model('Player', Player);

    Maze = new Schema({
      name: {type: String, unique: true},  // unique name (good idea?)
      userid: {type: String, index: true}, // user who owns this maze
      _map: String,                        // arg to new jsmaze.Maze()
      _walls: String,                      // {'i,j':<idx>, ...}
      size: Number
    }, noId);
    addJSONVirtual(Maze, 'map', '_map');
    addJSONVirtual(Maze, 'walls', '_walls');
    Maze = mongoose.model('Maze', Maze);

    Image = new Schema({
      idx: {type: Number, unique: true},
      userid: {type: String, index: true},
      url: String,
      size: Number
    }, noId);
    Image = mongoose.model('Image', Image);

    Stats = new Schema({
      userid: {type: String, unique: true},
      totalSize: Number,
      playerCount: Number,
      playerSize: Number,
      mazeCount: Number,
      mazeSize: Number,
      imageCount: Number,
      ImageSize: Number
    });
    Stats = mongoose.model('Stats', Stats);    
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

  self.eachAccount = function(each) {
    eachModel(Account, each);
  }

  self.deleteAccount = function(login, _return) {
    _return = ensureCallback(_return);
    Account.remove({login: login}, _return);
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

  self.deletePlayer = function(name, _return) {
    _return = ensureCallback(_return);
    Player.remove({name: name}, _return);
  }

}
