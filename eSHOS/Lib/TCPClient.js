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
        //SICPHeartBeat();
    }
},5000);


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


        var headerRL = parseMessage.parseFixedHeaderRL(data);
        var parsedTotalLength = headerRL.byte + 3 + headerRL.message;
        var incommingMessageData;
        if(parsedTotalLength != data.length){
            incommingMessageData = {
                "code"      :   "0x505001",
                "msg"       :   "Protocol NOT Supported!",
                "raw"       :   data.toString(),
                "raw Hex"   :   public.bufferString(data),
            }
        }   else    {
            incommingMessageData = parseMessage.parseMessage(data,false);
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


    if (checkFunction("/sidp/action",req, "POST")) {sidpPostAction(req, res);}
    if (checkFunction("/sidp/receipt",req, "POST")) {sidpPostReceipt(req, res);}
    if (checkFunction("/sidp/alarm",req, "POST")) {sidpPostAlarm(req, res);}
    if (checkFunction("/sidp/ble",req, "POST")) {sidpPostBLE (req, res);}
    if (checkFunction("/sidp/config",req, "POST")) {sidpPostConfig (req, res);}
    if (checkFunction("/sidp/led",req, "POST")) {sidpPostLED (req, res);}
    if (checkFunction("/sidp/cmd",req, "POST")) {sidpPostCMD (req, res);}
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
        sspbActionPerform(TCPClients[SSDevice],APIQuery);
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
        sspbActionRefresh(TCPClients[SSDevice],APIQuery);
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
        sspbActionBacklight(TCPClients[SSDevice],APIQuery);
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
        sspbDataSync(TCPClients[SSDevice],APIQuery);
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
        sspbDataRecent(TCPClients[SSDevice],APIQuery);
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
        sspbDataIR(TCPClients[SSDevice],APIQuery);
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
        sspbConfigssGet(TCPClients[SSDevice],APIQuery);
    })
    res.end('')

}

function sspaPostConfigSS (req, res) {
    req.rootRoute = "config/ss";
    var APIQuery = parseExpressURI(req);

    APIQuery.device.forEach(function (SSDevice) {
        sspbConfigssPost(TCPClients[SSDevice],APIQuery);
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
        sspbConfigStrategyHTSPGet(TCPClients[SSDevice],APIQuery);
    })
    res.end('')

}

function sspaPostConfigStrategy (req, res) {
    req.rootRoute = "/config/strategy/htsp";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        sspbConfigStrategyHTSPPost(TCPClients[SSDevice],APIQuery);
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
        sspbDeviceStatus(TCPClients[SSDevice],APIQuery);
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
        sspbDeviceListGet(TCPClients[SSDevice],APIQuery);
    })

    res.end('')

}

function sspaPostDeviceList (req, res) {
    req.rootRoute = "/device/list";
    var APIQuery = parseExpressURI(req);
    APIQuery.device.forEach(function (SSDevice) {
        sspbDeviceListPost(TCPClients[SSDevice],APIQuery);
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
        sspbQE(TCPClients[SSDevice],APIQuery);
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
        sspbAlarm(TCPClients[SSDevice],APIQuery);
    })


    res.end('')

}


/************************************/

        //SIDP API Function//

/************************************/


