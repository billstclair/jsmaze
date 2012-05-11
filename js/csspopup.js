//////////////////////////////////////////////////////////////////////
//
// csspopup.js
// Adapted from:
//   www.pat-burt.com/web-development/how-to-do-a-css-popup-without-opening-a-new-window/
// The JavaScript part of pop-up divs.
// CSS in #blanket & .popUpDiv in ../css/style.css
// Copyright (c) 2012 Bill St. Clair
// Some rights reserved.
// Distributed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0.html
//
//////////////////////////////////////////////////////////////////////

var csspopup = {};

(function() {

  csspopup.popup = popup;
  function popup(popUpDiv) {
    toggle('blanket');
    toggle(popUpDiv);		
    setBlanketSize(popUpDiv);
    setPopupPos(popUpDiv);
  }

  function toggle(divid) {
    var el = $('#'+divid)[0];
    if (el.style.display == 'none') el.style.display = 'block';
    else el.style.display = 'none';
  }

  function setBlanketSize(popUpDiv) {
    var viewportHeight, blanketHeight;
    if (typeof window.innerWidth != 'undefined') {
      viewportHeight = window.innerHeight;
    } else {
      viewportHeight = document.documentElement.clientHeight;
    }
    if ((viewportHeight > document.body.parentNode.scrollHeight) &&
        (viewportHeight > document.body.parentNode.clientHeight)) {
      blanketHeight = viewportheight;
    } else {
      if (document.body.parentNode.clientHeight >
          document.body.parentNode.scrollHeight) {
        blanketHeight = document.body.parentNode.clientHeight;
      } else {
        blanketHeight = document.body.parentNode.scrollHeight;
      }
    }
    var blanket = $('#blanket')[0];
    blanket.style.height = blanketHeight + 'px';
    var popUpDiv = $('#'+popUpDiv)[0];
    popUpDiv.style.top = (blanketHeight-popUpDiv.offsetHeight)/3 + 'px';

  }

  function setPopupPos(popUpDiv) {
    var viewportWidth, windowWidth;
    if (typeof window.innerWidth != 'undefined') {
      viewportWidth = window.innerWidth;
    } else {
      viewportWidth = document.documentElement.clientWidth;
    }
    if ((viewportWidth > document.body.parentNode.scrollWidth) &&
        (viewportWidth > document.body.parentNode.clientWidth)) {
      windowWidth = viewportWidth;
    } else {
      if (document.body.parentNode.clientWidth >
          document.body.parentNode.scrollWidth) {
        windowWidth = document.body.parentNode.clientWidth;
      } else {
        windowWidth = document.body.parentNode.scrollWidth;
      }
    }
    var popUpDiv = $('#'+popUpDiv)[0];
    popUpDiv.style.left = (windowWidth-popUpDiv.offsetWidth)/2 + 'px';
  }

})();
