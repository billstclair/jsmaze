//////////////////////////////////////////////////////////////////////
//
// evalFactory.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

// Works in both node.js and the browser
if (typeof exports === 'undefined') {
  var eval = {};
} else {
  var eval = exports;
}

(function() {
  eval.makeEval = function() {
    return new Eval();
  }

  function Eval() {
    self = this;

    var dispatch = {};

    // Args are alternating name/value pairs
    self.register = function() {
      var len = arguments.length;
      if (len%2 == 1) throw('Odd number of args to eval.register()');
      for (var i=0; i<len;) {
        dispatch[arguments[i++]] = arguments[i++];
      }
      return self;
    }

    // [function,{name:value,...}]
    self.eval = function(socket, functionAndArgs, errfun) {
      try {
        var fun = functionAndArgs[0];
        var f = dispatch[fun];
        if (!f) {
          throw('No registered function: ' + fun);
        }
        var args = functionAndArgs[1];
        f(socket, args, fun);
      } catch (err) {
        if (typeof(errfun) === 'function') errfun(err);
        else throw(err);
      }
    }

    self.dispatch = function() {
      return dispatch;
    }
  }
})()                            // eval the function() at the top of the file