var http = require('http');
var net = require('net');
var url = require('url');
var dgram = require('dgram');
var path = require('path');
var qs = require('querystring');




//////////////////////////////////////
     //TCP Server Variables//
//////////////////////////////////////

var serverSocket;
var UDPServer;


//////////////////////////////////////
      //TCP Clients Variables//
//////////////////////////////////////
var sysConfigs = {};
var TCPClients = {};
var approvedSS = {};

//////////////////////////////////////
   //Interface Specific Variables//
//////////////////////////////////////
var SSInfos = [];


//////////////////////////////////////
        //System Variables//
//////////////////////////////////////
var isSmartConnecting = false;
var isBroadcastingServerIP = false;
var isSecuredSmartConnecting = false;
var securedSmartConnectMac = "";
var defaultMeshID = "8001";


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
var AES = require("./AES.js");
var constructSIDPMessage = require("./Construct/constructSIDPMessage.js");
var constructSICPMessage = require("./Construct/constructSICPMessage.js");
var ParseHardwareMessage = require("./Parse/parseHardwareMessage.js");
var homeKit;
var processIncomming = require("./processReturn.js");
var SSPB_APIs = require("./SSP-B.js");
var SIDP_APIs = require("./SIDP.js");
var SICP_APIs = require("./SICP.js");

//////////////////////////////////////
            //HomeKit//
//////////////////////////////////////

//var homeKit = require("hap-nodejs");

//////////////////////////////////////
         //TEMPERATELY//
//////////////////////////////////////

var tempIncommingData = [];
var SCIPStartHeartBeats = true;
var checksumValue = "00";
var currentData = "";



/************************************/

		    //PRELOAD//

/************************************/


function createAllClients(){
    SQLAction.SQLConnection.run('UPDATE seraph_device SET cStatus = 0 WHERE type="SS"');


    var sql = "SELECT * FROM seraph_device WHERE type='SS' AND IPAddress != '' AND IPAddress IS NOT NULL";

    SQLAction.SQLConnection.all(sql, function(err, res) {
        res.forEach(function (value) {
            var tempTCPClient = value;

            if(value.isServer == 1){

                tempTCPClient.reConnecting = false;
                tempTCPClient.isClient = false;
                TCPClients[value.deviceID] = tempTCPClient;


            }   else    {
                tempTCPClient.TCPClient = new net.Socket();
                tempTCPClient.reConnecting = false;
                tempTCPClient.isClient = true;
                TCPClients[value.deviceID] = tempTCPClient;
                SSInfos.push(TCPClients[value.deviceID]);
                TCPConnect(value.deviceID);
                TCPHandle(value.deviceID)
            }

        });

    });
    //constructReturnMessage(3,5000,"0x2000001","Operation Complete.",null)
    //constructRequestMessage(0,2,3,"/alarm/sepid/SS18098723/lv/1")
}


