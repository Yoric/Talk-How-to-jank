(function() {

var requestAnimationFrame =
  window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function emulateRequestAnimationFrame(f) {
    window.setTimeout(f, 1000/60);
  };


var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");

window.Animation = {
  startTimeStamp: null,
  _stopped: false,
  _timeout: null,
  start: function(inject) {
    this._stopped = false;
    this.startTimeStamp = Date.now();
    requestAnimationFrame(function loop() {
      if (window.Animation._stopped) {
	return;
      }
      var wait = inject(canvas, width, height, window.Animation.startTimeStamp) || 0;
      if (wait > 0) {
        window.Animation.timeout = window.setTimeout(() => requestAnimationFrame(loop), wait);
      } else {
        requestAnimationFrame(loop);
      }
    });
  },
  stop: function() {
    this._stopped = true;
    window.clearTimeout(this._timeout);
    this._timeout = null;
  },
  addEventListener: function(event, listener) {
    if (event != "resize") {
      throw new Error("Wrong event: " + event);
    }
    this._eventListeners.push(listener);
  },
  triggerEvent: function(event) {
    for (var listener of this._eventListeners) {
      listener(event);
    }
  },
  _eventListeners: [],
};




// Handle resizing

var width;
var height;

var onresize = function() {
  var elt = document.getElementById("teaser_jank");
  width = Math.min(window.innerWidth, elt.clientWidth);
  height = Math.min(window.innerHeight, elt.clientHeight);
  var min = Math.min(width, height);
  width = min;
  height = min;
  canvas.width = width;
  canvas.height = height;
};
onresize();

window.Animation.addEventListener("resize", onresize);

(function() {
var timeout = null;
window.addEventListener("resize", function() {
  if (timeout) {
    window.clearTimeout(timeout);
  }
  timeout = window.setTimeout(() => window.Animation.triggerEvent("resize", 66));
});
})();

// Actual animation

var Images = {
  mozilla: new Image(),
  firefox: new Image(),
  _scale: null,
  get scale() {
    if (this._scale) {
      return this._scale;
    }
    var scale = 1;
    for (var dim of [width, height]) {
      for (var image of [Images.firefox, Images.mozilla]) {
        for (var imgDim of [image.width, image.height]) {
          scale = Math.min(scale, dim / imgDim);
        }
      }
    }
    return this._scale = scale;
  },
  onresize: function() {
    Images._scale = null;
  }
};
Images.mozilla.src = "themes/mozilla/images/mozilla-logo.png";
Images.firefox.src = "img/firefox-512.png";

window.Animation.addEventListener("resize", () => Images.onresize());
Images.mozilla.addEventListener("load", () => Images.onresize());
Images.firefox.addEventListener("load", () => Images.onresize());

var Elements = {
  smooth: document.getElementById("row-smooth")
};

function makePainter(initialWaitFor, waitAfter, waitFor) {
  var latestWait = 0;
  return function paint(canvas, w, h, t0) {

    context.fillStyle = "lightgray";
    context.fillRect(0, 0, width, height);

    var now = Date.now();

    if (initialWaitFor) {
      latestWait = now;
      var result = initialWaitFor;
      initialWaitFor = 0;
      return result;
    }

    context.save();
    var scale = Images.scale * 0.9;
    context.translate(w / 2, h / 2);
    context.scale(scale, scale);

    context.save();
    var rotation = (now - t0) / 1000;
    context.rotate(rotation);
    context.drawImage(Images.firefox, - Images.firefox.width / 2, - Images.firefox.width / 2);
    context.restore();

    context.globalAlpha = .7;
    context.drawImage(Images.mozilla, - Images.mozilla.width / 2, - Images.mozilla.height / 2);

    context.restore();

    if (now - latestWait > waitAfter) {
      latestWait = now;
      return waitFor;
    }
    return 0;
  };
}

for (var item of [
  ["row-smooth", [0, NaN, 0]],
  ["row-choppy", [0, 0, 50]],
  ["row-jank", [0, 1000, 50]],
  ["row-broken", [200 /* Increased for dramatic effect */, 1000, 200]],
  ["row-stopped", [10000, 11000, 10000]]
 ]) {
  (function(id, wait) {
    var element = document.getElementById(id);
    element.addEventListener("mouseenter", function(event) {
      window.setTimeout(() =>
        window.Animation.start(makePainter(...wait)),
        10);
                        
      event.stopPropagation();
    });
    element.addEventListener("mouseleave", function(event) {
      context.clearRect(0, 0, width, height);
      window.Animation.stop();
      event.stopPropagation();
    });
  })(item[0], item[1]);
}


})();
