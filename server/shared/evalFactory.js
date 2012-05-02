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
  var evalFactory = {};
} else {
  var evalFactory = exports;
}

(function() {
  evalFactory.makeEvaluator = function() {
    return new Evaluator();
  }

  function Evaluator() {
    var self = this;

    var dispatchTable = {};
    this.dispatchTable = dispatchTable;

    // Args are alternating name/value pairs
    self.register = function() {
      var len = arguments.length;
      if (len%2 == 1) throw('Odd number of args to evaluator.register()');
      for (var i=0; i<len;) {
        dispatchTable[arguments[i++]] = arguments[i++];
      }
      return self;
    }

    // [function,{name:value,...}]
    self.evaluate = function(socketid, emitter, functionAndArgs, errfun) {
//      try {
        var fun = functionAndArgs[0];
        var args = functionAndArgs[1];
        console.log('evaluating: ' + fun + ' ' + JSON.stringify(args));
        var f = dispatchTable[fun];
        if (!f) {
          throw('No registered function: ' + fun);
        }
        f(emitter, args, socketid, fun);

//      } catch (err) {
//        if (typeof(errfun) === 'function') errfun(err);
//        else throw(err);
//      }
    }
  }
})()                            // eval the function() at the top of the file
