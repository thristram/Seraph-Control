
var net = require('net');
var dgram = require('dgram');
var path = require('path');


var debug = require('debug')('TCPClient');


//////////////////////////////////////
      //TCP Clients Variables//
//////////////////////////////////////
var TCPClients = {};
var approvedSS = {};

//////////////////////////////////////
   //Interface Specific Variables//
//////////////////////////////////////
var SSInfos = [];





//////////////////////////////////////
         //REQUIRE MODULE//
//////////////////////////////////////

var config = require("../../config.js");
var public = require("./public.js");
var constructMessage = require ("./constructMessage.js")
var parseMessage = require ("./parseMessage.js");
var SQLAction =  require ("./SQLAction.js");
var webAction = require("./webAction.js");
var smartConnect = require("./smartConnect.js");
var UDP = require("./UDP.js");
var HTTPServer = require("./HTTPServer.js");
var AES = require("./AES.js");
var constructSIDPMessage = require("./Construct/constructSIDPMessage.js");
var constructSICPMessage = require("./Construct/constructSICPMessage.js");
var ParseHardwareMessage = require("./Parse/parseHardwareMessage.js");
var homeKit;
var processIncomming = require("./processReturn.js");

var SIDP_APIs = require("./SIDP.js");
var SICP_APIs = require("./SICP.js");
var SSPB_APIs = require("./SSP-B.js");
var TEST_APIs = require("./TEST_API.js");
var preloadData = require("./preloadData.js");
var rotationalCheck = require("./rotationalCheck.js");

//////////////////////////////////////
            //HomeKit//
//////////////////////////////////////

//var homeKit = require("hap-nodejs");
var queueing = false;
var commandQueue = {};
var commandQueueResult = {}
var queueingTime = 1000;

//////////////////////////////////////
         //TEMPERATELY//
//////////////////////////////////////


var SCIPStartHeartBeats = true;




/************************************/

		    //PRELOAD//

/************************************/


var createAllClients = function(){
    SQLAction.SQLConnection.run('UPDATE seraph_device SET cStatus = 0 WHERE type="SS"');


    var sql = "SELECT * FROM seraph_device WHERE type='SS' AND IPAddress != '' AND IPAddress IS NOT NULL";

    SQLAction.SQLConnection.all(sql, function(err, res) {
        res.forEach(function (value) {
            var tempTCPClient = value;

            if(value.isServer == 1){

                tempTCPClient.reConnecting = false;
                tempTCPClient.isClient = false;
                TCPClients[value.deviceID] = tempTCPClient;



                var timeout = 3000;
                if(tempTCPClient.IPAddress != "127.0.0.1"){
                    debug("[%s] Rotational Check Initiated for Client: " + tempTCPClient.IPAddress, public.getDateTime());
                    setInterval(function(){
                        if(TCPClients[value.deviceID].cStatus == 1) {
                            SSPB_APIs.sspbDeviceStatus(TCPClients[value.deviceID]);
                            setTimeout(function () {
                                SSPB_APIs.sspbDataSync(TCPClients[value.deviceID]);
                            }, 1000);
                        }
                    },timeout);

                }


            }   else    {
                tempTCPClient.TCPClient = new net.Socket();
                tempTCPClient.reConnecting = false;
                tempTCPClient.isClient = true;
                TCPClients[value.deviceID] = tempTCPClient;
                SSInfos.push(TCPClients[value.deviceID]);
                TCPConnect(value.deviceID);
                TCPHandle(value.deviceID);


            }

        });

    });
    //constructReturnMessage(3,5000,"0x2000001","Operation Complete.",null)
    //constructRequestMessage(0,2,3,"/alarm/sepid/SS18098723/lv/1")
}