function sidpPostAction (req, res) {
    var displayedMessage = "";
    req.rootRoute = "/sidp/action";
    if(!req.body.protocolType) req.body.protocolType = "SICP";
    var APIQuery = parseExpressURI(req);
    var data = {
        moduleID    : APIQuery.query.moduleID,
        channel     : APIQuery.query.channel,
        value       : parseInt(APIQuery.query.targetValue),
        time        : parseInt(APIQuery.query.time)
    };
    switch (APIQuery.query.type){
        case "DMM":
            data.moduleID = data.moduleID.split(",");
            data.channel = data.channel.split(",");
            break;
        case "CP":
        case "WP":
            if(data.value > 0) data.value = 99;
            break;
        default:
            break;
    }
    //console.log(data);
    APIQuery.device.forEach(function (SSDevice) {

        msg = constructSIDPMessage.consructSIDPAction(
            APIQuery.protocolType,
            false,
            new Buffer(defaultMeshID,'hex'),
            APIQuery.query.type,
            data
        );
        TCPSocketWrite(TCPClients[SSDevice],msg);
        displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
        currentData = currentData + displayedMessage;
    });

    var displayObject = {message: displayedMessage};
    res.end(JSON.stringify(displayObject));

}
function sidpPostReceipt (req, res) {
    var displayedMessage = "";
    req.rootRoute = "/sidp/receipt";
    if(!req.body.protocolType) req.body.protocolType = "SICP";
    var APIQuery = parseExpressURI(req);

    APIQuery.device.forEach(function (SSDevice) {

        var msg = constructSIDPMessage.consructSIDPReceipt(
            APIQuery.protocolType,
            false,
            new Buffer(defaultMeshID,'hex'),
            APIQuery.query.type
        );
        TCPSocketWrite(TCPClients[SSDevice],msg);
        displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
        currentData = currentData + displayedMessage;
    });

    var displayObject = {message: displayedMessage};
    res.end(JSON.stringify(displayObject));

}
function sidpPostAlarm (req, res) {
    var displayedMessage = "";
    req.rootRoute = "/sidp/alarm";
    if(!req.body.protocolType) req.body.protocolType = "SICP";
    var APIQuery = parseExpressURI(req);

    APIQuery.device.forEach(function (SSDevice) {

        msg = constructSIDPMessage.consructSIDPAlarm(
            APIQuery.protocolType,
            false,
            new Buffer(defaultMeshID,'hex'),
            APIQuery.query.type
        );
        TCPSocketWrite(TCPClients[SSDevice],msg);
        displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
        currentData = currentData + displayedMessage;
    });

    var displayObject = {message: displayedMessage};
    res.end(JSON.stringify(displayObject));

}
function sidpPostBLE (req, res) {
    var displayedMessage = "";
    req.rootRoute = "/sidp/ble";
    if(!req.body.protocolType) req.body.protocolType = "SICP";
    var APIQuery = parseExpressURI(req);

    APIQuery.device.forEach(function (SSDevice) {

        msg = constructSIDPMessage.consructSIDPBLE(
            APIQuery.protocolType,
            false,
            new Buffer(defaultMeshID,'hex'),
            APIQuery.query.type
        );
        TCPSocketWrite(TCPClients[SSDevice],msg);
        displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
        currentData = currentData + displayedMessage;
    });

    var displayObject = {message: displayedMessage};
    res.end(JSON.stringify(displayObject));

}
function sidpPostConfig (req, res) {
    var displayedMessage = "";
    req.rootRoute = "/sidp/config";
    if(!req.body.protocolType) req.body.protocolType = "SICP";
    var APIQuery = parseExpressURI(req);
    var data = {
        meshID      : new Buffer(APIQuery.query.meshID,'hex'),
        moduleID    : parseInt(APIQuery.query.moduleID),
        channel     : APIQuery.query.channel,
        action      : APIQuery.query.action,

    }
    switch (APIQuery.query.type){
        case "1":
            data.pad = APIQuery.query.trigger;
            break;

        case "2":
            data.gesture = APIQuery.query.trigger;
            data.value = parseInt(APIQuery.query.targetValue);
            break;
        default:
            break;
    }
    //console.log(data);
    APIQuery.device.forEach(function (SSDevice) {

        msg = constructSIDPMessage.consructSIDPConfig(
            APIQuery.protocolType,
            false,
            new Buffer(defaultMeshID,'hex'),
            parseInt(APIQuery.query.type),
            data
        );
        TCPSocketWrite(TCPClients[SSDevice],msg);
        displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
        currentData = currentData + displayedMessage;
    });

    var displayObject = {message: displayedMessage};
    res.end(JSON.stringify(displayObject));

}
function sidpPostLED (req, res, next) {
    var displayedMessage = "";
    req.rootRoute = "/sidp/led";
    if(!req.body.protocolType) req.body.protocolType = "SICP";
    var APIQuery = parseExpressURI(req);
    var data = {
        display     : APIQuery.query.display,
        colors      : APIQuery.query.colors.split(",")

    }
    APIQuery.query.type = parseInt(APIQuery.query.type);
    switch (APIQuery.query.type){
        case 1:
            data.speed = parseInt(APIQuery.query.param_1);
            data.density = parseInt(APIQuery.query.param_2);
            break;
        case 2:
            data.in = parseInt(APIQuery.query.param_1);
            data.out = parseInt(APIQuery.query.param_2);
            data.duration = parseInt(APIQuery.query.param_3);
            data.blank = parseInt(APIQuery.query.param_4);
            break;
        case 3:
            data.in = parseInt(APIQuery.query.param_1);
            data.duration = parseInt(APIQuery.query.param_2);
            break;
        default:
            delete data.colors;
            break;
    }
    //console.log(data);
    APIQuery.device.forEach(function (SSDevice) {

        msg = constructSIDPMessage.consructSIDPLED(
            APIQuery.protocolType,
            false,
            new Buffer(defaultMeshID,'hex'),
            parseInt(APIQuery.query.type),
            data
        );
        TCPSocketWrite(TCPClients[SSDevice],msg);
        displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
        currentData = currentData + displayedMessage;
    });

    var displayObject = {message: displayedMessage};
    res.end(JSON.stringify(displayObject));

}
function sidpPostCMD (req, res) {
    var displayedMessage = "";
    req.rootRoute = "/sidp/cmd";
    if(!req.body.protocolType) req.body.protocolType = "SICP";
    var APIQuery = parseExpressURI(req);
    var data = {};
    APIQuery.query.type = parseInt(APIQuery.query.type)
    switch(APIQuery.query.type){
        case 1: data.sensors = APIQuery.query.sensors.split(",");break;
        case 3: data.moduleID = APIQuery.query.moduleID;break;
    }

    APIQuery.device.forEach(function (SSDevice) {

        msg = constructSIDPMessage.consructSIDPCMD(
            APIQuery.protocolType,
            false,
            new Buffer(defaultMeshID,'hex'),
            APIQuery.query.type,
            data
        );
        TCPSocketWrite(TCPClients[SSDevice],msg);
        displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
        currentData = currentData + displayedMessage;
    });

    var displayObject = {message: displayedMessage};
    res.end(JSON.stringify(displayObject));

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

function recordExpressRequestData(data,APIQuery){
    var sqlData = {
        messageID 		: data.MessageID,
        action 			: APIQuery.action,
        parameter 		: JSON.stringify(APIQuery.query),
        requestedURI 	: data.Topic,
        method 			: APIQuery.method,
        timestamp 		: public.timestamp(),
        qos 			: data.QosNeeded
    };
    SQLAction.SQLAdd("commands",sqlData);
}



/************************************/

		  //SSP-B API//

/************************************/

/**
 *
 * @param SSDevice
 * @param APIQuery
 */

function sspbActionPerform(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 3,
		Topic 		: "/actions/perform",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}
	var commands = strategyExecutionObject();
	var payload = {
		qos 		: 2 + commands.length,
		cmd 		: commands
	}
	data.payload = JSON.stringify(payload);
	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
    recordExpressRequestData(data,APIQuery);
    return data;
}

