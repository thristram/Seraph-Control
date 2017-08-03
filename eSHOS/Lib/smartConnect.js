/**
 * Created by fangchenli on 1/28/17.
 */
var UDP = require("./UDP.js");
var SQLAction =  require ("./SQLAction.js");
var AES =  require ("./AES.js");
var dgram = require("dgram");
var config = require("../../config.js");
var public = require("./public.js");
//////////////////////////////////////
        //REQUIRE MODULE//
//////////////////////////////////////



var ssid,password,securedSmartConfigMac;
var serverIP;
var ifSmartConnecting = false;
var ifSecuredSmartConnecting = false;
var ifBroadcastingServerIP = false;
var UDPServer = UDP.createUDPServer();


function getWiFiInfo(){
    var sql = "SELECT * FROM config WHERE name = 'ROUTER_SSID' OR name = 'ROUTER_PASSWORD' ";
    SQLAction.SQLConnection.all(sql, function(err, res) {
        for(var index in res){
            if(res[index].name == "ROUTER_PASSWORD"){
                password = res[index].value
            }
            if(res[index].name == "ROUTER_SSID"){
                ssid = res[index].value
            }
        }
    })
}
function getServerIPInfo(){
    var sql = "SELECT * FROM config WHERE name = 'ESH_CONFIG_LOCAL_IP'";
    SQLAction.SQLConnection.all(sql, function(err, res) {
        for(var index in res){
            if(res[index].name == "ESH_CONFIG_LOCAL_IP"){
                serverIP = res[index].value
            }
        }
    })
}

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
        if (ifBroadcastingServerIP) {
            UDP.broadCastingServerAddress(server,serverIP,port);
        }
    }, 2000)
}

module.exports = {
    start: function(){
        getWiFiInfo();
        ifSmartConnecting = true;
    },
    stop: function(){
        ifSmartConnecting = false;
    },
    startSecured: function(mac){
        securedSmartConfigMac = mac;
        getWiFiInfo();
        ifSecuredSmartConnecting = true;
    },
    stopSecured: function(){
        ifSecuredSmartConnecting = false;
    },
    startServerIP: function(){
        getServerIPInfo();
        ifBroadcastingServerIP = true;
    },
    stopServerIP: function(){
        ifBroadcastingServerIP = false;
    },
    startBroadcastingServerIP: startBroadcastingServerIP

}


getWiFiInfo();
startBroadcasting();
startSecuredBroadcasting();
startBroadcastingServerIP(UDPServer);


