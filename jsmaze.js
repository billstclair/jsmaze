// makeClass - By John Resig (MIT Licensed)
// http://ejohn.org/blog/simple-class-instantiation/
function makeClass(){
  return function(args){
    if ( this instanceof arguments.callee ) {
      if ( typeof this.init == "function" )
        this.init.apply( this, (args && args.callee) ? args : arguments );
    } else
      return new arguments.callee( arguments );
  };
}

var Maze = makeClass();

// A Maze <map> is an array of strings.
// The even strings describe the horizontal walls.
// The odd strings describe the vertical walls.
// Anything other than a space represents a wall.
// The odd (vertical) strings are one character longer than the even strings.
// The array is of an odd length, putting horizontal walls
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
    for (var j=0; j<map.length; j+=2) {
        var hs = map[j];
        var vs = map[j+1]
        var dov = ((j+1) != map.length);
        if (typeof(hs)!='string' || (dov && typeof(vs)!='string')) {
            throw 'map must be an array of strings';
        }
        if (hs.length!=w || (dov && vs.length!=(w+1))) {
            throw 'map has inconsistent element length';
        }
        var ha = new Array();
        var va = new Array();
        for (var i=0; i<w; i++) {
            ha[i] = (hs[i]==' ') ? 0 : 1;
            if (dov) va[i] = (vs[i]==' ') ? 0 : 1;
        }
        if (dov) {
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

function makeMaze(width, height, val) {
    val = val ? 1 : 0;
    if (!height) height = width;
    var maze = Maze();
    maze.width = width;
    maze.height = height;
    var horiz = new Array();
    var vert = new Array();
    var idx = 0;
    for (var j=0; j<=height; j++) {
        var dov = (j < height);
        var ha = new Array();
        var va = dov ? new Array() : null;
        for (var i=0; i<width; i++) {
            ha[i] = val;
            if (dov) va[i] = val;
        }
        if (dov) va[width] = val;
        horiz[idx] = ha;
        if (dov) vert[idx] = va;
        idx++;
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
    var maze = Maze();
    maze.width = this.width;
    maze.height = this.height;
    maze.horiz = copy2d(this.horiz);
    maze.vert = copy2d(this.vert);
    return maze;
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
    for (var j=0; j<=this.height; j++) {
        var y = Math.round(j*height/this.height);
        var pendown = false
        var row = horiz[j];
        var lastx = 0;
        for (var i=0; i<this.width; i++) {
            var x = Math.round((i+1)*width/this.width);
            if (row[i]) {
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
    for (i=0; i<=this.width; i++) {
        var x = Math.round(i*width/this.width);
        var pendown = false
        var lasty = 0;
        for (var j=0; j<this.height; j++) {
            var y = Math.round((j+1)*height/this.height);
            if (vert[j][i]) {
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

    var i = (x * maze.width / canvas.width);
    var j = (y * maze.height / canvas.height);
    var diffi = Math.abs(rem0(i, Math.floor(i)) - 0.5);
    var diffj = Math.abs(rem0(j, Math.floor(j)) - 0.5);
    if (diffj < diffi) {
        // It's a vertical line
        vert = maze.vert;
        i = Math.round(i);
        j = Math.floor(j);
        if (i<=0 || i>=maze.width || j<=0 || j>=maze.height) return;
        
        vert[j][i] = vert[j][i] ? 0 : 1;
    } else {
        // It's a horizontal line
        horiz = maze.horiz;
        i = Math.floor(i);
        j = Math.round(j);
        if (i<=0 || i>=maze.height || j<=0 || j>=maze.height) return;
        horiz[j][i] = horiz[j][i] ? 0 : 1;
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

// Values for draw3d() direction arg
Maze.UP = {i:0, j:-1};
Maze.DOWN = {i:0, j:1};
Maze.RIGHT = {i:1, j:0};
Maze.LEFT = {i:-1, j:0};

var round = Math.round;

var alertp = false;
function maybeAlert(msg) {
    if (alertp) alert(msg);
}

Maze.prototype.draw3d = function(canvas, pos, direction) {
    var ctx = canvas.getContext('2d');
    var width = canvas.width-2;
    var height = canvas.height-2;
    var left = 1;
    var top = 1;
    var vert = this.vert;
    var horiz = this.horiz;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left+width, top);
    ctx.lineTo(left+width, top+height);
    ctx.lineTo(left, top+height);
    ctx.lineTo(left, top);

    var maxsteps = 15;
    var factor = 0.8;
    var sizex = width/2;
    var sizey = height/2;

    var sumx = 0;
    var sumy = 0;
    for (var s=1; s<=maxsteps; s++) {
        sizex = sizex * factor;
        sizey = sizey * factor;
        sumx += sizex;
        sumy += sizey;
    }
    sizex = width/2;
    sizey = height/2;
    var cx = sizex/sumx;
    var cy = sizey/sumy;

    var i = pos.i;
    var j = pos.j;
    var di = direction.i;
    var dj = direction.j
    var x = 0;
    var y = 0;

    var dx = sizex * factor * cx;
    var dy = sizey * factor * cy;
    var nextx = x + dx;
    var nexty = y + dy;
    var lastxLeft = null;
    var lastyLeft = null;
    var lastxRight = null;
    var lastyRight = null;
    var lastWallLeft = true;
    var lastWallRight = true;

    // Loop
    for (s=1; s<maxsteps; s++) {
        nextx = x + dx;
        nexty = y + dy;

        maybeAlert('i:'+i+', j:'+j+', x:'+round(x)+', y:'+round(y)+', nextx:'+round(nextx)+', nexty:'+round(nexty));

        if (di ? horiz[di>0 ? j : j+1][i] : vert[j][dj>0 ? i+1 : i]) {
            // Draw left wall
            if (!lastWallLeft) {
                this.drawNewWallLeft(
                    ctx, x, y, lastxLeft, left, top, width, height);
            }
            this.drawWallLeft(
                ctx, x, y, nextx, nexty, left, top, width, height);
            lastWallLeft = true;
        } else {
            // Draw left door
            this.drawNewWallLeft(
                ctx, x, y, lastWallLeft?null:lastxLeft, left, top, width, height);
            lastxLeft = x;
            lastyLeft = y;
            lastWallLeft = false;
        }
        if (di ? horiz[di>0 ? j+1 : j][i] : vert[j][dj>0 ? i : i+1]) {
            // Draw right wall
            if (!lastWallRight) {
                this.drawNewWallRight(
                    ctx, x, y, lastxRight, left, top, width, height);
            } 
            this.drawWallRight(
                ctx, x, y, nextx, nexty, left, top, width, height);
            lastWallRight = true;
        } else {
            // Draw right door
            this.drawNewWallRight(
                ctx, x, y, lastWallRight?null:lastxRight, left, top, width, height);
            lastxRight = x;
            lastyRight = y;
            lastWallRight = false;
        }

        x = nextx;
        y = nexty;
        if (di ? vert[j][di>0 ? i+1 : i] : horiz[dj>0 ? j+1 : j][i]) {
            // At end wall
            this.drawEndFloorCeiling(
                ctx, x, y, left, top, width, height);
            if (lastWallLeft) {
                this.drawEndFromWallLeft(
                    ctx, x, y, left, top, width, height);
            } else {
                this.drawEndFromDoorLeft(
                    ctx, x, y, lastxLeft, left, top, width, height);
            }
            if (lastWallRight) {
                this.drawEndFromWallRight(
                    ctx, x, y, left, top, width, height);
            } else {
                this.drawEndFromDoorRight(
                    ctx, x, y, lastxRight, left, top, width, height);
            }
            break;
        }
        i += di;
        j += dj;
        dx = dx * factor;
        dy = dy * factor;
        if (i<0 || i>width || j<0 || j>height) break;
    }

    ctx.strokeStyle='black';
    ctx.stroke();
}

Maze.prototype.drawWallRight = function(ctx, x, y, nextx, nexty, left, top, width, height) {
    x = round(x);
    y = round(y);
    nextx = round(nextx);
    nexty = round(nexty);
    maybeAlert(JSON.stringify(['drawWallRight',x,y,nextx,nexty]));
    ctx.moveTo(left+width-x, top+y);
    ctx.lineTo(left+width-nextx, top+nexty);
    ctx.moveTo(left+width-x, top+height-y);
    ctx.lineTo(left+width-nextx, top+height-nexty);
}

Maze.prototype.drawWallLeft = function(ctx, x, y, nextx, nexty, left, top, width, height) {
    x = round(x);
    y = round(y);
    nextx = round(nextx);
    nexty = round(nexty);
    maybeAlert(JSON.stringify(['drawWallLeft',x,y,nextx,nexty]));
    ctx.moveTo(left+x, top+y);
    ctx.lineTo(left+nextx, top+nexty);
    ctx.moveTo(left+x, top+height-y);
    ctx.lineTo(left+nextx, top+height-nexty);
}

Maze.prototype.drawNewWallLeft = function(ctx, x, y, lastxLeft, left, top, width, height) {
    x = round(x);
    y = round(y);
    if (lastxLeft != null) lastxLeft = round(lastxLeft);
    maybeAlert(JSON.stringify(['drawNewWallLeft',x,y,lastxLeft]));
    if (lastxLeft != null) {
        ctx.moveTo(left+lastxLeft, top+y);
        ctx.lineTo(left+x, top+y);
    } else {
        ctx.moveTo(left+x, top+y);
    }
    ctx.lineTo(left+x, top+height-y);
    if (lastxLeft != null) {
        ctx.lineTo(left+lastxLeft, top+height-y);
    }
}

Maze.prototype.drawNewWallRight = function(ctx, x, y, lastxRight, left, top, width, height) {
    x = round(x);
    y = round(y);
    if (lastxRight != null) lastxRight = round(lastxRight);
    maybeAlert(JSON.stringify(['drawNewWallRight',x,y,lastxRight]));
    if (lastxRight != null) {
        ctx.moveTo(left+width-lastxRight, top+y);
        ctx.lineTo(left+width-x, top+y);
    } else {
        ctx.moveTo(left+width-x, top+y);
    }
    ctx.lineTo(left+width-x, top+height-y);
    if (lastxRight != null) {
        ctx.lineTo(left+width-lastxRight, top+height-y);
    }
}

Maze.prototype.drawEndFloorCeiling = function(ctx, x, y, left, top, width, height) {
    x = round(x);
    y = round(y);
    maybeAlert(JSON.stringify(['drawEndFloorCeiling',x,y]));
    ctx.moveTo(left+x, top+y);
    ctx.lineTo(left+width-x, top+y);
    ctx.moveTo(left+width-x, top+height-y);
    ctx.lineTo(left+x, top+height-y);
}

Maze.prototype.drawEndFromWallLeft = function(ctx, x, y, left, top, width, height) {
    x = round(x);
    y = round(y);
    maybeAlert(JSON.stringify(['drawEndFromWallLeft',x,y]));
    ctx.moveTo(left+x, top+y);
    ctx.lineTo(left+x, top+height-y);
}

Maze.prototype.drawEndFromWallRight = function(ctx, x, y, left, top, width, height) {
    x = round(x);
    y = round(y);
    maybeAlert(JSON.stringify(['drawEndFromWallRight',x,y]));
    ctx.moveTo(left+width-x, top+y);
    ctx.lineTo(left+width-x, top+height-y);
}

Maze.prototype.drawEndFromDoorLeft = function(ctx, x, y, lastxLeft, left, top, width, height) {
    x = round(x);
    y = round(y);
    lastxLeft = round(lastxLeft);
    maybeAlert(JSON.stringify(['drawEndFromDoorLeft',x,y,lastxLeft]));
    ctx.moveTo(left+x, top+y);
    ctx.lineTo(left+lastxLeft, top+y);
    ctx.moveTo(left+x, top+height-y);
    ctx.lineTo(left+lastxLeft, top+height-y);
}

Maze.prototype.drawEndFromDoorRight = function(ctx, x, y, lastxRight, left, top, width, height) {
    x = round(x);
    y = round(y);
    lastxRight = round(lastxRight);
    maybeAlert(JSON.stringify(['drawEndFromDoorRight',x,y,lastxRight]));
    ctx.moveTo(left+width-x, top+y);
    ctx.lineTo(left+width-lastxRight, top+y);
    ctx.moveTo(left+width-x, top+height-y);
    ctx.lineTo(left+width-lastxRight, top+height-y);
}
