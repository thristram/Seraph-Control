
var net = require('net');
var debug = require('debug')('TCPClient');



//////////////////////////////////////
         //REQUIRE MODULE//
//////////////////////////////////////

var config = require("../../config.js");
var public = require("./public.js");
var CoreData = require("./CoreData.js");
var parseMessage = require ("./parseMessage.js");

var ParseHardwareMessage = require("./Parse/parseHardwareMessage.js");
var processIncomming = require("./processReturn.js");
var SSPB_APIs = require("./SSP-B.js");
var HTTPServer = require("./HTTPServer.js")



//////////////////////////////////////
        //HomeKit//
//////////////////////////////////////



//////////////////////////////////////
            //HomeKit//
//////////////////////////////////////


var queueing = false;
var commandQueue = {};
var commandQueueResult = {}
var queueingTime = 1000;



/************************************/

		    //PRELOAD//

/************************************/



var destroyAllClients = function(){

    for(var key in CoreData.Seraph.getDeviceList(["SS"])){
        let SSDeviceID = CoreData.Seraph.getDeviceList(["SS"])[key]
        destroyConnectedClients(SSDeviceID)
    }

}
var destroyConnectedClients = function(SSDeviceID){

    let SSDevice = CoreData.Seraph.getDevice(SSDeviceID);
    if(SSDevice.TCPSocket != {}){
        SSDevice.TCPSocket.end();
        SSDevice.TCPSocket.destroy();
        SSDevice.TCPSocket.removeAllListeners();
        public.eventLog(SSDevice.deviceID + "@" + SSDevice.IPAddress + " was Kicked out by Server.",'TCP Server')
    }

    public.eventLog(SSDevice.deviceID + "@" + SSDevice.IPAddress + " was Removed from Connection List.",'TCP Server');
    SSDevice.TCPSocket = {};

}







/************************************/

		   //TCP Client//

/************************************/

//TCP Client
var TCPConnect2Server = function(SSConnection){
    let SSDevice = CoreData.Seraph.getDevice(SSConnection);
    public.eventLog('Connecting to Seraph Sense TCP Server: ' + SSDevice.IPAddress + ":" + config.TCPort + "..." , "TCP Client");
    SSDevice.TCPSocket.connect(config.TCPort, SSDevice.IPAddress, function() {
	   public.eventLog('Connected to Seraph Sense TCP Server: ' + CoreData.Seraph.getDevice(SSConnection).IPAddress + ":" + config.TCPort, "TCP Client");
	   CoreData.Seraph.getDevice(SSConnection).setTCPConnectionStauts(true);
	   CoreData.Seraph.getDevice(SSConnection).reConnecting = false
	});
}

var TCPReconnect2Server = function(SSConnection){
    let SSDevice = CoreData.Seraph.getDevice(SSConnection)
    SSDevice.reConnecting = true;
    public.eventError('[' + public.getDateTime() + '] ' + 'Attempting to reconnect Seraph Sense TCP Server: ' + SSDevice.IPAddress + ":" + config.TCPort, "TCP Client");

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
    CoreData.Seraph.getDevice(SSConnection).TCPSocket.on('data', function (data) {
        let SSDevice = CoreData.Seraph.getDevice(SSConnection);
        public.eventLog('Connection Received Data From '+ SSDevice.IPAddress+': ' + public.bufferString(new Buffer(data)) , "TCP Client");
		handleTCPReply(data, SSDevice.IPAddress);
		//broadcast(socket.name + "> " + data, socket);
	});

    CoreData.Seraph.getDevice(SSConnection).TCPSocket.on('error', function(error) {
        let SSDevice = CoreData.Seraph.getDevice(SSConnection);
        public.eventError('Failed to connect to Seraph Sense: ' + SSDevice.IPAddress + ":" + config.TCPort, "TCP Client");
        CoreData.Seraph.getDevice(SSConnection).setTCPConnectionStauts(false)

        if(!SSDevice.reConnecting){
            TCPReconnect2Server(SSConnection)
        }
		//webSocket.emit('error', error);
		//client.close();
	});
    CoreData.Seraph.getDevice(SSConnection).TCPSocket.on('close', function() {
        let SSDevice = CoreData.Seraph.getDevice(SSConnection);
        public.eventError('Connection Closed: ' + SSDevice.IPAddress + ":" + config.TCPort, "TCP Client");
        CoreData.Seraph.getDevice(SSConnection).setTCPConnectionStauts(false)
        if(!CoreData.Seraph.getDevice(SSConnection).reConnecting){
            TCPReconnect2Server(SSConnection)
        }


    });

}

/************************************/

       //TCP Handle Reply//

/************************************/

