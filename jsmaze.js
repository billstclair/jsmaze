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

Maze.prototype.init = function(map) {
    this.type = "Maze";
    this.width = map.length-1;
    this.height = map[0].length-1;
    for (var i=1; i<this.width; i++) {
        if (map[i].length != this.height+1) {
            throw "Inconsistent height";
        }
    }
    this.map = map;
};

Maze.prototype.topdraw = function(canvas) {
    var ctx = canvas.getContext('2d');
    var width = canvas.width-2;
    var height = canvas.height-2;
    var left = 1;
    var top = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var map = this.map;

    ctx.beginPath();

    // Draw horizontal lines
    for (var i=0; i<=this.height; i++) {
        var y = Math.round(i*height/this.height);
        var pendown = false
        var row = map[i];
        for (var j=0; j<=this.width; j++) {
            var x = Math.round(j*width/this.width);
            if (row[j]) {
                if (pendown) {
                    ctx.lineTo(left+x, top+y);
                } else {
                    ctx.moveTo(left+x, top+y);
                    pendown = true;
                }
            } else {
                pendown = false;
            }
        }
    }

    // Draw vertical lines
    for (j=0; j<=this.width; j++) {
        var x = Math.round(j*width/this.width);
        var pendown = false
        for (var i=0; i<=this.height; i++) {
            var y = Math.round(i*height/this.height);
            if (map[i][j]) {
                if (pendown) {
                    ctx.lineTo(left+x, top+y);
                } else {
                    ctx.moveTo(left+x, top+y);
                    pendown = true;
                }
            } else {
                pendown = false;
            }
        }
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
    if (e.pageX || e.pageY) 	{
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

Maze.prototype.edit = function(canvas) {
    var maze = this;
    document.addEventListener("mousedown", function(e) {
        var pos = eventPos(e);

        var offset = $(canvas).offset();
        var x = pos.x - offset.left
        var y = pos.y - offset.top;

        var i = Math.round(y * maze.height / canvas.height);
        var j = Math.round(x * maze.width / canvas.width);

        maze.map[i][j] = !maze.map[i][j];
        maze.topdraw(canvas);
    }, false);
    this.topdraw(canvas);
}