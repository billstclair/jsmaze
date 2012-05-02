//////////////////////////////////////////////////////////////////////
//
// jsAudio.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

// Our one global variable
var jsAudio = {};

(function() {

  jsAudio.AudioFiles = AudioFiles;
  function AudioFiles(basePath, type, minPlayTime) {
    self = this;

    if (!type) type = 'wav';
    if (minPlayTime === undefined) minPlayTime = 50; // 50 milliseconds min

    var files = {};
    var loaded = {};
    var lastPlayed = {};
    var timeouts = {};

    // For debugging
    self.files = files;
    self.loaded = loaded;
    self.lastPlayed = lastPlayed;
    self.timeouts = timeouts;

    self.getFile = getFile;
    function getFile(file) {
      var audio = files[file];
      if (audio) return audio;
      audio = new Audio(basePath + file + '.' + type);
      audio.load();
      files[file] = audio;
      loaded[file] = false;
      lastPlayed[file] = new Date();
      return audio;
    }

    self.playFile = playFile;
    function playFile(file, volume, start, length) {
      var audio = getFile(file);
      var now = new Date();
      if ((now - lastPlayed[file]) < minPlayTime) return;
      if (loaded[file]) {
        var timeout = timeouts[file];
        if (timeout) {
          try {
            window.clearTimeout(timeout);
          } catch(e) {
          }
          delete timeouts[file];
        }
        try {
          audio.pause();
        } catch(e) {
        }
      }
      if (typeof(start) != 'number') start = 0;
      if (typeof(volume) != 'number') volume = 1;
      try {
        audio.currentTime = start;
        audio.volume = volume;
        audio.play();
        loaded[file] = true;
        lastPlayed[file] = new Date();
        if (!(length === undefined)) {
          timeouts[file] = window.setTimeout(makeTimeoutF(file), length * 1000);
        }
      } catch(e) {
      }
    }

    function makeTimeoutF(file) {
      return function() {
        var timeout = timeouts[file];
        if (timeout) window.clearTimeout(timeout);
        try {
          files[file].pause();
        } catch(e) {
        }
      }
    }
  }

  // {iThing: {basePath: 'images/sys/sound/',
  //           type: 'm4a',
  //           files: {all: {tick: {start: 0, length: 0.2},
  //                         swoosh2: {start: 1, length: 0.2},
  //                         shot: {start: 2, length: 0.6},
  //                         thud: {start: 3, length: 0.3},
  //                         ouch: {start: 4, length: 1.0}}}},
  //  else: {basePath: 'images/sys/sound/',
  //         type: 'wav',
  //         files: {tick: 'tick', swoosh2: 'swoosh2', shot: 'shot',
  //                 thud: 'thud', ouch: 'ouch'}}}
  jsAudio.Sounds = Sounds;
  function Sounds(specs) {
    var self = this;
    var sounds = {};
    self.sounds = sounds;       // debugging

    init(specs);

    function init(specs) {
      var spec = null;
      if (isIThing()) spec = specs.iThing;
      if (!spec && isSafari()) spec = specs.Safari;
      if (!spec) spec = specs.else;
      if (!spec) throw('No spec for key: else');
      var audio = new AudioFiles(spec.basePath, spec.type);
      var files = spec.files;
      for (var file in files) {
        audio.getFile(file);
        var fileSpec = files[file];
        if (typeof(fileSpec) == 'string') {
          sounds[fileSpec] = {audio: audio, file: file};
        } else {
          for (var sound in fileSpec) {
            var info = fileSpec[sound];
            sounds[sound] = {audio: audio, file: file,
                             volume: info.volume,
                             start: info.start,
                             length: info.length};
          }
        }
      }
    }

    function debug(str) {
      if (self.debugElt) {
        self.debugElt.innerHTML = str;
      }
    }

    self.play = play;
    function play(sound) {
      var spec = sounds[sound];
      if (!spec) return;
      spec.audio.playFile(spec.file, spec.volume, spec.start, spec.length);
    }
  }

  jsAudio.isIThing = isIThing;
  function isIThing() {
    return (navigator.userAgent.match(/iPhone/)) || 
      (navigator.userAgent.match(/iPod/));
  }

  jsAudio.isSafari = isSafari;
  function isSafari() {
    return (navigator.userAgent.match(/Safari/))
  }

})();
