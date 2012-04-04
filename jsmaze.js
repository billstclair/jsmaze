// makeClass - By John Resig (MIT Licensed)
// http://ejohn.org/blog/simple-class-instantiation/
function makeClass(){
  return function(args){
    if ( this instanceof arguments.callee ) {
      if ( typeof this.init == "function" )
        this.init.apply( this, args.callee ? args : arguments );
    } else
      return new arguments.callee( arguments );
  };
}

var Maze = makeClass();

// An array <map> is an array of strings.
// The even strings describe the horizontal walls.
// The odd strings describe the vertical walls.
// Anything other than a space represents a wall.
// The odd strings are one character longer than the even strings.
// There array is of an odd length, putting horizontal walls
// first and last.

Maze.prototype.init = function(map) {
    this.type = "Maze";
    if (!map) return;           // caller is filling things in by hand
    if (map.length % 2 != 1) {
        throw('map must be an odd-length array of strings');
    }
    var horiz = new Array();
    var vert = new Array();
    var w = map[0].length;
    var h = (map.length-1)/2;
    var idx = 0;
    for (var i=0; i<map.length; i+=2) {
        var hs = map[i];
        var vs = map[i+1]
        var isv = ((i+1) != map.length);
        if (typeof(hs)!='string' || (isv && typeof(vs)!='string')) {
            throw 'map must be an array of strings';
        }
        if (hs.length!=w || (isv && vs.length!=(w+1))) {
            throw 'map has inconsistent element length';
        }
        var ha = new Array();
        var va = new Array();
        for (var j=0; j<w; j++) {
            ha[j] = (hs[j]==' ') ? 0 : 1;
            if (isv) va[j] = (vs[j]==' ') ? 0 : 1;
        }
        if (isv) {
            va[w] = (vs[w]==' ') ? 0 : 1;
            vert[idx] = va;
        }
        horiz[idx] = ha;
        idx++;
    }
    this.width = w;
    this.height = h;
    this.horiz = horiz;
    this.vert = vert;
};

function makeMaze(width, height) {
    if (!height) height = width;
    var maze = new Maze();
    maze.width = width;
    maze.height = height;
    var horiz = new Array();
    var vert = new Array();
    var idx = 0;
    for (var i=0; i<height; i++) {
        var ha = new Array();
        var va = new Array();
        for (var j=0; j<width; j++) {
            ha[j] = 1;
            va[j] = 1;
        }
        va[width] = 1;
        horiz[idx] = ha;
        vert[idx++] = va;
    }
    maze.horiz = horiz;
    maze.vert = vert;
    return maze;
}

function copy2d(arr) {
    var res = new Array();
    for (var i=0; i<arr.length; i++) {
        row = arr[i];
        var resrow = new Array();
        for (var j=0; j<row.length; j++) {
            resrow[j] = row[j];
        }
        res[i] = row;
    }
    return res;
}

Maze.prototype.clone = function() {
    var maze = new Maze();
    maze.width = this.width;
    maze.height = this.height;
    maze.horiz = copy2d(this.horiz);
    maze.vert = copy2d(this.vert);
}

Maze.prototype.topdraw = function(canvas) {
    var ctx = canvas.getContext('2d');
    var width = canvas.width-2;
    var height = canvas.height-2;
    var left = 1;
    var top = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var vert = this.vert;
    var horiz = this.horiz;

    ctx.beginPath();

    // Draw horizontal lines
    for (var i=0; i<=this.height; i++) {
        var y = Math.round(i*height/this.height);
        var pendown = false
        var row = horiz[i];
        var lastx = 0;
        for (var j=0; j<this.width; j++) {
            var x = Math.round((j+1)*width/this.width);
            if (row[j]) {
                if (!pendown) {
                    ctx.moveTo(left+lastx, top+y);
                    pendown = true;
                }
            } else {
                if (pendown) {
                    ctx.lineTo(left+lastx, top+y);
                    pendown = false;
                }
            }
            lastx = x;
        }
        if (pendown) ctx.lineTo(left+x, top+y);
    }

    // Draw vertical lines
    for (j=0; j<=this.width; j++) {
        var x = Math.round(j*width/this.width);
        var pendown = false
        var lasty = 0;
        for (var i=0; i<this.height; i++) {
            var y = Math.round((i+1)*height/this.height);
            if (vert[i][j]) {
                if (!pendown) {
                    ctx.moveTo(left+x, top+lasty);
                    pendown = true;
                }
            } else {
                if (pendown) {
                    ctx.lineTo(left+x, top+lasty);
                    pendown = false;
                }
            }
            lasty = y;
        }
        if (pendown) ctx.lineTo(left+x, top+y);
    }

    ctx.strokeStyle='black';
    ctx.stroke();
};