function destroyAllClients(){

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
function destroyConnectedClients(SSDeviceID){

    if(TCPClients[SSDeviceID].TCPClient){
        TCPClients[SSDeviceID].TCPClient.end();
        TCPClients[SSDeviceID].TCPClient.destroy();
        TCPClients[SSDeviceID].TCPClient.removeAllListeners();
        public.eventLog(TCPClients[SSDeviceID].deviceID + "@" + TCPClients[SSDeviceID].IPAddress + " was Kicked out by Server.",'TCP Server')
    }

    public.eventLog(TCPClients[SSDeviceID].deviceID + "@" + TCPClients[SSDeviceID].IPAddress + " was Removed from Connection List.",'TCP Server');
    delete TCPClients[SSDeviceID];

}
function loadAddDataFromDB(){
    sysConfigs = {};
    var sql = "SELECT * FROM config";
    SQLAction.SQLConnection.all(sql, function(err, res) {
        res.forEach(function (value) {
            sysConfigs[value.name] = value.value;
        })
        createUDPServer();
        //public.eventLog(sysConfigs);
    });

}
webAction.getLocalIP(function(localIP){
    //UDP.broadCastingServerAddress(localIP);
    //public.eventLog(localIP);
});
loadAddDataFromDB();
createAllClients();
webAction.refreshAll(function(){});



setInterval(function(){
    if(SCIPStartHeartBeats){
        //SICP_APIs.SICPHeartBeat();
    }
},5000);

setTimeout(function(){
    homeKit = require("../HomeKit/BridgedCore.js");
},2000)


//////////////////////////////////////
            //HomeKit//
//////////////////////////////////////



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
		handleTCPReply(data);
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

function handleTCPReply(data){
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

        var headerRL = parseMessage.parseFixedHeaderRL(data);
        var parsedTotalLength = headerRL.byte + 3 + headerRL.message;
        var incommingMessageData;

        console.log("Total Length: " + data.length);
        console.log("Parsed Total Length: " + parsedTotalLength);

        if(parsedTotalLength != data.length){
            incommingMessageData = {
                "code"      :   "0x505001",
                "msg"       :   "Protocol NOT Supported!",
                "raw"       :   data.toString(),
                "raw Hex"   :   public.bufferString(data),
                "message"   :   "Total Length: " + data.length + "\n" + "Parsed Total Length: " + parsedTotalLength,
                "correct Data" : public.bufferString(correctData)
            }
        }   else    {
            incommingMessageData = parseMessage.parseMessage(data,false);
            processIncomming.processSSPBIncomming(incommingMessageData);
        }



    }
    tempIncommingData.push(incommingMessageData);
    if(incommingMessageData.isRequest){
        var msg = constructReturnMessage(2,incommingMessageData.messageID,"0x2000001","Operation Complete.",null);
        //TCPSocketWrite(SSDevice,msg);
    }	else	{

    }


}
/************************************/

            //UDP Server//

/************************************/




function createUDPServer(){
    var port = config.UDPPort;
    UDPServer = dgram.createSocket("udp4");
    UDPServer.bind(port,function () {
        UDPServer.setBroadcast(true);
    });
    UDPServer.on('listening', function () {
        var address = UDPServer.address();
        public.eventLog('UDP Server listening on ' + address.address + ":" + address.port,"UDP Server");
    });

    UDPServer.on('message', function (message, remote) {
        public.eventLog("Receiving Message from " + remote.address + ':' + remote.port +' - ' + public.bufferString(new Buffer(message)),"UDP Server");
        if(checkSICP(message,remote)){
            parseSCIP(message,remote);
        }
    });
    smartConnect.startBroadcastingServerIP(UDPServer);

}

function parseSCIP(message,remote){
    var type = message.readInt8(4);
    var content = message.slice(5,message.length);
    switch(type){
        case 3:
            sicpSmartConnectUDPReply(content,remote);
            break;
        default:
            break;
    }
}
function checkSICP(message,remote){
    var SICPIdentifier = new Buffer("aa", 'hex');

    if(message[0] == 170 && message[1] == 170){
        var messageLength = message.readInt8(2) * 128 + message.readInt8(3) + 4;

        if(message.length == messageLength){
            return true;
        }   else    {
            public.eventError("SICP Message Length Error","UDP Server");
            return false;
        }
    }   else    {
        public.eventError("SICP Not Supported","UDP Server");
        return false
    }
}
function sicpSmartConnectUDPReply(message,remote){
    var idKey = message.slice(1,message.length).toString('hex');
    public.eventLog("Parsed ID Key: " + idKey,"Smart Connect Status");
    if(typeof approvedSS[remote.address] === "undefined"){
        public.eventLog("New TCP Client Connection is Approved, IDKey: " + idKey + ", IP Address: " + remote.address ,"Smart Connect Status");
    }

    approvedSS[remote.address] = idKey;


    if(message){
        var code = message.readInt8(0);
        switch (code){
            case 0:
                public.eventLog("New TCP Server Connected","Smart Connect Status");break;
            case 1:
                public.eventLog("Dropped from Current TCP Server, New TCP Server Connected","Smart Connect Status");break;
            case 2:
                public.eventLog("Keep Current Connection","Smart Connect Status");break;
            case 3:
                public.eventError("Cannot Connect to TCP Server","Smart Connect Status");break;
            default:
                break;
        }
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
        handleTCPReply(data);
        //con.write(d);
    }

    function onConClose() {
        public.eventLog('Connection From '+remoteAddress+' Closed' , "TCP Server");
        SQLAction.SQLSetField("seraph_device",{cStatus:0},"type = 'SS' AND IPAddress = '" + con.remoteAddress + "'" , "TCP Server");
        con.end();
        con.destroy();

    }

    function onConError(err) {
        public.eventLog('Connection '+remoteAddress+' Error: ' +  err.message , "TCP Server");
    }
}

