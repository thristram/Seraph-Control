/**
 * Created by fangchenli on 6/24/17.
 */
var public = require("./public.js");
var constructMessage = require ("./constructMessage.js")
var TCPClient = require ("./TCPClient.js");
var SSPB_APIs = require ("./SSP-B.js");



var queueing = false;
var commandQueue = {};
var commandQueueCH = {}
var queueingTime = 1000;

module.exports = {

    SPCControl: function(SSDeviceID, deviceID, moduleID, channelID, on){


        var options = {
            "MD"    : moduleID,
            "CH"    : channelID,
        };

        on?options["topos"] = "99":options["topos"] = "00";

        addToQueue("SP", SSDeviceID, deviceID, options)
    },


    SLCControl: function(SSDeviceID, deviceID, moduleID, channelID, value){


        if(value == 100){
            value = "99"
        }
        if((parseInt(value) < 10) && (parseInt(value)) > -1){
            value = "0" + value;
        }

        var options = {
            "MD"    : moduleID,
            "CH"    : channelID,
            "topos" : value
        };

        addToQueue("SL", SSDeviceID, deviceID, options)

    }
}
function addToQueue(type, SSDeviceID, deviceID, options){
    var queueItem = {};
    for(var key in options){
        queueItem[key] = options[key]
    }
    queueItem ["options"] = options;
    queueItem ["type"] = type;
    queueItem ["SSDeviceID"] = SSDeviceID;
    queueItem ["deviceID"] = deviceID;


    var commandQueueName = queueItem.type + "_" + queueItem.deviceID + "_" + queueItem.MD + "_" + queueItem.topos;

    if(!commandQueueCH.hasOwnProperty(commandQueueName)){
        commandQueueCH[commandQueueName] = [];
        commandQueue[commandQueueName] = [];
    }
    commandQueue[commandQueueName].push(queueItem);
    commandQueueCH[commandQueueName].push(parseInt(queueItem.CH));

    if(!queueing){
        queueing = true;
        setTimeout(function(){

            processQueue();
        }, queueingTime)
    }
}
function processQueue(){
    for(var key in commandQueueCH){
        var resultCH = 0;
        for (var sKey in commandQueueCH[key]){
            resultCH = resultCH | commandQueueCH[key][sKey];
        }
        commandQueue[key][0].CH = resultCH;
        commandQueue[key][0].options.CH = resultCH;
        console.log(commandQueue[key][0]);
        if(commandQueue[key][0].type == "SL"){
            SSPB_APIs.sspbQE(TCPClient.TCPClients[commandQueue[key][0].SSDeviceID], "DM", commandQueue[key][0].deviceID, commandQueue[key][0].options);
        }   else if (commandQueue[key][0].type == "SP"){
            SSPB_APIs.sspbQE(TCPClient.TCPClients[commandQueue[key][0].SSDeviceID], "WP", commandQueue[key][0].deviceID, commandQueue[key][0].options);
        }
    }
    commandQueue = {};
    commandQueueCH = {}
    queueing =  false;

}