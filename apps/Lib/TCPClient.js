
var net = require('net');
var debug = require('debug')('TCPClient');



//////////////////////////////////////
         //REQUIRE MODULE//
//////////////////////////////////////


var config = require("../../config.js");
var publicMethods = require("./public.js");
var SSPB_APIs = require("./SSP-B.js");
var Seraph = require("./CoreData.js");
var parseMessage = require ("./parseMessage.js");

var ParseHardwareMessage = require("./Parse/parseHardwareMessage.js");
var ParseSIAPMessage = require("./Parse/parseSIAPMessage.js");
var processIncomming = require("./processReturn.js");

var HTTPServer = require("./HTTPServer.js");



//////////////////////////////////////
        //HomeKit//
//////////////////////////////////////



//////////////////////////////////////
            //HomeKit//
//////////////////////////////////////


var queueing = false;
var commandQueue = {};
var commandQueueResult = {};
var queueingTime = 1000;



/************************************/

		    //PRELOAD//

/************************************/



var destroyAllClients = function(){

    for(var key in Seraph.devices.getDeviceList(["SS"])){
        let SSDeviceID = Seraph.devices.getDeviceList(["SS"])[key]
        destroyConnectedClients(SSDeviceID)
    }

}
var destroyConnectedClients = function(SSDeviceID){

    let SSDevice = Seraph.devices.getDevice(SSDeviceID);
    if(SSDevice.TCPSocket != {}){
        SSDevice.TCPSocket.end();
        SSDevice.TCPSocket.destroy();
        SSDevice.TCPSocket.removeAllListeners();
        debug(SSDevice.deviceID + "@" + SSDevice.IPAddress + " was Kicked out by Server.",'TCP Server')
    }

    debug(SSDevice.deviceID + "@" + SSDevice.IPAddress + " was Removed from Connection List.",'TCP Server');
    SSDevice.TCPSocket = {};

}







/************************************/

		   //TCP Client//

/************************************/

//TCP Client
var TCPConnect2Server = function(SSConnection){
    let SSDevice = Seraph.devices.getDevice(SSConnection);
    debug('Connecting to Seraph Sense TCP Server: ' + SSDevice.IPAddress + ":" + config.TCPort + "..." , "TCP Client");
    SSDevice.TCPSocket.connect(config.TCPort, SSDevice.IPAddress, function() {
	   debug('Connected to Seraph Sense TCP Server: ' + Seraph.devices.getDevice(SSConnection).IPAddress + ":" + config.TCPort, "TCP Client");
	   Seraph.devices.getDevice(SSConnection).setTCPConnectionStatus(true);
	   Seraph.devices.getDevice(SSConnection).reConnecting = false
	});
}

var TCPReconnect2Server = function(SSConnection){
    let SSDevice = Seraph.devices.getDevice(SSConnection)
    SSDevice.reConnecting = true;
    publicMethods.eventError('[' + publicMethods.getDateTime() + '] ' + 'Attempting to reconnect Seraph Sense TCP Server: ' + SSDevice.IPAddress + ":" + config.TCPort, "TCP Client");

    setTimeout(function () {
        if(!SSDevice.TCPSocket.destroyed){
            TCPConnect2Server(SSConnection);
            SSDevice.reConnecting = false
        }
    }, 3000)

}



/************************************/

		//TCP Client Reply//

