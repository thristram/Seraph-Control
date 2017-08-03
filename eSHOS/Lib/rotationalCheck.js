/**
 * Created by fangchenli on 8/2/17.
 */

var public = require("./public.js");
var TCPClient = require ("./TCPClient.js");
var SSPB_APIs = require ("./SSP-B.js");


var timeout = 3000;

var startCheckDeviceStatus = function(SSDeviceID){
    setInterval(function(){
        SSPB_APIs.sspbDeviceStatus(TCPClient.TCPClients[SSDeviceID]);
    },timeout)
}
var startCheckSensorValue = function(SSDeviceID){
    setInterval(function(){
        SSPB_APIs.sspbDataSync(TCPClient.TCPClients[SSDeviceID]);
    },timeout)
}

module.exports = {
    startCheckDeviceStatus  : startCheckDeviceStatus,
    startCheckSensorValue   : startCheckSensorValue
}