function authTCPClients(con,callback){

    SQLAction.SQLFind("seraph_device","",{type:'SS',IPAddress:con.remoteAddress},function(data){

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

           }
           SQLAction.SQLAdd("seraph_device",data);
           callback(data);
       }
    });


}

var TCPSocketWrite = function(SSDevice,msg){
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

/************************************/

		   //HTTP SERVER//

/************************************/




var server = http.createServer(function (request, response) {
    handleHTTPRequest(request, response);
    //response.end("Hello World\n");
});

function handleHTTPRequest(req,res,next){

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-seraph-version, x-seraph-messageID, x-seraph-accessToken");

    if(req.method == "OPTIONS"){
        //res.send(200);
        res.end();
    }   else    {

        if(req.method == "POST") {

            var postData = "";

            req.addListener("data", function (data) {
                postData += data;
            });

            req.addListener("end", function () {
                var query = qs.parse(postData);
                req.body = query;
                attachURI(req,res)
            });
        }   else    {
            attachURI(req,res)
        }




    }

}

function attachURI(req,res){
    if (checkFunction("/test/linkService",req)) {testLinkService(req, res);}

    if (checkFunction("/checkmessage",req)) {testCheckmessage(req, res);}
    if (checkFunction("/checkonline",req)) {testCheckonline(req, res);}
    if (checkFunction("/test/updateDeviceList",req)) {testUpdateDeviceList(req, res);}
    if (checkFunction("/test/updateDeviceListClient",req)) {testUpdateDeviceListClient(req, res);}
    if (checkFunction("/test/deleteFromDeviceList",req)) {testDeleteFromDeviceList(req, res);}
    if (checkFunction("/test/updateSmartConnectInfo",req)) {testUpdateSmartConnectInfo(req, res);}
    if (checkFunction("/test/startSmartConnect",req)) {testStartSmartConnect(req, res);}
    if (checkFunction("/test/stopSmartConnect",req)) {testStopSmartConnect(req, res);}
    if (checkFunction("/test/startSecuredSmartConnect",req)) {testStartSecuredSmartConnect(req, res);}
    if (checkFunction("/test/stopSecuredSmartConnect",req)) {testStopSecuredSmartConnect(req, res);}
    if (checkFunction("/test/startBroadcastingServerIP",req)) {testStartBroadcastingServerIP(req, res);}
    if (checkFunction("/test/stopBroadcastingServerIP",req)) {testStopBroadcastingServerIP(req, res);}
    if (checkFunction("/test/checksumCaluc",req)) {testChecksumCaluc(req, res);}
    if (checkFunction("/test/updateDefaultMeshID",req)) {testUpdateDefaultMeshID(req, res);}

    if (checkFunction("/actions/perform",req)) {sspaGetActionsPerform(req, res);}
    if (checkFunction("/actions/refresh",req)) {sspaGetActionsRefresh(req, res);}
    if (checkFunction("/actions/backlight",req)) {sspaGetActionsBacklight(req, res);}
    if (checkFunction("/data/sync",req)) {sspaGetDataSync(req, res);}
    if (checkFunction("/data/recent",req)) {sspaGetDataRecent(req, res);}
    if (checkFunction("data/ir",req)) {sspaGetDataIr(req, res);}
    if (checkFunction("/config/ss",req)) {sspaGetConfigSS(req, res);}
    if (checkFunction("/config/ss",req,"POST")) {sspaPostConfigSS(req, res);}
    if (checkFunction("/config/strategy",req)) {sspaGetConfigStrategy(req, res);}
    if (checkFunction("/config/strategy",req,"POST")) {sspaPostConfigStrategy(req, res);}
    if (checkFunction("/device/status",req)) {sspaGetDeviceStatus(req, res);}
    if (checkFunction("/device/list",req)) {sspaGetDeviceList(req, res);}
    if (checkFunction("/device/list",req, "POST")) {sspaPostDeviceList(req, res);}
    if (checkFunction("/qe",req)) {sspaGetQE(req, res);}
    if (checkFunction("/alarm",req)) {sspaGetAlarm(req, res);}


    if (checkFunction("/sidp/action",req, "POST")) {SIDP_APIs.sidpPostAction(req, res);}
    if (checkFunction("/sidp/receipt",req, "POST")) {SIDP_APIs.sidpPostReceipt(req, res);}
    if (checkFunction("/sidp/alarm",req, "POST")) {SIDP_APIs.sidpPostAlarm(req, res);}
    if (checkFunction("/sidp/ble",req, "POST")) {SIDP_APIs.sidpPostBLE (req, res);}
    if (checkFunction("/sidp/config",req, "POST")) {SIDP_APIs.sidpPostConfig (req, res);}
    if (checkFunction("/sidp/led",req, "POST")) {SIDP_APIs.sidpPostLED (req, res);}
    if (checkFunction("/sidp/cmd",req, "POST")) {SIDP_APIs.sidpPostCMD (req, res);}
}

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(config.HTTPort);

// Put a friendly message on the terminal
public.eventLog('Seraph eSHOS Testing Console Listening on Port ' + config.HTTPort + '...', "HTTP Server")

function checkFunction(name,req,method){

    if(!method) {method = "GET"};
    if(req.method == method) {

        var path = url.parse(req.url, true).pathname;

        if (path.indexOf(name) == 0) {
            return name;
        } else {
            return false;
        }
    }   else    {
        return false;
    }
}

/************************************/

            //TESTING API//

/************************************/



function testLinkService(req, res) {

    var sql = "SELECT * FROM seraph_IR_type";
    public.eventLog("Link Service Started","Link Service");
    SQLAction.SQLConnection.all(sql, function(err, data) {
        var val = {
            TCPClient: SSInfos,
            IRType: data,
            sysConfig: sysConfigs,
            isSmartConnecting: isSmartConnecting,
            isSecuredSmartConnecting: isSecuredSmartConnecting,
            isBroadcastingServerIP: isBroadcastingServerIP,
            securedSmartConnectMac: securedSmartConnectMac,
            resultChecksum: checksumValue,
            defaultMeshID: public.bufferString(defaultMeshID),
            currentData: currentData
        };
        for(var i = 0; i < val.TCPClient.length; i ++){
            delete val.TCPClient[i].TCPClient;
        }
        res.end(JSON.stringify(val))
    });

}


function testCheckmessage(req, res) {
    //res.setHeader('Content-Type', 'application/json');
    var message = tempIncommingData;
    tempIncommingData = []
    res.end(JSON.stringify(message))

}

function testCheckonline(req, res) {

    var sql = "SELECT * FROM seraph_device WHERE type = 'SS'";
    SQLAction.SQLConnection.all(sql, function(err, data) {
        res.end(JSON.stringify(data))
    });

}


function testUpdateDeviceList(req, res) {
    var query = url.parse(req.url, true).query;
    var data = {
        IPAddress   : query.IPAddress,
        model       : query.model,
        deviceID    : query.deviceID,
    }
    if(query.id > 0){
        SQLAction.SQLSetField("seraph_device",data,"id=" + query.id);
    }   else    {
        data.macBLE = "39:10:9f:e4:ca:13";
        data.isMaster = false;
        data.type = "SS";
        SQLAction.SQLAdd("seraph_device",data);
    }

    destroyAllClients();
    createAllClients();
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
function testUpdateDeviceListClient(req, res) {

    var query = url.parse(req.url, true).query;
    var data = {
        macWiFi     : query.macWiFi,
        macBLE      : query.macWiFi,
        model       : query.model,
        deviceID    : query.deviceID,
        isServer    : 1,
        idKey       : AES.genIDKey(query.macWiFi,true),
        isMaster    : 0,
        type        : "SS"
    }
    SQLAction.SQLAdd("seraph_device",data);

    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
function testDeleteFromDeviceList(req, res) {

    var query = url.parse(req.url, true).query;
    SQLAction.SQLFind("seraph_device",["deviceID","isServer"],{id:query.id},function(SSDevice){

        SQLAction.SQLDelete("seraph_device",{id:query.id});
        if(SSDevice.isServer == 1){

            destroyConnectedClients(SSDevice.deviceID);
            res.writeHead(302, {'Location': 'http://' + query.orgURI});
            res.end();

        }   else    {

            destroyAllClients();
            createAllClients();
            res.writeHead(302, {'Location': 'http://' + query.orgURI});
            res.end();
        }
    })


}
function testUpdateSmartConnectInfo(req, res) {
    var query = url.parse(req.url, true).query;
    SQLAction.SQLSetConfig("config", { ROUTER_SSID	    : query.wifi_ssid });
    SQLAction.SQLSetConfig("config", { ROUTER_PASSWORD 	: query.wifi_password});
    sysConfigs.ROUTER_SSID = query.wifi_ssid;
    sysConfigs.ROUTER_PASSWORD = query.wifi_password;
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
function testStartSmartConnect (req, res) {
    var query = url.parse(req.url, true).query;
    isSmartConnecting = true;
    smartConnect.start();
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
function testStopSmartConnect(req, res, next) {
    var query = url.parse(req.url, true).query;
    isSmartConnecting = false;
    smartConnect.stop();

    public.eventLog("Stop Smart Connect.","Smart Connect");
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();
}
function testStartSecuredSmartConnect(req, res) {
    var query = url.parse(req.url, true).query;
    var macAddress = query.mac;
    isSecuredSmartConnecting = true;
    securedSmartConnectMac = macAddress;
    smartConnect.startSecured(macAddress);
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
function testStopSecuredSmartConnect(req, res) {
    var query = url.parse(req.url, true).query;
    isSecuredSmartConnecting = false;
    securedSmartConnectMac = "";
    smartConnect.stopSecured();

    public.eventLog("Stop Secured Smart Connect.","Secured Smart Connect");
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();
}
function testStartBroadcastingServerIP(req, res) {
    var query = url.parse(req.url, true).query;
    isBroadcastingServerIP = true;
    smartConnect.startServerIP();
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
function testStopBroadcastingServerIP(req, res) {
    var query = url.parse(req.url, true).query;
    isBroadcastingServerIP = false;
    smartConnect.stopServerIP();

    public.eventLog("Stop Broadcasting Server IP.","Smart Connect");
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
function testChecksumCaluc(req, res) {

    var query = url.parse(req.url, true).query;
    var checksumHex = new Buffer(public.formateHex(query.checksumHex),'hex');
    public.eventLog("Checksum String: " + public.bufferString(checksumHex),"Checksum Calculation");
    checksumValue = public.formateHex(public.checksum(checksumHex).toString(16));

    public.eventLog("Checksum Value: " + checksumValue,"Checksum Calculation");
    data = {checksum : checksumValue}
    res.end(JSON.stringify(data));

}
function testUpdateDefaultMeshID(req, res) {

    var query = url.parse(req.url, true).query;
    var rawMeshID = public.formateHex(query.defaultMeshID);
    if(rawMeshID.length > 4){
        rawMeshID = rawMeshID.substr(0,4);
    }
    defaultMeshID = new Buffer(rawMeshID,'hex');
    public.eventLog("Default Mesh ID was Set to: " + public.bufferString(rawMeshID),"Mesh ID");

    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}



/************************************/

            //SSP-A API//

/************************************/

/**
 * Action Perform
 */
function sspaGetActionsPerform(req, res) {

    req.rootRoute = "actions/perform";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbActionPerform(TCPClients[SSDevice],APIQuery);
    })
    res.end("");


}

/**
 * Action Refresh
 */
function sspaGetActionsRefresh (req, res) {

    req.rootRoute = "actions/refresh";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbActionRefresh(TCPClients[SSDevice],APIQuery);
    });
    res.end('')
}

/**
 * Action Backlight
 */
function sspaGetActionsBacklight (req, res) {

    req.rootRoute = "actions/backlight";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbActionBacklight(TCPClients[SSDevice],APIQuery);
    })
    res.end('')
}

/**
 * Data Sync
 */
function sspaGetDataSync (req, res) {

    req.rootRoute = "data/sync";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbDataSync(TCPClients[SSDevice],APIQuery);
    })
    res.end('')
}