/************************************/
var TCPHandleFromServer = function(SSConnection){
    Seraph.devices.getDevice(SSConnection).TCPSocket.on('data', function (data) {
        let SSDevice = Seraph.devices.getDevice(SSConnection);
        //debug('Connection Received Data From '+ SSDevice.IPAddress+': ' + public.bufferString(new Buffer(data)) , "TCP Client");
		handleTCPReply(data, SSDevice.IPAddress);
		//broadcast(socket.name + "> " + data, socket);
	});

    Seraph.devices.getDevice(SSConnection).TCPSocket.on('error', function(error) {
        let SSDevice = Seraph.devices.getDevice(SSConnection);
        publicMethods.eventError('Failed to connect to Seraph Sense: ' + SSDevice.IPAddress + ":" + config.TCPort, "TCP Client");
        Seraph.devices.getDevice(SSConnection).setTCPConnectionStatus(false);

        if(!SSDevice.reConnecting){
            TCPReconnect2Server(SSConnection)
        }
		//webSocket.emit('error', error);
		//client.close();
	});
    Seraph.devices.getDevice(SSConnection).TCPSocket.on('close', function() {
        let SSDevice = Seraph.devices.getDevice(SSConnection);
        publicMethods.eventError('Connection Closed: ' + SSDevice.IPAddress + ":" + config.TCPort, "TCP Client");
        Seraph.devices.getDevice(SSConnection).setTCPConnectionStatus(false)
        if(!Seraph.devices.getDevice(SSConnection).reConnecting){
            TCPReconnect2Server(SSConnection)
        }


    });

}

/************************************/

       //TCP Handle Reply//

/************************************/
var TCPBuffer = "";
var handleTCPReply = function(data, remoteAddress, con){
    /*
    tempIncommingData.push(parseMessage.parseMessage(constructReturnMessage(2,5000,"0x2000001","Operation Complete.",null),false))
    */

    var supportedSICPHeader = ["EEEE","EEAA","DDDD","DDAA"];
    var supportedSIDPHeader = ["7E","E7"];
	var supportedSIAPHeader = ["BBBBBBFFFF"];

    var frameHeaderSIDP = data.slice(0,1).toString('hex').toUpperCase();
    var frameHeaderSICP = data.slice(0,2).toString('hex').toUpperCase();
	var frameHeaderSIAP = data.slice(0,5).toString('hex').toUpperCase();


    if(supportedSICPHeader.indexOf(frameHeaderSICP) >= 0){
        incommingMessageData = ParseHardwareMessage.parseMessage(data);
    }   else if (supportedSIDPHeader.indexOf(frameHeaderSIDP) >= 0){
        incommingMessageData = ParseHardwareMessage.parseMessage(data);
    }   else if (supportedSIAPHeader.indexOf(frameHeaderSIAP) >= 0){
	    var bufStr = data.toString('hex').toUpperCase();
	    bufStr = bufStr.substring(Seraph.sysConfigs.SICP.header.length, bufStr.length - Seraph.sysConfigs.SICP.footer.length);
		if(ParseSIAPMessage.checkValid(bufStr)){
			let parsedData = ParseSIAPMessage.parseMessage(bufStr);
			processIncomming.processSIAPIncomming(parsedData, remoteAddress);
		}
    }   else    {
        var correctData = data;
        var bufStr = data.toString('hex').toUpperCase();


        if(bufStr.substr(bufStr.length - Seraph.sysConfigs.SICP.footer.length) !== Seraph.sysConfigs.SICP.footer) {
	        TCPBuffer += bufStr;
        }   else    {
	        bufStr = TCPBuffer + bufStr;
	        TCPBuffer = "";
	        var separateCommands = bufStr.split(Seraph.sysConfigs.SICP.footer);
	        for(var key in separateCommands){
		        if(separateCommands[key] !== ''){
			        if(separateCommands[key].substring(0,Seraph.sysConfigs.SICP.header.length) === Seraph.sysConfigs.SICP.header){
				        separateCommands[key] = separateCommands[key].substr(Seraph.sysConfigs.SICP.header.length);
			        }
			        var singleData = new Buffer(separateCommands[key],"hex");

			        var headerRL = parseMessage.parseFixedHeaderRL(singleData);

			        var parsedTotalLength = headerRL.byte + 1 + headerRL.message;
			        var incommingMessageData;


			        if(parsedTotalLength !== singleData.length){
				        incommingMessageData = {
					        "code"      :   "0x505001",
					        "msg"       :   "Protocol NOT Supported!",
					        "raw"       :   singleData.toString(),
					        "raw Hex"   :   publicMethods.bufferString(singleData),
					        "message"   :   "Total Length: " + singleData.length + "\n" + "Parsed Total Length: " + parsedTotalLength,
					        "correct Data" : publicMethods.bufferString(correctData)
				        };
				        debug("Protocol NOT Supported! Total Length: " + singleData.length + " Parsed Total Length: " + parsedTotalLength)
				        debug(publicMethods.bufferString(singleData))
			        }   else    {

				        incommingMessageData = parseMessage.parseMessage(singleData,false);
				        incommingMessageData.remoteAddress = remoteAddress;
				        processIncomming.processSSPBIncomming(incommingMessageData, remoteAddress, con);
			        }
		        }

	        }
	        //TEST_APIs.tempIncommingData.push(incommingMessageData);
	        if(incommingMessageData.isRequest){
		        var msg = SSPB_APIs.constructReturnMessage(2,incommingMessageData.messageID,"0x2000001","Operation Complete.",null);
		        //TCPSocketWrite(SSDevice,msg);
	        }	else	{

	        }
        }
    }
}


