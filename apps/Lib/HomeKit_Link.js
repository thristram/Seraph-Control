/**
 * Created by fangchenli on 6/24/17.
 */
var public = require("./public.js");
var constructMessage = require ("./constructMessage.js")
var Seraph = require ("./CoreData.js");
//var Seraph = require ("./TCPClient.js");
var SSPB_APIs = require ("./SSP-B.js");
var EventEmitter = require('events');
var debug = require('debug')('HomeKit_Link');

var queueing = false;
var initialQueue = {};
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

        if((parseInt(value) < 10) && (parseInt(value)) > -1){
            value = "0" + value;
        }

        if(parseInt(value) == 100){
            value = "FF";
        }

        var options = {
            "MD"    : moduleID,
            "CH"    : public.translateChannel(channelID),
            "topos" : value,
            "duration"  : 20
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
    var commandQueueName = type + "_" + deviceID + "_" + options.MD + "_" + options.CH;
    initialQueue[commandQueueName] = {
        "type"          :   type,
        "SSDeviceID"    :   SSDeviceID,
        "deviceID"      :   deviceID,
        "options"       :   options
    }

    if(!queueing){
        queueing = true;
        setTimeout(function(){
            for(var key in initialQueue){
                addToProcessQueue(initialQueue[key].type, initialQueue[key].SSDeviceID, initialQueue[key].deviceID, initialQueue[key].options);
            }
            processQueue();
        }, queueingTime)
    }
}

function addToProcessQueue(type, SSDeviceID, deviceID, options){
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
    

}
function processQueue(){
    initialQueue = {};
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
        SSPB_APIs.sspbQE(results.SSDeviceID, commandType, results.deviceID, results);


        
    }
    commandQueue = {};
    commandQueueCH = {}
    queueing =  false;

}