var http = require('http');
var net = require('net');

//var wpi = require('wiring-pi');



//////////////////////////////////////
		//REQUIRE MODULE//
//////////////////////////////////////


var config = require("../../config.js");
var public = require("./public.js");
var parseMessage = require ("./parseMessage.js");


//var uart = wpi.serialOpen(config.UARTConfig.device, config.UARTConfig.bitRate)

var serverSocket;


/************************************/

		  //TCP Server//

/************************************/


net.createServer(function(socket) {
	// new connection
	console.log("Server listening on: http://localhost:%s", config.TCPort);
    serverSocket = socket;
	socket.on('data', function(data) {
		//console.log('got:', data.toString());
        //wpi.serialPuts(uart, data);
		var msg = data.toString();
		console.log(data);
		parseMessage.parseMessage(data,false);
		
		
	});
	socket.on('end', function(data) {
		// connection closed
	});




}).listen(config.TCPort);