/************************************/

           //TCP Server//

/************************************/

var server = net.createServer();
server.on('connection', handleConnection);
server.listen(config.TCPort,"0.0.0.0",function() {
    // debug('Seraph eSH TCP Server Listening to ' + JSON.stringify(server.address())  , "TCP Server");
    debug('Seraph eSH TCP Server Listening to ' + JSON.stringify(server.address()));
});


function handleConnection(con) {
    var remoteAddress = con.remoteAddress;
    // debug('New Client Connection From: '+ remoteAddress,"TCP Server");
	debug('New Client Connection From: '+ remoteAddress,"TCP Server");

    con.setKeepAlive(true,1000); //1 min = 60000 milliseconds.
    con.on('data', onConData);
    con.once('close', onConClose);
    con.on('error', onConError);
    authTCPClients(con);
    Seraph.TCPConnection.tempConnection[con.remoteAddress] = con;

    function onConData(data) {
        //debug('Connection Received Data From '+remoteAddress+': ' + public.bufferString(new Buffer(data))  , "TCP Server");
        handleTCPReply(data, remoteAddress, con);
        //con.write(d);
    }

    function onConClose() {
        // debug('Connection From ' + remoteAddress + ' Closed' , "TCP Server");
        debug('Connection From ' + remoteAddress + ' Closed');
        let SSDevice = Seraph.devices.getDeviceByIP(con.remoteAddress);
        if (SSDevice){
            SSDevice.setTCPConnectionStatus(false);
        }
        con.end();
        con.destroy();

    }

    function onConError(err) {
        // debug('Connection ' + remoteAddress + ' Error: ' +  err.message , "TCP Server");
	    debug('Connection ' + remoteAddress + ' Error: ' +  err.message);
    }
}

function authTCPClients(con){
    if(con.remoteAddress !== "127.0.0.1"){
        let device = Seraph.devices.getDeviceByIP(con.remoteAddress);
        if(device){
            device.initTCPSocket(con);
            device.setTCPConnectionStatus(true);
            device.initSSConfig();
            delete(Seraph.TCPConnection.tempConnection[con.remoteAddress]);
            debug('Connection From: '+ con.remoteAddress + " is Registered");
            // debug('Connection From: '+ con.remoteAddress + " is Registered","TCP Server");
        }
        // console.log(SSPB_APIs)
        SSPB_APIs.sspbDeviceInfoSSGet(con)
    }
}

