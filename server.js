const fs = require('fs');
const path = require('path');
const url = require('url');
var httpServer = require('http');
const ioServer = require('socket.io');
const RTCMultiConnectionServer = require('rtcmulticonnection-server');
var MjpegCamera = require('mjpeg-camera');

var WriteStream = require('stream').Writable;
var unpipe = require('unpipe');

var FileOnWrite = require('file-on-write');

// Create a writable stream to generate files
var fileWriter = new FileOnWrite({
  path: './frames',
  ext: '.jpeg',
  filename: function(frame) {
    return frame.name + '-' + frame.time;
  },
  transform: function(frame) {
    return frame.data;
  }
});







var boundary = '--boundandrebound';

var PORT = 1234;

var allCameras = {};
var allWS= {};

const jsonPath = {
    config: 'config.json',
    logs: 'logs.json'
};

const BASH_COLORS_HELPER = RTCMultiConnectionServer.BASH_COLORS_HELPER;
const getValuesFromConfigJson = RTCMultiConnectionServer.getValuesFromConfigJson;
const getBashParameters = RTCMultiConnectionServer.getBashParameters;
const resolveURL = RTCMultiConnectionServer.resolveURL;

var config = getValuesFromConfigJson(jsonPath);
config = getBashParameters(config, BASH_COLORS_HELPER);

// if user didn't modifed "PORT" object
// then read value from "config.json"
if(PORT === 9001) {
    PORT = program.port;
}

function serverHandler(request, response) {
    if (/stream/.test(request.url)) {
    response.writeHead(200, {'Access-Control-Allow-Origin' : '*' ,'Content-Type': 'multipart/x-mixed-replace; boundary=' + boundary});
        var camera, ws;
        const query = url.parse(request.url,true).query;
        if(query.url){
         var link = query.url;
          if(allCameras[link]){
            camera = allCameras[link]
          }
          else{
            camera = new MjpegCamera({
              user: '',
              password: '',
              url: link,
              name: ""
            });
            camera.start();
            allCameras[link] = camera;
          }
        }
    ws = new WriteStream({objectMode: true});
    ws._write = function(chunk, enc, next) {
      var jpeg = chunk.data;
      response.write(boundary + '\nContent-Type: image/jpeg\nContent-Length: '+ jpeg.length + '\n\n');
      response.write(jpeg);
      next();
    };
    camera.pipe(ws);
    
 //   camera.pipe(fileWriter);
 //   ws.on("close", function(e){console.log(e)});

    response.on('close', function() {
      unpipe(camera);
    });
    response.on('error', function() {
      ws.end();
    });
    return;
  } 
  // A request to http://localhost/frame returns a single frame as a jpeg
  else if (/frame/.test(request.url)) {
    response.writeHead(200, {'Access-Control-Allow-Origin' : '*', 'Content-Type': 'image/jpeg'});
    response.end(camera.frame);
    return;
  }
  //
    // to make sure we always get valid info from json file
    // even if external codes are overriding it
    config = getValuesFromConfigJson(jsonPath);
    config = getBashParameters(config, BASH_COLORS_HELPER);

    // HTTP_GET handling code goes below
    try {
   



        var uri, filename;

        try {
            if (!config.dirPath || !config.dirPath.length) {
                config.dirPath = null;
            }

            uri = url.parse(request.url).pathname;
            if(uri == "/") uri = "/index.html"
            filename = path.join(config.dirPath ? resolveURL(config.dirPath) : process.cwd(), uri);
        } catch (e) {
            pushLogs(config, 'url.parse', e);
        }

        filename = (filename || '').toString();

        if (request.method !== 'GET' || uri.indexOf('..') !== -1) {
            try {
                response.writeHead(401, {
                    'Content-Type': 'text/plain'
                });
                response.write('401 Unauthorized: ' + path.join('/', uri) + '\n');
                response.end();
                return;
            } catch (e) {
                pushLogs(config, '!GET or ..', e);
            }
        }

        var contentType = 'text/plain';
        if (filename.toLowerCase().indexOf('.html') !== -1) {
            contentType = 'text/html';
        }
        if (filename.toLowerCase().indexOf('.css') !== -1) {
            contentType = 'text/css';
        }
        if (filename.toLowerCase().indexOf('.png') !== -1) {
            contentType = 'image/png';
        }

        fs.readFile(filename, 'binary', function(err, file) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                response.write('404 Not Found: ' + path.join('/', uri) + '\n');
                response.end();
                return;
            }

            try {
                file = file.replace('connection.socketURL = \'/\';', 'connection.socketURL = \'' + config.socketURL + '\';');
            } catch (e) {}

            response.writeHead(200, {
                'Content-Type': contentType
            });
            response.write(file, 'binary');
            response.end();
        });
    } catch (e) {
        pushLogs(config, 'Unexpected', e);

        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('404 Not Found: Unexpected error.\n' + e.message + '\n\n' + e.stack);
        response.end();
    }
}

var httpApp;
httpApp = httpServer.createServer(serverHandler);

RTCMultiConnectionServer.beforeHttpListen(httpApp, config);
httpApp = httpApp.listen(process.env.PORT || PORT, process.env.IP || "0.0.0.0", function() {
    RTCMultiConnectionServer.afterHttpListen(httpApp, config);
});

// --------------------------
// socket.io codes goes below

ioServer(httpApp).on('connection', function(socket) {
    RTCMultiConnectionServer.addSocket(socket, config);

    // ----------------------
    // below code is optional

    const params = socket.handshake.query;

    if (!params.socketCustomEvent) {
        params.socketCustomEvent = 'custom-message';
    }

    socket.on(params.socketCustomEvent, function(message) {
        socket.broadcast.emit(params.socketCustomEvent, message);
    });
});
