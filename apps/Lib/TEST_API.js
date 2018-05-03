/**
 * Created by fangchenli on 7/24/17.
 */

var url = require('url');

var TCPClient = require("./TCPClient.js");
var AES = require("./AES.js");
var Seraph = require("./CoreData.js");
var smartConnect = require("./smartConnect.js");
var public = require("./public.js");
var SQLAction =  require ("./SQLAction.js");

//////////////////////////////////////
    //System Variables//
//////////////////////////////////////
var isSmartConnecting = false;
var isBroadcastingServerIP = false;
var isSecuredSmartConnecting = false;
var securedSmartConnectMac = "";
var checksumValue = "00";


module.exports.defaultMeshID = "8001";
module.exports.currentData = "";
module.exports.tempIncommingData = []

/************************************/

        //TESTING API//

/************************************/



var testLinkService = function(req, res) {

    var sql = "SELECT * FROM seraph_IR_type";
    public.eventLog("Link Service Started","Link Service");
    SQLAction.SQLConnection.all(sql, function(err, data) {
        var val = {
            IRType: data,
            sysConfig: Seraph.sysConfigs,
            isSmartConnecting: isSmartConnecting,
            isSecuredSmartConnecting: isSecuredSmartConnecting,
            isBroadcastingServerIP: isBroadcastingServerIP,
            securedSmartConnectMac: securedSmartConnectMac,
            resultChecksum: checksumValue,
            defaultMeshID: public.bufferString(module.exports.defaultMeshID),
            //currentData: module.exports.currentData
        };
        res.end(JSON.stringify(val))
    });

}


var testCheckmessage = function(req, res) {
    //res.setHeader('Content-Type', 'application/json');
    var message = module.exports.tempIncommingData;
    module.exports.tempIncommingData = []
    res.end(JSON.stringify(message))

}

var testCheckonline = function(req, res) {
    var data = [];
    for(var key in Seraph.devices.getDeviceList(["SS"])){

        let SSDeviceID = Seraph.devices.getDeviceList(["SS"])[key];
        let device = Seraph.devices.getDevice(SSDeviceID);
        var temp = {
            "deviceID"  : SSDeviceID,
            "IPAddress" : device.IPAddress,
            "cStatus"   : device.connectionStatus,
            "isServer"  : device.isServer,
            "isClient"  : !device.isServer,
            "model"     : device.model
        };

        data.push(temp);
        delete(temp);
    }
    res.end(JSON.stringify(data))
    //res.end(JSON.stringify({}))
}


var testUpdateDeviceList = function(req, res) {
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

    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
var testUpdateDeviceListClient = function(req, res) {

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
var testDeleteFromDeviceList = function(req, res) {

    var query = url.parse(req.url, true).query;
    SQLAction.SQLFind("seraph_device",["deviceID","isServer"],{id:query.id},function(SSDevice){

        SQLAction.SQLDelete("seraph_device",{id:query.id});
        if(SSDevice.isServer == 1){

            TCPClient.destroyConnectedClients(SSDevice.deviceID);
            res.writeHead(302, {'Location': 'http://' + query.orgURI});
            res.end();

        }   else    {

            res.writeHead(302, {'Location': 'http://' + query.orgURI});
            res.end();
        }
    })


}
var testUpdateSmartConnectInfo = function(req, res) {
    var query = url.parse(req.url, true).query;
    var configToSet = {
        "ROUTER_SSID"	    : query.wifi_ssid,
        "ROUTER_PASSWORD" 	: query.wifi_password
    }
    Seraph.setSysConfigs(configToSet);
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
var testStartSmartConnect = function(req, res) {
    var query = url.parse(req.url, true).query;
    isSmartConnecting = true;
    smartConnect.start();
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
var testStopSmartConnect = function(req, res, next) {
    var query = url.parse(req.url, true).query;
    isSmartConnecting = false;
    smartConnect.stop();

    public.eventLog("Stop Smart Connect.","Smart Connect");
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();
}
var testStartSecuredSmartConnect = function(req, res) {
    var query = url.parse(req.url, true).query;
    var macAddress = query.mac;
    isSecuredSmartConnecting = true;
    securedSmartConnectMac = macAddress;
    smartConnect.startSecured(macAddress);
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
var testStopSecuredSmartConnect = function(req, res) {
    var query = url.parse(req.url, true).query;
    isSecuredSmartConnecting = false;
    securedSmartConnectMac = "";
    smartConnect.stopSecured();

    public.eventLog("Stop Secured Smart Connect.","Secured Smart Connect");
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();
}
var testStartBroadcastingServerIP = function(req, res) {
    var query = url.parse(req.url, true).query;
    isBroadcastingServerIP = true;
    smartConnect.startServerIP();
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
var testStopBroadcastingServerIP = function(req, res) {
    var query = url.parse(req.url, true).query;
    isBroadcastingServerIP = false;
    smartConnect.stopServerIP();

    public.eventLog("Stop Broadcasting Server IP.","Smart Connect");
    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
var testChecksumCaluc = function(req, res) {

    var query = url.parse(req.url, true).query;
    var checksumHex = new Buffer(public.formateHex(query.checksumHex),'hex');
    public.eventLog("Checksum String: " + public.bufferString(checksumHex),"Checksum Calculation");
    checksumValue = public.formateHex(public.checksum(checksumHex).toString(16));

    public.eventLog("Checksum Value: " + checksumValue,"Checksum Calculation");
    data = {checksum : checksumValue}
    res.end(JSON.stringify(data));

}
var testUpdateDefaultMeshID = function(req, res) {

    var query = url.parse(req.url, true).query;
    var rawMeshID = public.formateHex(query.defaultMeshID);
    if(rawMeshID.length > 4){
        rawMeshID = rawMeshID.substr(0,4);
    }
    module.exports.defaultMeshID = new Buffer(rawMeshID,'hex');
    public.eventLog("Default Mesh ID was Set to: " + public.bufferString(rawMeshID),"Mesh ID");

    res.writeHead(302, {'Location': 'http://' + query.orgURI});
    res.end();

}
var testTCPPacket = function(req, res) {

	var query = url.parse(req.url, true).query;
	var data = query.data;
	var ip = query.ip;
	TCPClient.testTCP(data, ip);

	res.end("");

}


module.exports.testLinkService = testLinkService;
module.exports.testCheckmessage = testCheckmessage;
module.exports.testCheckonline = testCheckonline;
module.exports.testUpdateDeviceList = testUpdateDeviceList;
module.exports.testUpdateDeviceListClient = testUpdateDeviceListClient;
module.exports.testDeleteFromDeviceList = testDeleteFromDeviceList;
module.exports.testUpdateSmartConnectInfo = testUpdateSmartConnectInfo;
module.exports.testStartSmartConnect = testStartSmartConnect;
module.exports.testStopSmartConnect = testStopSmartConnect;
module.exports.testStartSecuredSmartConnect = testStartSecuredSmartConnect;
module.exports.testStopSecuredSmartConnect = testStopSecuredSmartConnect;
module.exports.testStartBroadcastingServerIP = testStartBroadcastingServerIP;
module.exports.testStopBroadcastingServerIP = testStopBroadcastingServerIP;
module.exports.testChecksumCaluc = testChecksumCaluc;
module.exports.testUpdateDefaultMeshID = testUpdateDefaultMeshID;
module.exports.testTCPPacket = testTCPPacket;
