// namespace MJPEG { ...
var MJPEG = (function(module) {
  "use strict";

  // class Stream { ...
  module.Stream = function(args) {
    var self = this;
    var autoStart = args.autoStart || false;

    self.url = args.url;
    self.refreshRate = args.refreshRate || 500;
    self.onStart = args.onStart || null;
    self.onFrame = args.onFrame || null;
    self.onStop = args.onStop || null;
    self.callbacks = {};
    self.running = false;
    self.frameTimer = 0;

    self.img = new Image();
    if (autoStart) {
      self.img.onload = self.start;
    }
    self.img.src = self.url;

    function setRunning(running) {

      self.running = running;
      if (self.running) {
        self.img.src = self.url;
        self.frameTimer = setInterval(function() {
          if (self.onFrame) {
            self.onFrame(self.img);
          }
        }, self.refreshRate);
        if (self.onStart) {
          self.onStart();
        }
      } else {
        self.img.src = "#";
        clearInterval(self.frameTimer);
        if (self.onStop) {
          self.onStop();
        }
      }
    }

    self.start = function() { setRunning(true); }
    self.stop = function() { setRunning(false); }
  };

  // class Player { ...
  module.Player = function(canvas, url, options) {

    var self = this;
    if (typeof canvas === "string" || canvas instanceof String) {
      canvas = document.getElementById(canvas);
    }
    var context = canvas.getContext("2d");

    if (! options) {
      options = {};
    }
    options.url = url;
    options.onFrame = updateFrame;
    options.onStart = function() {// console.log("started");

                           console.log(new Date());
   setTimeout(function(){
     var canvas = document.querySelector('canvas');
      thestream = canvas.captureStream(60);
      setTimeout("setupNewBroadcastButtonClickHandler()", 100);
    },1200);
   
    }
    options.onError = function() { window.location.reload() }
    options.onStop = function() { 
      window.location.reload(true); 
      }

    self.stream = new module.Stream(options);

    canvas.addEventListener("click", function() {
      if (self.stream.running) { self.stop(); }
      else { self.start(); }
    }, false);

    function scaleRect(srcSize, dstSize) {
      var ratio = Math.min(dstSize.width / srcSize.width,
                           dstSize.height / srcSize.height);
      var newRect = {
        x: 0, y: 0,
        width: srcSize.width * ratio,
        height: srcSize.height * ratio
      };
      newRect.x = (dstSize.width/2) - (newRect.width/2);
      newRect.y = (dstSize.height/2) - (newRect.height/2);
      return newRect;
    }

    function updateFrame(img) {
        img.crossOrigin = 'Anonymous';
        var srcRect = {
          x: 0, y: 0,
          width: img.naturalWidth,
          height: img.naturalHeight
        };
        var dstRect = scaleRect(srcRect, {
          width: canvas.width,
          height: canvas.height
        });
      try {
              context.drawImage(img,
                srcRect.x,
                srcRect.y,
                srcRect.width,
                srcRect.height,
                dstRect.x,
                dstRect.y,
                dstRect.width,
                dstRect.height
              );
      //  console.log(".");
      data77 = canvas.toDataURL();
      frameLen.shift();
      frameLen.push(data77.length);
      frameC++;
      if(frameC% 8 === 0){
        if(canvas.toDataURL().length < 50000){
         window.location.reload();
        }
        
        function isArraySame(){
          for(var i = 0; i < frameLen.length-1; i++){
            for(var j = i; j < frameLen.length; j++){
              if(frameLen[i] != frameLen[j]){
                return false;
              }
            }
          }
          return true;
        }
        if(isArraySame()){
         window.location.reload();

        }
      }
      } catch (e) {
        // if we can't draw, don't bother updating anymore
        self.stop();
        window.location.reload();
        console.log("!");
        throw e;
      }
    }

    self.start = function() { 
      self.stream.start(); 
    }
    self.stop = function() { self.stream.stop(); }
  };

  return module;

})(MJPEG || {});

