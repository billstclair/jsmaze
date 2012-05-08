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
  var Account = null;

  init();

  function init() {
    self.mongoose = mongoose;
    mongoose.connect('mongodb://localhost/jsmaze');
    
    var Schema = mongoose.Schema;

    Account = new Schema({
      userid: {type: String, index: true},
      pwhash: {type: String},
      email: {type: String}
    });
    Account = mongoose.model('Account', Account);
  }

  self.print = function(error, result) {
    console.log(error ? error : result);
  }

  self.sha256 = sha256;
  function sha256(string) {
    var hash = crypto.createHash('sha256');
    hash.update(string);
    return hash.digest('hex');
  }

  self.createAccount = function(login, password, email, callback) {
    Account.findOne({login: login}, function(err, res) {
      if (res) callback('An account already exists for: ' + login);
      else {
        var pwhash = sha256(password);
        acct = new Account({login: login, pwhash: pwhash, email: email});
        acct.save(callback);
      }
    });
  }

  self.users = function(callback) {
    Account.find({}, callback);
  }

  self.deleteAccount = function(login, callback) {
    Account.remove({login: login}, callback);
  }

  self.login = function(login, password, callback) {
    var badmsg = 'Unknown login or wrong password';
    Account.findOne({login: login}, function(err, res) {
      if (err || res==null) return callback(err || badmsg);
      var pwhash = sha256(password);
      if (res.pwhash != pwhash) return callback(badmsg);
      callback(null, res);
    });
  }
}
