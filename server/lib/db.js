var simpledb = require('simpledb');
var fs = require('fs');
var crypto = require('crypto');

module.exports = new DB();
function DB() {
    var self = this;
    var _settingsFile = process.env.HOME + '/jsmaze.json';
    var _settings;
    var _sdb;
    var _acctDomain = 'jsmazeAcct';

    init();

    function init() {
        _settings = JSON.parse(fs.readFileSync(_settingsFile));
        // simpledb clobbers options
        var options = {};
        for (k in _settings) options[k] = _settings[k];
        options.secure = true;
        _sdb = new simpledb.SimpleDB(options);
    }

    self.settings = function() {
        return _settings;
    }

    self.sdb = function() {
        return _sdb;
    }

    self.printer = function(error, result) {
        console.log(error ? error : result);
    }

    self.printDomains = function() {
        _sdb.listDomains(self.printer);
    }

    self.printDomainMetadata = function(domain) {
        _sdb.domainMetadata(domain, self.printer);
    }

    function cb(user, local) {
        return function(error, res) {
            if (error) user(error);
            else local(res, user);
        }
    }        

    self.sha256 = function(string) {
        var hash = crypto.createHash('sha256');
        hash.update(string);
        return hash.digest('hex');
    }

    function errmsg(code, message) {
        return {Code: code, Message: message};
    }

    function requireCallback(callback) {
        if (typeof(callback) != 'function') {
            throw('Callback must be a function');
        }
    }

    function readAccount(login, callback) {
        requireCallback(callback);
        _sdb.getItem(_acctDomain, login, cb(callback, function(res) {
            if (res) delete res.$ItemName;
            //res.login = login;
            callback(null, res);
        }));
    }

    function writeAccount(attrs, callback) {
        requireCallback(callback);
        var login = attrs.login;
        _sdb.putItem(_acctDomain, login, attrs, callback);
    }

    self.createAccount = function(login, password, callback) {
        requireCallback(callback);
        var doit = function(error, res) {
            if (error) callback(error);
            else if (res) callback(errmsg('AccountExists',
                                          'There is already an account for: ' +
                                          login));
            hash = self.sha256(password);
            writeAccount({login: login, passwordHash: hash}, callback);
        }
        readAccount(login, function(error, res) {
            if (error) {
                _sdb.createDomain(_acctDomain, function(error) {
                    if (error) callback(error);
                    else readAccount(login, doit);
                });
            } else {
                doit(null, res);
            }
        });
    }

    self.deleteAccount = function(login, callback) {
        _sdb.deleteItem(_acctDomain, login, callback);
    }

    self.login = function(login, password, callback) {
        requireCallback(callback);
        function fail() {
            callback(errmsg('LoginFailure',
                            'Incorrect username or password'));
        }
        readAccount(login, cb(callback, function(res) {
            if (!res) fail();
            else {
                hash = self.sha256(password);
                if (res.passwordHash != hash) fail();
                else {
                    delete res.$ItemName;
                    callback(null, res);
                }
            }}));
    }

}