/**
 *
 * @param SSDevice
 * @param APIQuery
 */

function sspbActionRefresh(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/actions/refresh",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}
    if(APIQuery.query.CH){
        data.Topic = data.Topic + "/CH/" + APIQuery.query.CH
    }
	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
    TCPSocketWrite(SSDevice,msg);
    recordExpressRequestData(data,APIQuery);
    return data;
}

/**
 *
 * @param SSDevice
 * @param APIQuery
 */
function sspbActionBacklight(SSDevice,APIQuery){
    var data = {
        isRequest 	: true,
        QoS 		: 2,
        QosNeeded	: 1,
        dup 		: 0,
        MessageType : 2,
        Topic 		: "/actions/backlight",
        MessageID   : public.generateMessageID(),
        MessageIDextended   : 0,
        payload 	: ""
    }
    var payload = {};
    //public.eventLog(APIQuery.query)

    switch (parseInt(APIQuery.query.mode)){
        case 1:
            payload.type = parseInt(APIQuery.query.mode);
            payload.colors = APIQuery.query.colors.split(",");
            payload.density = APIQuery.query.density;
            payload.speed = APIQuery.query.speed;
            payload.display = parseInt(APIQuery.query.display);
            break;
        case 2:
            payload.type = parseInt(APIQuery.query.mode);
            payload.colors = APIQuery.query.colors.split(",");
            payload.time = {
                "in"      : parseInt(APIQuery.query.timeIn),
                "duration": parseInt(APIQuery.query.timeDuration),
                "out"     : parseInt(APIQuery.query.timeOut),
                "blank"   : parseInt(APIQuery.query.timeBlank),
            }
            payload.display = parseInt(APIQuery.query.display);
            break;
        case 3:
            payload.type = parseInt(APIQuery.query.mode);
            payload.colors = APIQuery.query.colors.split(",");
            payload.time = {
                "in"      : parseInt(APIQuery.query.timeIn),
                "duration": parseInt(APIQuery.query.timeDuration),
            }
            payload.display = parseInt(APIQuery.query.display);
            break;
        case 4:
            payload.type = parseInt(APIQuery.query.mode);
            break;
        case 5:
            payload.type = parseInt(APIQuery.query.mode);
            break;
        default:
            break;
    }
    data.payload = JSON.stringify(payload);
    var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
    TCPSocketWrite(SSDevice,msg);
    recordExpressRequestData(data,APIQuery);
    return data;
}