var destroyAllClients = function(){

    for(var value in TCPClients){
        if(value.isServer != 1) {
            if(TCPClients[value].TCPClient){
                TCPClients[value].TCPClient.end();
                TCPClients[value].TCPClient.destroy();
                TCPClients[value].TCPClient.removeAllListeners();
            }

            public.eventLog(TCPClients[value].deviceID + "@" + TCPClients[value].IPAddress + " is Destroyed.",'TCP Client');
            delete TCPClients[value];

        }
    }

    SSInfos = [];
}
var destroyConnectedClients = function(SSDeviceID){

    if(TCPClients[SSDeviceID].TCPClient){
        TCPClients[SSDeviceID].TCPClient.end();
        TCPClients[SSDeviceID].TCPClient.destroy();
        TCPClients[SSDeviceID].TCPClient.removeAllListeners();
        public.eventLog(TCPClients[SSDeviceID].deviceID + "@" + TCPClients[SSDeviceID].IPAddress + " was Kicked out by Server.",'TCP Server')
    }

    public.eventLog(TCPClients[SSDeviceID].deviceID + "@" + TCPClients[SSDeviceID].IPAddress + " was Removed from Connection List.",'TCP Server');
    delete TCPClients[SSDeviceID];

}

webAction.getLocalIP(function(localIP){
    //UDP.broadCastingServerAddress(localIP);
    //public.eventLog(localIP);
});
createAllClients();
webAction.refreshAll(function(){});



setInterval(function(){
    /*
    if(SCIPStartHeartBeats){
        SICP_APIs.SICPHeartBeat();
    }
    */
},5000);





//////////////////////////////////////
            //HomeKit//
//////////////////////////////////////

preloadData.loadHomeKitData(function(){
    homeKit = require("../HomeKit/BridgedCore.js");
})

/************************************/

		   //TCP Client//

/************************************/

//TCP Client
function TCPConnect(SSConnection){
    public.eventLog('Connecting to Seraph Sense TCP Server: ' + TCPClients[SSConnection].IPAddress + ":" + config.TCPort + "..." , "TCP Client");
    TCPClients[SSConnection].TCPClient.connect(config.TCPort, TCPClients[SSConnection].IPAddress, function() {
	   public.eventLog('Connected to Seraph Sense TCP Server: ' + TCPClients[SSConnection].IPAddress + ":" + config.TCPort, "TCP Client");

	   var sql = 'UPDATE seraph_device SET cStatus = 1 WHERE deviceID="'+ TCPClients[SSConnection].deviceID + '" AND type="SS"';
	   SQLAction.SQLConnection.run(sql);
        TCPClients[SSConnection].reConnecting = false
	});
}

function TCPReconnect(SSConnection){
    TCPClients[SSConnection].reConnecting = true;
    public.eventError('[' + public.getDateTime() + '] ' + 'Attempting to reconnect Seraph Sense TCP Server: ' + TCPClients[SSConnection].IPAddress + ":" + config.TCPort, "TCP Client");

    setTimeout(function () {
        if(!TCPClients[SSConnection].destroyed){
            TCPConnect(SSConnection);
            TCPClients[SSConnection].reConnecting = false
        }
    }, 3000)

}



/************************************/

		//TCP Client Reply//

/************************************/
function TCPHandle(SSConnection){
    TCPClients[SSConnection].TCPClient.on('data', function (data) {
        public.eventLog('Connection Received Data From '+TCPClients[SSConnection].IPAddress+': ' + public.bufferString(new Buffer(data)) , "TCP Client");
		handleTCPReply(data, TCPClients[SSConnection].TCPClient.IPAddress);
		//broadcast(socket.name + "> " + data, socket);
	});

    TCPClients[SSConnection].TCPClient.on('error', function(error) {

        public.eventError('Failed to connect to Seraph Sense: ' + TCPClients[SSConnection].IPAddress + ":" + config.TCPort, "TCP Client");
        var sql = 'UPDATE seraph_device SET cStatus = 0 WHERE deviceID="'+ TCPClients[SSConnection].deviceID + '" AND type="SS"';
        SQLAction.SQLConnection.run(sql);

        if(!TCPClients[SSConnection].reConnecting){
        	TCPReconnect(SSConnection)
        }
		//webSocket.emit('error', error);
		//client.close();
	});
    TCPClients[SSConnection].TCPClient.on('close', function() {

        public.eventError('Connection Closed: ' + TCPClients[SSConnection].IPAddress + ":" + config.TCPort, "TCP Client");
        var sql = 'UPDATE seraph_device SET cStatus = 0 WHERE deviceID="'+ TCPClients[SSConnection].deviceID + '" AND type="SS"';
        SQLAction.SQLConnection.run(sql);
        if(!TCPClients[SSConnection].reConnecting){
            TCPReconnect(SSConnection)
        }


    });

}

