/**
 * Created by fangchenli on 7/22/17.
 */

var http = require('http');
var qs = require('querystring');
var url = require('url');

var config = require("../../config.js");
var SSPA_APIs = require("./SSP-A.js");
var SIDP_APIs = require("./SIDP.js");
var TEST_APIs = require("./TEST_API.js");
var public = require("./public.js");




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
    if (checkFunction("/test/linkService",req)) {TEST_APIs.testLinkService(req, res);}

    if (checkFunction("/checkmessage",req)) {TEST_APIs.testCheckmessage(req, res);}
    if (checkFunction("/checkonline",req)) {TEST_APIs.testCheckonline(req, res);}
    if (checkFunction("/test/updateDeviceList",req)) {TEST_APIs.testUpdateDeviceList(req, res);}
    if (checkFunction("/test/updateDeviceListClient",req)) {TEST_APIs.testUpdateDeviceListClient(req, res);}
    if (checkFunction("/test/deleteFromDeviceList",req)) {TEST_APIs.testDeleteFromDeviceList(req, res);}
    if (checkFunction("/test/updateSmartConnectInfo",req)) {TEST_APIs.testUpdateSmartConnectInfo(req, res);}
    if (checkFunction("/test/startSmartConnect",req)) {TEST_APIs.testStartSmartConnect(req, res);}
    if (checkFunction("/test/stopSmartConnect",req)) {TEST_APIs.testStopSmartConnect(req, res);}
    if (checkFunction("/test/startSecuredSmartConnect",req)) {TEST_APIs.testStartSecuredSmartConnect(req, res);}
    if (checkFunction("/test/stopSecuredSmartConnect",req)) {TEST_APIs.testStopSecuredSmartConnect(req, res);}
    if (checkFunction("/test/startBroadcastingServerIP",req)) {TEST_APIs.testStartBroadcastingServerIP(req, res);}
    if (checkFunction("/test/stopBroadcastingServerIP",req)) {TEST_APIs.testStopBroadcastingServerIP(req, res);}
    if (checkFunction("/test/checksumCaluc",req)) {TEST_APIs.testChecksumCaluc(req, res);}
    if (checkFunction("/test/updateDefaultMeshID",req)) {TEST_APIs.testUpdateDefaultMeshID(req, res);}

    if (checkFunction("/actions/perform",req)) {SSPA_APIs.sspaGetActionsPerform(req, res);}
    if (checkFunction("/actions/refresh",req)) {SSPA_APIs.sspaGetActionsRefresh(req, res);}
    if (checkFunction("/actions/backlight",req)) {SSPA_APIs.sspaGetActionsBacklight(req, res);}
    if (checkFunction("/data/sync",req)) {SSPA_APIs.sspaGetDataSync(req, res);}
    if (checkFunction("/data/recent",req)) {SSPA_APIs.sspaGetDataRecent(req, res);}
    if (checkFunction("data/ir",req)) {SSPA_APIs.sspaGetDataIr(req, res);}
    if (checkFunction("/config/ss",req)) {SSPA_APIs.sspaGetConfigSS(req, res);}
    if (checkFunction("/config/ss",req,"POST")) {SSPA_APIs.sspaPostConfigSS(req, res);}
    if (checkFunction("/config/strategy",req)) {SSPA_APIs.sspaGetConfigStrategy(req, res);}
    if (checkFunction("/config/strategy",req,"POST")) {SSPA_APIs.sspaPostConfigStrategy(req, res);}
    if (checkFunction("/device/status",req)) {SSPA_APIs.sspaGetDeviceStatus(req, res);}
    if (checkFunction("/device/list",req)) {SSPA_APIs.sspaGetDeviceList(req, res);}
    if (checkFunction("/device/list",req, "POST")) {SSPA_APIs.sspaPostDeviceList(req, res);}
    if (checkFunction("/qe",req)) {SSPA_APIs.sspaGetQE(req, res);}
    if (checkFunction("/alarm",req)) {SSPA_APIs.sspaGetAlarm(req, res);}


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




