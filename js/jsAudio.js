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
    function playFile(file, start, length) {
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
      if (start === undefined) start = 0;
      try {
        audio.currentTime = start;
        audio.play();
        loaded[file] = true;
        lastPlayed[file] = new Date();
        if (!(length === undefined)) {
          timeouts[file] = window.setTimeout(makeTimeout(file), length * 1000);
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

})();