/************************************/

       //TCP Handle Reply//

/************************************/

function handleTCPReply(data, remoteAddress){
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
    var tempTCPClient;
    public.eventLog('New Client Connection From: '+ remoteAddress,"TCP Server");

    authTCPClients(con,function(data){
        tempTCPClient = data;
        if(tempTCPClient){

            tempTCPClient.TCPClient = con;

            public.eventLog('Connection From: '+ remoteAddress + " is Registered","TCP Server");
            tempTCPClient.reConnecting = false;
            tempTCPClient.isClient = false;
            TCPClients[tempTCPClient.deviceID] = tempTCPClient;
            TCPClients[tempTCPClient.deviceID].cStatus = 1;

            con.setKeepAlive(true,1000); //1 min = 60000 milliseconds.
            con.on('data', onConData);
            con.once('close', onConClose);
            con.on('error', onConError);


        }   else    {
            con.end();
            con.destroy();
        }
    });





    function onConData(data) {
        public.eventLog('Connection Received Data From '+remoteAddress+': ' + public.bufferString(new Buffer(data))  , "TCP Server");
        handleTCPReply(data, remoteAddress);
        //con.write(d);
    }

    function onConClose() {
        public.eventLog('Connection From '+remoteAddress+' Closed' , "TCP Server");
        SQLAction.SQLSetField("seraph_device",{cStatus:0},"type = 'SS' AND IPAddress = '" + con.remoteAddress + "'" , "TCP Server");
        TCPClients[tempTCPClient.deviceID].cStatus = 0;
        con.end();
        con.destroy();

    }

    function onConError(err) {
        public.eventLog('Connection '+remoteAddress+' Error: ' +  err.message , "TCP Server");
    }
}

function authTCPClients(con,callback){

    SQLAction.SQLFind("seraph_device","*",{type:'SS',IPAddress:con.remoteAddress},function(data){



       if(data.length !== 0){
           SQLAction.SQLSetField("seraph_device",{cStatus:1},{type:"SS",IPAddress:con.remoteAddress});
           callback(data);
       }    else    {
           var data = {
               "deviceID"      : "SS"+ Math.random().toString(36).substring(3,9).toUpperCase(),
               "type"          : "SS",
               "model"         : 1,
               "isMaster"      : 0,
               "IPAddress"     : con.remoteAddress,
               "macBLE"        : "39:10:9f:e4:ca:13",
               "status"        : 0,
               "cStatus"       : 1,
               "isServer"      : 1

           };
           SQLAction.SQLAdd("seraph_device",data);

           callback(data);
       }
    });


}

var TCPSocketWrite = function(SSDevice, msg, command, options){
    SSPB_APIs.recordCommandData(options);
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
        SSDevice = TCPClients[SSDeviceID]
    }   else    {
        SSDevice = SSDeviceID;
    }
    if(SSDevice.isServer == 1){

        if(SSDevice.TCPClient){
            SSDevice.TCPClient.write(msg);
        }   else    {
            public.eventTitle("DEVICE NOT CONNECTED",2,"SSP-A Request",true);

        }
    }   else    {
        SSDevice.TCPClient.write(msg);
    }
}


function processQueue(){

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





module.exports.TCPClients = TCPClients
module.exports.TCPSocketWrite = TCPSocketWrite;
module.exports.destroyAllClients = destroyAllClients;
module.exports.destroyConnectedClients = destroyConnectedClients;
module.exports.createAllClients = createAllClients;
module.exports.SSInfos =  SSInfos;

