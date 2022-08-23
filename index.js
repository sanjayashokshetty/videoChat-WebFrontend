'use strict';
var fs = require('fs');

//Loading dependencies & initializing express
var os = require('os');
var express = require('express');
var app = express();
var https = require('https');
//For signalling in WebRTC
var socketIO = require('socket.io');


app.use(express.static('public'))

app.get("/", function(req, res){
	res.render("index.ejs");
});

app.get("/html", function(req, res){
	res.status(200).send(`<!DOCTYPE html>
	<html>
	
	<head>
	
	  <title>WebTutsPlus WebCon</title>
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <link href="https://fonts.googleapis.com/css2?family=Baloo+Tamma+2:wght@400;500;600&family=Josefin+Slab&display=swap" rel="stylesheet">
	  <link rel="stylesheet" href="/css/styles.css">
	
	  <!-- <link rel="stylesheet" href="/css/main.css" /> -->
	
	</head>
	
	<body class="h-100">
	  <div class="h-100" id="video_display">
	
		<div id ="video_container" class="" style="">
		  <div class="remote_div" id="div2">
					<video id="remoteVideo" class="" autoplay playsinline></video>
				</div>
		  <div class="local_div" id="div1" style="">
					<video id="localVideo" class="" autoplay muted playsinline></video>
				</div>
			
		</div>
	
	  </div>
	  
	
	  
	
	  <!-- Import SocketIO for signalling -->
	  <script src="/socket.io/socket.io.js"></script>
	
	  <!-- Import WebRTC adapter for compatibility with all the browsers  -->
	  <script src="https://webrtc.github.io/adapter/adapter-latest.js"></script>
	  
	  <!-- Import TURN config -->
	  <script src="js/config.js"></script>
	
	  <!-- Import script containing WebRTC related functions -->
	  <script src="js/main.js"></script>
	  
	</body>
	
	</html>`);
});

var options = {
	key: fs.readFileSync('client-key.pem'),
	cert: fs.readFileSync('client-cert.pem')
};

var server = https.createServer(options,app);

server.listen(process.env.PORT || 8000);

var io = socketIO(server);

io.sockets.on('connection', function(socket) {

	// Convenience function to log server messages on the client.
	// Arguments is an array like object which contains all the arguments of log(). 
	// To push all the arguments of log() in array, we have to use apply().
	function log() {
	  var array = ['Message from server:'];
	  array.push.apply(array, arguments);
	  socket.emit('log', array);
	}
  
    
    //Defining Socket Connections
    socket.on('message', function(message, room) {
	  log('Client said: ', message);
	  // for a real app, would be room-only (not broadcast)
	  socket.in(room).emit('message', message, room);
	});
  
	socket.on('create or join', function(room) {
	  log('Received request to create or join room ' + room);
  
	  var clientsInRoom = io.sockets.adapter.rooms[room];
	  var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
	  log('Room ' + room + ' now has ' + numClients + ' client(s)');
  
	  if (numClients === 0) {
		socket.join(room);
		log('Client ID ' + socket.id + ' created room ' + room);
		socket.emit('created', room, socket.id);
  
	  } else if (numClients === 1) {
		log('Client ID ' + socket.id + ' joined room ' + room);
		io.sockets.in(room).emit('join', room);
		socket.join(room);
		socket.emit('joined', room, socket.id);
		io.sockets.in(room).emit('ready');
	  } else { // max two clients
		socket.emit('full', room);
	  }
	});
  
	socket.on('ipaddr', function() {
	  var ifaces = os.networkInterfaces();
	  for (var dev in ifaces) {
		ifaces[dev].forEach(function(details) {
		  if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
			socket.emit('ipaddr', details.address);
		  }
		});
	  }
	});
  
	socket.on('bye', function(){
	  console.log('received bye');
	});
  
  });