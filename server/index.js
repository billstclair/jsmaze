//////////////////////////////////////////////////////////////////////
//
// index.js
// Top-level of the jsMaze server
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var argv = require('optimist').argv;
var port = argv.p || argv.port || 6293;
var uid = argv.uid || argv.u;
var gid = argv.gid || argv.g;
require('./lib/network').start(port, uid, gid);

