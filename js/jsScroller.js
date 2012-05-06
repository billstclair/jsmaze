//////////////////////////////////////////////////////////////////////
//
// jsScroller.js
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

// Our one global variable
jsScroller = {};

(function() {

  var defaultMaxlines = 100;

  // The div arg is from something like this:
  //   <div id='text' style='width: 20em; height: 5em;
  //        overflow:auto; overflow-x: hidden; position:relative;
  //        border: 1px solid;'></div>
  //   new jsScroller.Scroller($('#text'))
  // maxlines is optional, defaults to defaultMaxlines
  jsScroller.Scroller = Scroller;
  function Scroller(div, maxlines) {
    var self = this;
    if (maxlines === undefined) maxlines = defaultMaxlines;

    var lines = [];
    var curline = 0;
    var fullp = false;
    var tblClass = null;

    self.addline = addline;
    function addline(columns) {
      lines[curline++] = columns;
      if (curline >= maxlines) {
        fullp = true;
        curline = 0;
      }
      displayLines();
    }

    function addColumns (str, columns) {
      str += '<tr>';
      if (typeof(columns) == 'string') columns = [columns];
      for (var j=0; j<columns.length; j++) {
        str += '<td>' + columns[j] + '</td>';
      }
      str += '</tr>';
      return str;
    }

    self.tableClass = tableClass;
    function tableClass(cls) {
      if (!(cls === undefined)) tblClass = cls;
      return tblClass;
    }

    function displayLines() {
      var str = '<table' + (tblClass ? " class='"+tblClass+"'>" : '>');
      var idx = fullp ? curline : 0;
      var cnt = fullp ? maxlines : curline;
      for (var i=1; i<cnt; i++) {
        var columns = lines[idx++];
        if (idx >= maxlines) idx = 0;
        str = addColumns(str, columns);
      }
      var clientHeight = div[0].clientHeight;
      var scrollHeight = div[0].scrollHeight;
      var bottomScroll = scrollHeight - clientHeight;
      var doScroll = (div.scrollTop() == bottomScroll);
      if (!doScroll) {
        var scrollTop = div.scrollTop();
        div.html(str + '</table>');
        var scrollDiff = scrollHeight - div[0].scrollHeight;
      }
      var columns = lines[idx++];
      if (idx >= maxlines) idx = 0;
      str = addColumns(str, columns);
      str += '</table>';
      div.html(str);
      if (doScroll) div.scrollTop(div[0].scrollHeight);
      else div.scrollTop(Math.max(0, scrollTop - scrollDiff));
    }
  }

})();