var TCPSocketWrite = function(SSDeviceID, msg, command, options){
    Seraph.recordSSPBCommands(options);
	let dataToWrite = Buffer.concat([new Buffer(Seraph.sysConfigs.SICP.header,'hex'), msg, new Buffer(Seraph.sysConfigs.SICP.footer,'hex')]);
	if(SSDeviceID && typeof(SSDeviceID) === "string"){
		let SSDevice = Seraph.devices.getDevice(SSDeviceID);
		if(SSDevice){
			if(SSDevice.deviceStatus.updatePeriod === 0){
				TCPWrite(SSDeviceID, dataToWrite);
			}   else if(options && options.protocolType === "SIAP")    {
				TCPWrite(SSDeviceID, dataToWrite);
			}   else    {
				debug("Communication Blocked Due to on going System Update...");
			}
		}   else    {
			TCPWrite(SSDeviceID, dataToWrite);
		}
	}   else    {
		TCPWrite(SSDeviceID, dataToWrite);
	}


};
let TCPSocketBuf = {};
var TCPWrite = function(SSDeviceID, dataToWrite){

	if(typeof(SSDeviceID) === "string"){
		if(!TCPSocketBuf.hasOwnProperty(SSDeviceID)){
			TCPSocketBuf[SSDeviceID] = [];
		}
		if(dataToWrite.length <= 1024){
			TCPSocketBuf[SSDeviceID].push(dataToWrite);
		}   else    {
			let dataString = dataToWrite.toString("hex");
			for(let i = 0; i < dataString.length; i = i + 2048){
				var tempBuf = dataString.substr(i, 2048);
				TCPSocketBuf[SSDeviceID].push(new Buffer(tempBuf, "hex"));
			}
		}
		TCPFlush(SSDeviceID);


	}   else    {
		TCPSend(SSDeviceID, dataToWrite);
	}
};

var TCPFlush = function(SSDeviceID){
	if(TCPSocketBuf[SSDeviceID].length > 0){
		let SSDevice = Seraph.devices.getDevice(SSDeviceID);
		if(SSDevice){
			let SSTCPSocket = SSDevice.TCPSocket;
			if(SSTCPSocket){
				TCPSend(SSTCPSocket, TCPSocketBuf[SSDeviceID][0]);
				TCPSocketBuf[SSDeviceID].shift();
				if(TCPSocketBuf[SSDeviceID].length > 0){
					setTimeout(function () {
						TCPFlush(SSDeviceID);
					}, 100)
				}
			}

		}   else    {
			debug("DEVICE NOT CONNECTED");
		}
	}


};
var TCPSend = function(con, dataToWrite){
	con.write(dataToWrite, function(data){
		// debug(dataToWrite.toString("hex").toUpperCase())
		debug("Message Sent Confirmed");
	});
};

var processQueue = function(){

    var QETemp = {};

    //Keep the last command

    for(var key in commandQueue){
        if(commandQueue[key].command = "/qe"){
            switch(commandQueue[key].options.action){
                case "WP":
                case "DM":
                    var tempPropName = commandQueue[key].options.sepid + "_" +  commandQueue[key].options.MD + "_" + commandQueue[key].options.CH + "_" + commandQueue[key].options.action + "_" + commandQueue[key].options.topos
                    QETemp[tempPropName] = commandQueue[key];
                    break;
                default:
                    commandQueueResult[key] = commandQueue[key]
                    break;
            }
        }   else    {
            commandQueueResult[key] = commandQueue[key]
        }

    }
    for(var key in QETemp){
        commandQueueResult[QETemp.options.hash] = QETemp[key]
    }

}

var testTCP = function(data, address){
	handleTCPReply(new Buffer( data, "hex"), address);
}

module.exports.TCPReconnect2Server = TCPReconnect2Server;
module.exports.TCPConnect2Server = TCPConnect2Server;
module.exports.TCPHandleFromServer = TCPHandleFromServer;
module.exports.TCPSocketWrite = TCPSocketWrite;
module.exports.TCPWrite = TCPWrite;
module.exports.destroyAllClients = destroyAllClients;
module.exports.destroyConnectedClients = destroyConnectedClients;
module.exports.testTCP = testTCP;


