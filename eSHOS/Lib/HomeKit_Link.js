/**
 * Created by fangchenli on 6/24/17.
 */
var public = require("./public.js");
var constructMessage = require ("./constructMessage.js")
var TCPClient = require ("./TCPClient.js");
var SSPB_APIs = require ("./SSP-B.js");
var EventEmitter = require('events');
var debug = require('debug')('HomeKit_Link');

var queueing = false;
var commandQueue = {};
var commandQueueCH = {};
var queueingTime = 300;
var HAPEvent = new EventEmitter.EventEmitter();


module.exports = {

    SPCControl: function(SSDeviceID, deviceID, moduleID, channelID, on){

        debug("[%s] Calling SPC Control from HomeKit", public.getDateTime());
        var options = {
            "MD"    : moduleID,
            "CH"    : public.translateChannel(channelID),
        };

        on?options["topos"] = "99":options["topos"] = "00";

        addToQueue("SP", SSDeviceID, deviceID, options)
    },


    SLCControl: function(SSDeviceID, deviceID, moduleID, channelID, value){

        debug("[%s] Calling SLC Control from HomeKit", public.getDateTime());
        if(value == 100){
            value = "99"
        }
        if((parseInt(value) < 10) && (parseInt(value)) > -1){
            value = "0" + value;
        }

        var options = {
            "MD"    : moduleID,
            "CH"    : public.translateChannel(channelID),
            "topos" : value
        };

        addToQueue("SL", SSDeviceID, deviceID, options)

    },
    SSPReceipt: function(){
        debug("[%s] Receipt Received.....Communicating with HAP Server....", public.getDateTime());
        this.HAPEvent.emit('recepit');
    },
    HAPEvent: HAPEvent,

}


function addToQueue(type, SSDeviceID, deviceID, options){
    var queueItem = {};
    for(var key in options){
        queueItem[key] = options[key]
    }
    queueItem ["type"] = type;
    queueItem ["SSDeviceID"] = SSDeviceID;
    queueItem ["deviceID"] = deviceID;


    var commandQueueName = queueItem.type + "_" + queueItem.deviceID + "_" + queueItem.topos;

    if(!commandQueueCH.hasOwnProperty(commandQueueName)){
        commandQueueCH[commandQueueName] = {};
        commandQueue[commandQueueName] = {};
    }
    if(!commandQueueCH[commandQueueName].hasOwnProperty(queueItem.MD)){
        commandQueueCH[commandQueueName][queueItem.MD] = [];
        commandQueue[commandQueueName][queueItem.MD] = [];
    }
    //console.log(commandQueue);
    commandQueue[commandQueueName][queueItem.MD].push(queueItem);
    commandQueueCH[commandQueueName][queueItem.MD].push(parseInt(queueItem.CH));
    
    if(!queueing){
        queueing = true;
        setTimeout(function(){

            processQueue();
        }, queueingTime)
    }
}
function processQueue(){

    for(var key in commandQueueCH){

        var i = 0;
        var resultCHs = [];
        var resultMDs = [];
        var results = {};
        var commandType = "";

        for(var mdKey in commandQueueCH[key]){
            var resultCH = 0;
            
            for (var chKey in commandQueueCH[key][mdKey]){
                resultCH = resultCH | commandQueueCH[key][mdKey][chKey];
            }

            commandQueue[key][mdKey][0].CH = resultCH;
            results = commandQueue[key][mdKey][0];
            resultCHs.push(resultCH);
            resultMDs.push(mdKey);
            console.log(resultMDs);
            i++;
        }

        if(results.type == "SL"){
            commandType = "DM";
        }   else if (results.type == "SP"){
            commandType = "WP";
        }
        if(i > 1){
            commandType += "M";
        }
        results.CH = resultCHs.join();
        results.MD = resultMDs.join();
        //console.log(results);
        //console.log(commandType);
        SSPB_APIs.sspbQE(TCPClient.TCPClients[results.SSDeviceID], commandType, results.deviceID, results);


        
    }
    commandQueue = {};
    commandQueueCH = {}
    queueing =  false;

}