var lastEvent = 1;

// Necessary for browser compatibility
// http://www.quirksmode.org/js/events_properties.html
function eventPos(e) {
    var posx = 0;
    var posy = 0;
    if (!e) var e = window.event;
    lastEvent = e;

    var touches = e.targetTouches;
    if (touches) {
        // iphone startTouch event
        if (touches.length != 1) return null;
        //e.preventDefault();
        posx = touches[0].pageX;
        posy = touches[0].pageY;
    } else if (e.pageX || e.pageY) 	{
	posx = e.pageX;
	posy = e.pageY;
    }
    else if (e.clientX || e.clientY) 	{
	posx = e.clientX + document.body.scrollLeft
	    + document.documentElement.scrollLeft;
	posy = e.clientY + document.body.scrollTop
	    + document.documentElement.scrollTop;
    }
    return {x:posx, y:posy};
}

function rem0(x, y) {
    return (y==0) ? x : x%y;
}

Maze.prototype.edit = function(canvas) {
    if (document.jsmazeEditListener) return;

    var maze = this;
    var listener = function(e) {
        maze.clickListener(e, canvas);
    };
    document.addEventListener('mousedown', listener, false); // PC
    canvas.addEventListener('touchstart', listener, false);  // touch screen
    document.jsmazeEditListener = listener;
    this.topdraw(canvas);
}

Maze.prototype.endEdit = function(canvas) {
    var listener = document.jsmazeEditListener;
    if (!listener) return;
    document.removeEventListener('mousedown', listener, false);
    canvas.removeEventListener('touchstart', listener, false);
    document.jsmazeListener = null;
}

Maze.prototype.clickListener = function(e, canvas) {
    var maze = this;
    var pos = eventPos(e);
    if (!pos) return;

    var offset = $(canvas).offset();
    var x = pos.x - offset.left
    var y = pos.y - offset.top;

    var i = (y * maze.height / canvas.height);
    var j = (x * maze.width / canvas.width);
    var diffi = Math.abs(rem0(i, Math.floor(i)) - 0.5);
    var diffj = Math.abs(rem0(j, Math.floor(j)) - 0.5);
    if (diffi < diffj) {
        // It's a vertical line
        vert = maze.vert;
        i = Math.floor(i);
        j = Math.round(j);
        //alert('vert, diffi:'+diffi+', diffj:'+diffj+', i:'+i+', j:'+j);
        vert[i][j] = vert[i][j] ? 0 : 1;
    } else {
        // It's a horizontal line
        horiz = maze.horiz;
        i = Math.round(i);
        j = Math.floor(j);
        //alert('horiz, diffi:'+diffi+', diffj:'+diffj+', i:'+i+', j:'+j);
        horiz[i][j] = horiz[i][j] ? 0 : 1;
    }

    maze.topdraw(canvas);
}

Maze.prototype.toMap = function() {
    var map = new Array();
    var horiz = this.horiz;
    var vert = this.vert;
    var idx = 0;
    for (var i=0; i<=this.height; i++) {
        var dov = (i<this.height);
        var ha = horiz[i];
        var va = dov ? vert[i] : null;
        var hs = '';
        var vs = '';
        for (var j=0; j<=this.width; j++) {
            var doh = (j<this.width);
            if (doh) hs += ha[j] ? '-' : ' ';
            if (dov) vs += va[j] ? '|' : ' ';
        }
        map[idx++] = hs;
        if (dov) map[idx++] = vs;
    }
    return map;
}