/**
 *
 * @param SSDevice
 * @param APIQuery
 */
function sspbDataSync(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/data/sync",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}
    if(APIQuery.query.SEPID){
        data.Topic = data.Topic + "/SEPID/" + APIQuery.query.SEPID;
    }
	if(APIQuery.query.CH){
        data.Topic = data.Topic + "/CH/" + APIQuery.query.CH
	}

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
    recordExpressRequestData(data,APIQuery);
    return data;
}


/**
 * SSP Data Recent
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
 */


function sspbDataRecent(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/data/recent",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}

    if(APIQuery.query.SEPID){
        data.Topic = data.Topic + "/SEPID/" + APIQuery.query.SEPID;
    }
    if(APIQuery.query.CH){
        data.Topic = data.Topic + "/CH/" + APIQuery.query.CH;
    }

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
	return data;
}

/**
 *
 * @param SSDevice
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
 */

function sspbDataIR(SSDevice,APIQuery){

	var SEPID = {"SEPID":SSDevice.deviceID}
    var data = {
        isRequest 	: true,
        QoS 		: 2,
        QosNeeded	: 1,
        dup 		: 0,
        MessageType : 2,
        Topic 		: "/data/ir",
        MessageID   : public.generateMessageID(),
        MessageIDextended   : 0,
        payload 	: JSON.stringify(SEPID)
    }

    var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
    TCPSocketWrite(SSDevice,msg);
    return data;
}

/**
 *
 * @param SSDevice
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
 */

function sspbConfigssGet(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/config/ss",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
	return data;

}
function sspbConfigssPost(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 3,
		Topic 		: "/config/ss",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}
	SSConfigObject(function(conf){
		data.payload = JSON.stringify(conf);
		var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
		TCPSocketWrite(SSDevice,msg);

	});
	return data;


}

/**
 * Config Strategy HTSP
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
 */

function sspbConfigStrategyHTSPGet(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/config/strategy/htsp",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}

	if(APIQuery.query.STID){
		data.Topic = data.Topic + "/STID/" + APIQuery.query.STID
	}

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
	return data;

}

function sspbConfigStrategyHTSPPost(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 3,
		Topic 		: "/config/strategy/htsp",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}


	var payload = {
		cond 		: strategyConditionObject(),
		cmd 		: strategyExecutionObject()
	}

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
	return data;
}

/**
 * Device Status
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
 */


function sspbDeviceStatus(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/device/status",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}

	if(APIQuery.query.SEPID){
        data.Topic = data.Topic + "/SEPID/" + APIQuery.query.SEPID
	}
	if(APIQuery.query.CH){
        data.Topic = data.Topic + "/CH/" + APIQuery.query.CH
	}

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
	return data;
}

/**
 * Device List
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
 */

function sspbDeviceListGet(SSDevice,APIQuery){
    var data = {
        isRequest 	: true,
        QoS 		: 2,
        QosNeeded	: 1,
        dup 		: 0,
        MessageType : 2,
        Topic 		: "/device/list",
        MessageID   : public.generateMessageID(),
        MessageIDextended   : 0,
        payload 	: ""
    }

    var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
    TCPSocketWrite(SSDevice,msg);
    return data;
}
function sspbDeviceListPost(SSDevice,APIQuery){
    var data = {
        isRequest 	: true,
        QoS 		: 2,
        QosNeeded	: 1,
        dup 		: 0,
        MessageType : 3,
        Topic 		: "/device/list",
        MessageID   : public.generateMessageID(),
        MessageIDextended   : 0,
        payload 	: ""
    }


    var managedSS = SSDevice.deviceID;
    deviceListObject(managedSS,function(SQLData){

        data.payload = JSON.stringify(SQLData);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPSocketWrite(SSDevice,msg);
    });

    return data;


}

/**
 * Quick Event
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
 */

