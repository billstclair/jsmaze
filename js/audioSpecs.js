//////////////////////////////////////////////////////////////////////
//
// jsAudio.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

// sounds = jsAudio.Sounds(audioSpecs);
// sounds.play('tick'), ...
var audioSpecs =
  {iThing: {basePath: 'images/sys/sound/',
            type: 'm4a',
            files: {all: {tick: {start: 0, length: 0.2},
                          swoosh2: {start: 1, length: 0.2},
                          shot: {start: 2, length: 0.6, volume: 0.6},
                          thud: {start: 3, length: 0.3},
                          ouch: {start: 4, length: 1.0}}}},
   else: {basePath: 'images/sys/sound/',
          type: 'wav',
          files: {tick: 'tick',
                  swoosh2: 'swoosh2',
                  shot: {shot: {volume: 0.6}},
                  thud: 'thud',
                  ouch: 'ouch'}}};
