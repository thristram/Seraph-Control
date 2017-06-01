/**
 * Created by fangchenli on 5/14/17.
 */

var UDP = require("./UDP.js");

var ssid = "";
var password = "";
var securedSmartConfigMac = "";
var port = 9957;

//开始非加密快联
//startBroadcasting();

//开始加密快联
//startSecuredBroadcasting()



function startBroadcasting() {

    setInterval(function () {
        UDP.smartConnect(ssid, password,port);
    }, 5000)
}
function startSecuredBroadcasting() {

    setInterval(function () {
        UDP.smartConnectSecure(ssid, password,securedSmartConfigMac,port);
    }, 5000)
}
