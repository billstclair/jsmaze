var redis = require('redis');
var fs = require('fs');
var crypto = require('crypto');

module.exports = new DB();
function DB() {
  var self = this;
  var _client;

  init();

  function init() {
    _client = redis.createClient();
    _client.on('error', handleRedisError);
  }

  function handleRedisError(err) {
    console.log('Redis error: ' + err);
  }

  self.redisClient = function() {
    return _client;
  }

  self.print = function(error, result) {
    console.log(error ? error : result);
  }

  function cb(user, local) {
    return function(error, res) {
      if (error) user(error);
      else local(res, user);
    }
  }        

  self.sha256 = sha256;
  function sha256(string) {
    var hash = crypto.createHash('sha256');
    hash.update(string);
    return hash.digest('hex');
  }

  function requireCallback(callback) {
    if (!(typeof(callback) === 'function')) {
      throw('Callback must be a function');
    }
  }

  function key(type, name) {
    return 'jmaze:' + type + ':' + name;
  }

  function userkey(login) {
    return key('user', login);
  }

  function userskey() {
    return key('users');
  }

  // Keys in the userkey hash table
  var $passwordHash = 'passwordHash';

  self.createAccount = function(login, password, callback) {
    requireCallback(callback);
    var usersk = userskey();
    var userk = userkey(login);
    _client.sismember(usersk, login, cb(callback, function(res) {
      if (res) callback('An account already exists for: ' + login);
      else {
        var hash = sha256(password);
        _client.multi()
          .sadd(usersk, login)
          .hset(userk, $passwordHash, hash)
          .exec(function(err) {
            callback(err, err ? null : true);
          });
      }
    }));
  }

  self.users = function(callback) {
    requireCallback(callback);
    _client.smembers(userskey(),callback);
  }

  self.deleteAccount = function(login, callback) {
    requireCallback(callback);
    _client.multi()
      .del(userkey(login))
      .srem(userskey(), login)
      .exec(function (err) {
        callback(err, err ? null : true);
      });
  }

  self.login = function(login, password, callback) {
    requireCallback(callback);
    _client.hget(userkey(login), $passwordHash, function(error, res) {
      // Won't need hash if no db entry, but don't allow
      // telling that from timing.
      var hash = sha256(password);
      if (!(hash===res)) error = true;
      var errmsg = 'Incorrect login or password';
      callback(error ? errmsg : null, error ? null : true)
    });
  }
}
