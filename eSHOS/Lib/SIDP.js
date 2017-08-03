/**
 * Created by fangchenli on 7/11/17.
 */

var public = require("./public.js");
var TCPClient = require ("./TCPClient.js");
var constructSIDPMessage = require("./Construct/constructSIDPMessage.js");
var TEST_APIs = require("./TEST_API.js");
var SSPA_APIs = require("./SSP-A.js");

/************************************/

        //SIDP API Function//

/************************************/


module.exports = {
    sidpPostAction: function(req, res) {
        var displayedMessage = "";
        req.rootRoute = "/sidp/action";
        if(!req.body.protocolType) req.body.protocolType = "SICP";
        var APIQuery = SSPA_APIs.parseExpressURI(req);
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

            var msg = constructSIDPMessage.consructSIDPAction(
                APIQuery.protocolType,
                false,
                new Buffer(TEST_APIs.defaultMeshID,'hex'),
                APIQuery.query.type,
                data
            );
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
            displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
            TEST_APIs.currentData = TEST_APIs.currentData + displayedMessage;
        });

        var displayObject = {message: displayedMessage};
        res.end(JSON.stringify(displayObject));

    },
    sidpPostReceipt: function(req, res) {
        var displayedMessage = "";
        req.rootRoute = "/sidp/receipt";
        if(!req.body.protocolType) req.body.protocolType = "SICP";
        var APIQuery = SSPA_APIs.parseExpressURI(req);

        APIQuery.device.forEach(function (SSDevice) {

            var msg = constructSIDPMessage.consructSIDPReceipt(
                APIQuery.protocolType,
                false,
                new Buffer(TEST_APIs.defaultMeshID,'hex'),
                APIQuery.query.type
            );
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
            displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
            TEST_APIs.currentData = TEST_APIs.currentData + displayedMessage;
        });

        var displayObject = {message: displayedMessage};
        res.end(JSON.stringify(displayObject));

    },
    sidpPostAlarm: function(req, res) {
        var displayedMessage = "";
        req.rootRoute = "/sidp/alarm";
        if(!req.body.protocolType) req.body.protocolType = "SICP";
        var APIQuery = SSPA_APIs.parseExpressURI(req);

        APIQuery.device.forEach(function (SSDevice) {

            msg = constructSIDPMessage.consructSIDPAlarm(
                APIQuery.protocolType,
                false,
                new Buffer(TEST_APIs.defaultMeshID,'hex'),
                APIQuery.query.type
            );
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
            displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
            TEST_APIs.currentData = TEST_APIs.currentData + displayedMessage;
        });

        var displayObject = {message: displayedMessage};
        res.end(JSON.stringify(displayObject));

    },
    sidpPostBLE: function(req, res) {
        var displayedMessage = "";
        req.rootRoute = "/sidp/ble";
        if(!req.body.protocolType) req.body.protocolType = "SICP";
        var APIQuery = SSPA_APIs.parseExpressURI(req);

        APIQuery.device.forEach(function (SSDevice) {

            msg = constructSIDPMessage.consructSIDPBLE(
                APIQuery.protocolType,
                false,
                new Buffer(TEST_APIs.defaultMeshID,'hex'),
                APIQuery.query.type
            );
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
            displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
            TEST_APIs.currentData = TEST_APIs.currentData + displayedMessage;
        });

        var displayObject = {message: displayedMessage};
        res.end(JSON.stringify(displayObject));

    },
    sidpPostConfig: function(req, res) {
        var displayedMessage = "";
        req.rootRoute = "/sidp/config";
        if(!req.body.protocolType) req.body.protocolType = "SICP";
        var APIQuery = SSPA_APIs.parseExpressURI(req);
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
                new Buffer(TEST_APIs.defaultMeshID,'hex'),
                parseInt(APIQuery.query.type),
                data
            );
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
            displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
            TEST_APIs.currentData = TEST_APIs.currentData + displayedMessage;
        });

        var displayObject = {message: displayedMessage};
        res.end(JSON.stringify(displayObject));

    },
    sidpPostLED: function(req, res, next) {
        var displayedMessage = "";
        req.rootRoute = "/sidp/led";
        if(!req.body.protocolType) req.body.protocolType = "SICP";
        var APIQuery = SSPA_APIs.parseExpressURI(req);
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
                new Buffer(TEST_APIs.defaultMeshID,'hex'),
                parseInt(APIQuery.query.type),
                data
            );
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
            displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
            TEST_APIs.currentData = TEST_APIs.currentData + displayedMessage;
        });

        var displayObject = {message: displayedMessage};
        res.end(JSON.stringify(displayObject));

    },
    sidpPostCMD: function(req, res) {
        var displayedMessage = "";
        req.rootRoute = "/sidp/cmd";
        if(!req.body.protocolType) req.body.protocolType = "SICP";
        var APIQuery = SSPA_APIs.parseExpressURI(req);
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
                new Buffer(TEST_APIs.defaultMeshID,'hex'),
                APIQuery.query.type,
                data
            );
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
            displayedMessage = displayedMessage +  req.body.protocolType + " MESSAGE SENT: " + public.bufferString(msg) + '\n';
            TEST_APIs.currentData = TEST_APIs.currentData + displayedMessage;
        });

        var displayObject = {message: displayedMessage};
        res.end(JSON.stringify(displayObject));

    }

}