/**
 * Data Recent
 */
function sspaGetDataRecent (req, res) {

    req.rootRoute = "data/recent";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbDataRecent(TCPClients[SSDevice],APIQuery);
    })
    res.end('')
}


/**
 * Data IR
 */
function sspaGetDataIr(req, res) {

    req.rootRoute = "data/ir";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbDataIR(TCPClients[SSDevice],APIQuery);
    })
    res.end('')
}


/**
 * Config SS
 */
function sspaGetConfigSS(req, res) {

    req.rootRoute = "config/ss";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbConfigssGet(TCPClients[SSDevice],APIQuery);
    })
    res.end('')

}

function sspaPostConfigSS (req, res) {
    req.rootRoute = "config/ss";
    var APIQuery = parseExpressURI(req);

    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbConfigssPost(TCPClients[SSDevice],APIQuery);
    })
    res.end('')
}


/**
 * Config SS
 */

function sspaGetConfigStrategy(req, res) {

    req.rootRoute = "/config/strategy/htsp";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbConfigStrategyHTSPGet(TCPClients[SSDevice],APIQuery);
    })
    res.end('')

}

function sspaPostConfigStrategy (req, res) {
    req.rootRoute = "/config/strategy/htsp";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbConfigStrategyHTSPPost(TCPClients[SSDevice],APIQuery);
    })

    res.end('')
}


