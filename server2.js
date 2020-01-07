var fs = require('fs');
var path = require('path');
var http = require('http');
var MjpegCamera = require('mjpeg-camera');
var WriteStream = require('stream').Writable;
var program = require('commander');
var unpipe = require('unpipe');

program
  .option('-u --user []', 'Set the username for camera authentication')
  .option('-pw --password []', 'Set the password for camera authentication')
  .option('-l --url []', 'Set the url for the camera')
  .option('-p --port [3000]', 'Set the port for the http server to listen on', parseInt)
  .option('-n --name [camera]', 'Set the name of the camera')
  .parse(process.argv);

if (!program.url) {
  program.help();
}

// Create a new MjpegCamera object
var camera = new MjpegCamera({
  user: program.user || '',
  password: program.password || '',
  url: program.url,
  name: typeof program.name === 'function' ? '' : program.name
});
camera.start();

var boundary = '--boundandrebound';
var port = program.port || 3000;

console.log('===', camera.name, 'camera server listening on', port, '===');

http.createServer(function(req, res) {
  // A request to http://localhost/stream returns an unending sequence of jpegs
  // Listen for a disconnect from the client to properly unpipe the jpeg stream


  if (/stream/.test(req.url)) {
    res.writeHead(200, {'Access-Control-Allow-Origin' : '*' ,'Content-Type': 'multipart/x-mixed-replace; boundary=' + boundary});
    var ws = new WriteStream({objectMode: true});
    ws._write = function(chunk, enc, next) {
      var jpeg = chunk.data;
      res.write(boundary + '\nContent-Type: image/jpeg\nContent-Length: '+ jpeg.length + '\n\n');
      res.write(jpeg);
      next();
    };
    camera.pipe(ws);
    res.on('close', function() {
      unpipe(camera);
    });
  } 
  // A request to http://localhost/frame returns a single frame as a jpeg
  else if (/frame/.test(req.url)) {
    res.writeHead(200, {'Access-Control-Allow-Origin' : '*', 'Content-Type': 'image/jpeg'});
    res.end(camera.frame);
  } 
  // A request to http://localhost returns a simple webpage that will render
  // a livestream of jpegs from the camera
  else {
    res.writeHead(200, {'Access-Control-Allow-Origin' : '*', 'Content-Type': 'text/html'});
    /*
    res.end('<!doctype html>\
              <html>\
                <head>\
                  <title>'+camera.name+'</title>\
                </head>\
                <body style="background:#000;">\
                  <img src="/stream" style="width:100%;height:auto;">\
                </body>\
              </html>');
             */
    var filePath = "./" + req.url;
    if (filePath == './')
        filePath = './index2.html';


     var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;      
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./public/404.html', function(error, content) {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                });
            }
            else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                res.end(); 
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

  }
}).listen(port);