var handleTCPReply = function(data, remoteAddress){
    /*
    tempIncommingData.push(parseMessage.parseMessage(constructReturnMessage(2,5000,"0x2000001","Operation Complete.",null),false))
    */
    var supportedSICPHeader = ["EEEE","EEAA","DDDD","DDAA"];
    var supportedSIDPHeader = ["7E","E7"]

    var frameHeaderSIDP = data.slice(0,1).toString('hex').toUpperCase();
    var frameHeaderSICP = data.slice(0,2).toString('hex').toUpperCase();



    if(supportedSICPHeader.indexOf(frameHeaderSICP) >= 0){
        incommingMessageData = ParseHardwareMessage.parseMessage(data);
    }   else if (supportedSIDPHeader.indexOf(frameHeaderSIDP) >= 0){
        incommingMessageData = ParseHardwareMessage.parseMessage(data);
    }   else    {


        var correctData = data;


        var bufStr = data.toString('hex').toUpperCase();
        var separateCommands = bufStr.split("0A0A");
        for(var key in separateCommands){
            if(separateCommands[key] != ''){
            var singleData = new Buffer(separateCommands[key],"hex");

                var headerRL = parseMessage.parseFixedHeaderRL(singleData);
                var parsedTotalLength = headerRL.byte + 1 + headerRL.message;
                var incommingMessageData;

                console.log("Total Length: " + singleData.length);
                console.log("Parsed Total Length: " + parsedTotalLength);

                if(parsedTotalLength != singleData.length){
                    incommingMessageData = {
                        "code"      :   "0x505001",
                        "msg"       :   "Protocol NOT Supported!",
                        "raw"       :   singleData.toString(),
                        "raw Hex"   :   public.bufferString(singleData),
                        "message"   :   "Total Length: " + singleData.length + "\n" + "Parsed Total Length: " + parsedTotalLength,
                        "correct Data" : public.bufferString(correctData)
                    }
                }   else    {
                    incommingMessageData = parseMessage.parseMessage(singleData,false);
                    incommingMessageData.remoteAddress = remoteAddress;
                    processIncomming.processSSPBIncomming(incommingMessageData);
                }
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


/************************************/

           //TCP Server//

/************************************/

var server = net.createServer();
server.on('connection', handleConnection);
server.listen(config.TCPort,"0.0.0.0",function() {
    public.eventLog('Seraph eSH TCP Server Listening to ' + JSON.stringify(server.address())  , "TCP Server");
});


function handleConnection(con) {
    var remoteAddress = con.remoteAddress;
    public.eventLog('New Client Connection From: '+ remoteAddress,"TCP Server");


    con.setKeepAlive(true,1000); //1 min = 60000 milliseconds.
    con.on('data', onConData);
    con.once('close', onConClose);
    con.on('error', onConError);
    authTCPClients(con);
    CoreData.tempTCPConnection[con.remoteAddress] = con;

    function onConData(data) {
        public.eventLog('Connection Received Data From '+remoteAddress+': ' + public.bufferString(new Buffer(data))  , "TCP Server");
        handleTCPReply(data, remoteAddress);
        //con.write(d);
    }

    function onConClose() {
        public.eventLog('Connection From ' + remoteAddress + ' Closed' , "TCP Server");
        CoreData.Seraph.getDeviceByIP(con.remoteAddress).setTCPConnectionStauts(false);
        con.end();
        con.destroy();

    }

    function onConError(err) {
        public.eventLog('Connection ' + remoteAddress + ' Error: ' +  err.message , "TCP Server");
    }
}

function authTCPClients(con){

    if(con.remoteAddress !== "127.0.0.1"){
        SSPB_APIs.sspbDeviceInfoSSGet(con);
    }

    public.eventLog('Connection From: '+ con.remoteAddress + " is Registered","TCP Server");


}

var TCPSocketWrite = function(SSDevice, msg, command, options){
    CoreData.Seraph.recordSSPBCommands(options);
    TCPWrite(SSDevice, msg);
    /*
    var queueItem = {
        "SSDevice"  :   SSDevice,
        "msg"       :   msg,
        "command"   :   command,
        "options"   :   options
    }


    commandQueue[options.hash] = queueItem;

    if(!queueing){

        queueing = true;
        setTimeout(function(){
            queueing =  false;
            processQueue();
            for(var i in commandQueueResult){
                TCPWrite(commandQueueResult[i].SSDevice, commandQueueResult[i].msg)
            }

        }, queueingTime)
    }
    */

}

var TCPWrite = function(SSDeviceID,msg){

    var SSDevice = {}

    if(typeof(SSDeviceID) == "string"){
        SSDevice = CoreData.Seraph.getDevice(SSDeviceID).TCPSocket
    }   else    {
        SSDevice = SSDeviceID.TCPClient;
    }
    if(SSDevice.isServer){

        if(SSDevice){
            SSDevice.write(msg);
        }   else    {
            public.eventTitle("DEVICE NOT CONNECTED",2,"SSP-A Request",true);

        }
    }   else    {
        SSDevice.write(msg);
    }
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



module.exports.TCPReconnect2Server = TCPReconnect2Server;
module.exports.TCPConnect2Server = TCPConnect2Server;
module.exports.TCPHandleFromServer = TCPHandleFromServer;
module.exports.TCPSocketWrite = TCPSocketWrite;
module.exports.destroyAllClients = destroyAllClients;
module.exports.destroyConnectedClients = destroyConnectedClients;



