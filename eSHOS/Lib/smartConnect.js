/**
 * Created by fangchenli on 1/28/17.
 */
var UDP = require("./UDP.js");
var AES =  require ("./AES.js");
var dgram = require("dgram");
var config = require("../../config.js");
var public = require("./public.js");
var CoreData = require("./CoreData.js");
//////////////////////////////////////
        //REQUIRE MODULE//
//////////////////////////////////////



var ssid,password,securedSmartConfigMac;
var serverIP;
var ifSmartConnecting = false;
var ifSecuredSmartConnecting = false;
var ifBroadcastingServerIP = false;
var UDPServer = UDP.createUDPServer();


function startBroadcasting() {
    var port = config.SSCPort;
    setInterval(function () {
        if (ifSmartConnecting) {
            UDP.smartConnect(ssid, password,port);
        }
    }, 5000)
}
function startSecuredBroadcasting() {
    var port = config.SSCPort;
    setInterval(function () {
        if (ifSecuredSmartConnecting) {
            UDP.smartConnectSecure(ssid, password,securedSmartConfigMac,port);
        }
    }, 5000)
}
var startBroadcastingServerIP = function(server){
    var port = config.UDPPort;
    setInterval(function () {
        serverIP = CoreData.Seraph.sysConfigs.ESH_CONFIG_LOCAL_IP;
        if (ifBroadcastingServerIP) {
            UDP.broadCastingServerAddress(server,serverIP,port);
        }
    }, 2000)
}

module.exports = {
    start: function(){
        password = CoreData.Seraph.sysConfigs.ROUTER_PASSWORD;
        ssid = CoreData.Seraph.sysConfigs.ROUTER_SSID;
        ifSmartConnecting = true;
    },
    stop: function(){
        ifSmartConnecting = false;
    },
    startSecured: function(mac){
        securedSmartConfigMac = mac;
        password = CoreData.Seraph.sysConfigs.ROUTER_PASSWORD;
        ssid = CoreData.Seraph.sysConfigs.ROUTER_SSID;
        ifSecuredSmartConnecting = true;
    },
    stopSecured: function(){
        ifSecuredSmartConnecting = false;
    },
    startServerIP: function(){
        serverIP = CoreData.ESH_CONFIG_LOCAL_IP;
        ifBroadcastingServerIP = true;
    },
    stopServerIP: function(){
        ifBroadcastingServerIP = false;
    },
    startBroadcastingServerIP: startBroadcastingServerIP

}


startBroadcasting();
startSecuredBroadcasting();
startBroadcastingServerIP(UDPServer);