function sspbQE(SSDevice,APIQuery){

	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: APIQuery.paramURL.slice(0,APIQuery.paramURL.indexOf("?")),
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	};

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
	return data;
}



/**
 * Alarm
 * @param APIQuery
 * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: *, MessageID: *, MessageIDextended: number, payload: string}}
 */


function sspbAlarm(SSDevice,APIQuery){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/alarm",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}

	var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
	TCPSocketWrite(SSDevice,msg);
	return data;
}

/************************************/

        //SICP Methods//

/************************************/

function SICPHeartBeat(){
    var msg = constructSICPMessage.constructSICPHeartBeats();
    for (SSDevice in TCPClients){
        public.eventLog("Network Status Sent: " + public.bufferString(msg),"SICP Network Status")
        TCPSocketWrite(TCPClients[SSDevice],msg);
    }


}


/************************************/

        //SSP-B Methods//

/************************************/

function TCPSocketWrite(SSDevice,msg){
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

		  //SSP-B Object//

/************************************/



var SSConfigObject = function(callback){
	var web = webAction;
	webAction.getWeatherLocation(function(weatherLocation){
		webAction.getSSConfig(function(config){
			var conf = {
				system 		: config.system,
				wifi 		: config.wifi,
				time 		: public.timestamp(),
				location 	: weatherLocation.location,
				weather 	: weatherLocation.weather
			}
			//public.eventLog(conf);
			callback(conf);
		})

	});

}

function strategyExecutionObject(){
	var strategy = [{
		seqid 		: 1,
		sepid 		: "SL03Y87D",
		CH 			: 52,
 		action 		: "DM",
 		topos 		: 99,
 		option 		: {
			duration 	: 3,
			erase 		: 1,
		},
		stseq 		: 0,
		timeout 	: 3
		},{
		seqid 		: 2,
 		sepid 		: "SP048372",
 		CH 			: 32,
		action 		: "WP",
		topos 		: 1,
		stseq 		: 0,
		timeout 	: 3
		}
     ];
     return strategy;
}
function strategyConditionObject(){

	var condition = "this.HM = 1 || floor.TP > 10 && home.PR = true";
	return condition;

}
var deviceListObject =  function (ssid,callback){

    var queryWhere = ['SP','SL'];
    var queryField = ['deviceID', 'model', 'macBLE', 'coord'];
    var sql = "SELECT " + queryField.join(", ") + " FROM seraph_device WHERE managedSS = '" + ssid + "' AND (type = '" + queryWhere.join("' OR type = '") + "')";
    SQLAction.SQLConnection.all(sql, function(err, res) {
    	public.eventLog(res);
        public.eventLog(sql);
		callback(res);
    })
}


/************************************/

		//Parse Reply Test//

/************************************/



//testParse();

function testParse(){
	var data = {
		isRequest 	: true,
		QoS 		: 2,
		QosNeeded	: 1,
		dup 		: 0,
		MessageType : 2,
		Topic 		: "/action/refresh/CH/PT",
		MessageID   : public.generateMessageID(),
		MessageIDextended   : 0,
		payload 	: ""
	}
	data.payload =  constructStatusMessage("0x2000001","Operation Complete.");
	var messageBuffer = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,"SSM00000");
	parseMessage.parseMessage(messageBuffer,false);
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
function constructRequestMessage(source,QoS,messageType,topic){
    var isRequest = false;
    if(source === 0){
        isRequest = true;
    }   else if (source == 1){
        isRequest = false;
        topic = "";
    }

    var data = {
        isRequest 	: isRequest,
        QoS 		: QoS,
        QosNeeded	: 0,
        dup 		: 0,
        MessageType : messageType,
        Topic 		: topic,
        MessageID   : 1876,
        MessageIDextended   : 0,
        payload 	: "{}"
    }
    data.payload = constructStatusMessage("0x0000","abc");
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



function sspbTestMessage(APIQuery){
    var data = {
        isRequest 	: true,
        QoS 		: 2,
        QosNeeded	: 1,
        dup 		: 0,
        MessageType : 2,
        Topic 		: "/config/strategy/htsp",
        MessageID   : public.generateMessageID(),
        MessageIDextended   : 0,
        payload 	: ""
    }

    if(APIQuery.query.STID){
        data.Topic = data.Topic + "/STID/" + APIQuery.query.STID
    }

    var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
    TCPSocketWrite(SSDevice,msg);
    return data;

}