/**
 * Device Status
 */

function sspaGetDeviceStatus (req, res) {

    req.rootRoute = "/device/status";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbDeviceStatus(TCPClients[SSDevice],APIQuery);
    })

    res.end('')

}


/**
 * Device List
 */

function sspaGetDeviceList (req, res) {

    req.rootRoute = "/device/list";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbDeviceListGet(TCPClients[SSDevice],APIQuery);
    })

    res.end('')

}

function sspaPostDeviceList (req, res) {
    req.rootRoute = "/device/list";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbDeviceListPost(TCPClients[SSDevice],APIQuery);
    })

    res.end('')
}


/**
 * Quick Event
 */

function sspaGetQE (req, res) {

    req.rootRoute = "/qe";
    var APIQuery = parseExpressURI(req);

    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbQE(TCPClients[SSDevice],APIQuery);
    })

    res.end('')

}

/**
 * Alarm
 */

function sspaGetAlarm (req, res) {

    req.rootRoute = "/alarm";
    var APIQuery = parseExpressURI(req);

    APIQuery.device.forEach(function (SSDevice) {
        SSPB_APIs.sspbAlarm(TCPClients[SSDevice],APIQuery);
    })


    res.end('')

}





/************************************/

		//SSP-A API Function//

/************************************/


function parseExpressURI(request){
    var query;
    if(request.method == "GET") {
        query = url.parse(request.url, true).query;
    }	else if(request.method == "POST") {

		query = request.body;
    }

    if(!query.protocolType) query.protocolType = "SSP-A";
    if(!query.ssuid) query.ssuid = "";
    var APIQuery = {
        action 			: request.rootRoute,
        query 			: query,
        paramURL 		: request.url,
        method 			: request.method,
		device			: query.ssuid.split(","),
        protocolType    : query.protocolType
    };
    public.eventTitle("REQUEST RECEIVED",1,APIQuery.protocolType + " Request");



    public.dataLog(APIQuery,"SSP-A Request")

    if(APIQuery.device[0] == ''){
        APIQuery.device = [];
        public.eventTitle("NO DEVICE SELECTED",2,APIQuery.protocolType + " Request",true);

    }

    return APIQuery;
}



/************************************/

		  //SSP RETURN//

/************************************/

function constructReturnMessage(messgeType,messageID,code,msg,other){
	var data = {
		isRequest 	: false,
		QoS 		: 0,
		QosNeeded	: 0,
		dup 		: 0,
		MessageType : messgeType,
		Topic 		: "",
		MessageID   : messageID,
		MessageIDextended   : 0,
		payload 	: ""
	}
	data.payload = constructStatusMessage(code,msg);
	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,"SSM00000")

	return msg;
}

function constructStatusMessage(code,msg){
	var message = {
		code 	: code,
		msg 	: msg
	}
	return JSON.stringify(message);
}



module.exports.TCPClients = TCPClients
module.exports.TCPSocketWrite = TCPSocketWrite;

var preloadData = require("./preloadData.js")