/**
 * Created by fangchenli on 7/10/17.
 */

var net = require('net');

var SQLAction = require("./SQLAction.js");
var public = require("./public.js");
var TCPClient = require("./TCPClient.js");
var SSPB_APIs = require("./SSP-B.js");

var deviceREF = {};
var channelData = {};
var sensorData = {};
var deviceStatus = {};
var sensorStatus = {};
var sysConfigs = {};
var homeKitIdentifierCache = {};
var geographicData = {};


var TCPClients = {};
var SSPBCommands = {};

var IP2DeviceID = {};



var loadHomeKitData = function(callback){

    SQLAction.SQLSelect("seraph_device","type||deviceID as deviceID, type, model, managedSS, managedSC, moduleID","","",function(deviceData){

        for (var key in deviceData){
            deviceREF[deviceData[key].deviceID] = deviceData[key]
        }

        SQLAction.SQLSelect("seraph_sc_device","type||deviceID as deviceID, channel, type, value, lastupdate","type = 'SL' OR type = 'SP'","",function(cData){
            //console.log(cData);

            for(var dKey in cData){
                if(!deviceStatus.hasOwnProperty(cData[dKey].deviceID)){
                    deviceStatus[cData[dKey].deviceID] = {};
                }
                deviceStatus[cData[dKey].deviceID][cData[dKey].channel] = cData[dKey];
            }
            channelData = cData;

            SQLAction.SQLSelect("seraph_sensor","deviceID, channel, code, value, lastupdate","","",function(sData){


                for(var sKey in sData){
                    if(!sData.hasOwnProperty(sData[sKey].deviceID)) {sensorStatus[sData[sKey].deviceID] = {}}
                    sensorStatus[sData[sKey].deviceID][sData[sKey].code] = sData[sKey];
                }
                sensorData = sData;
                dataSync();

                HomeKitCachePreLoad(function(){
                    callback();
                });


            })
        });
    })
};

var HomeKitCacheSet = function(key,saved) {
    var value = JSON.stringify(saved);
    homeKitIdentifierCache[key] = value;
    dataSync();
    SQLAction.SQLFind("seraph_HomeKit_cache", "id", {"key": key}, function (data) {

        if(data.length == 0){
            SQLAction.SQLAdd("seraph_HomeKit_cache", {"key":key, "value":value})

        }   else    {
            SQLAction.SQLSetField("seraph_HomeKit_cache", {"key":key,"value":value}, {"key": key})
        }
    })
};
var HomeKitCacheGet = function(key) {
    if(homeKitIdentifierCache.hasOwnProperty(key)){
        return homeKitIdentifierCache[key];
    }   else    {
        return null
    }

};
var HomeKitCachePreLoad = function(callback) {
    SQLAction.SQLSelect("seraph_HomeKit_cache", "*", "","", function (data) {
        if(data != []){
            for(var key in data){
                homeKitIdentifierCache[data[key].key] = JSON.parse(data[key].value);
                homeKitIdentifierCache = homeKitIdentifierCache;
            }
            dataSync();
            callback();
        }   else    {
            callback(null)
        }
    })
};

var loadSysConfig = function(callback){
    if(sysConfigs == {}){
        SQLAction.SQLSelect("config", "*", "","", function (data) {
            data.forEach(function (value) {
                sysConfigs[value.name] = value.value;
            });
            dataSync();
            callback()
        })
    }   else    {
        callback();
    }


};

var updateSensorValue = function(value, channel, deviceID){
    //SQLAction.SQLSetField("seraph_sensor",{"value" : value, "lastupdate": public.timestamp()},{"code":channel, "deviceID" : deviceID});
    switch(channel){
        case "EG":
            recordSensorValue(value, channel, deviceID);
            break;
        case "MI":
            recordSensorValue(value, channel, deviceID);
        case "HM":
        case "TP":
        case "PT":
        case "SM":
        case "BT":
        case "CO":
        case "CD":
        case "VO":
            sensorStatus[deviceID][channel] = value;
            break;
        default:
            break;
    }
    dataSync();
};

var recordSensorValue = function(value, channel, deviceID){
    var timestamp = public.timestamp();
    var data = {
        channel     : channel,
        deviceID    : deviceID,
        value       : value,
        timestamp   : timestamp
    }
    SQLAction.SQLAdd("seraph_sensor_log", data);
}

var updateDeviceStatus = function(value, channel, deviceID, deviceType) {
    SQLAction.SQLSetField("seraph_sc_device",{"value" : value, "lastupdate": public.timestamp()},{"channel" : channel, "deviceID" : deviceID, "type" : deviceType});
    deviceStatus[deviceID][channel] = value;
    dataSync();
};



var setSysConfig = function (data){
    for (var key in data){
        SQLAction.SQLSetField("config", {"value" : data[key]}, {"name" : key})
        sysConfigs[key] = data[key];
    }
    dataSync();

};

var setGeographicData = function(data){
    for (var key in data){
        SQLAction.SQLSetField("temp_variable", {"value" : data[key]}, {"name" : key})
        geographicData[key] = data[key];
    }
    dataSync();
};

var recordSSPBCommands = function(data){
    var commandData = {
        messageID 		: data.MessageID,
        action 			: data.topicType,
        parameter 		: JSON.stringify(data.topicExt),
        requestedURI 	: data.Topic,
        method 			: data.MessageType,
        timestamp 		: public.timestamp(),
        qos 			: data.QosNeeded,
        payload         : data.payload,
        respondQoS      : 0,
        lastRespondTime : 0,
        finished        : 0,
    };
    SQLAction.SQLAdd("seraph_sspb_command_logs",commandData);
    if(data.hasOwnProperty("hash")){
        commandData["hash"] = data.hash;
    }

    SSPBCommands[commandData.messageID] = commandData;
    dataSync();
};

var getSSPBCommands = function(messageID, callback){
    if(SSPBCommands.hasOwnProperty(messageID)){
        callback(SSPBCommands[messageID]);
    }   else    {
        var query = "messageID = '" + messageID + "' AND (finished = 0 OR finished IS NULL)";
        SQLAction.SQLFind("seraph_sspb_command_logs","*", query,function(SQLData){
            SSPBCommands[messageID] = SQLData;
            dataSync();
            callback(SQLData);
        });
    }
};

var recordSSPBReturn = function(messageID, data){

    var lastRespondTime = public.timestamp();
    SSPBCommands[messageID].respondQoS++;
    SSPBCommands[messageID].lastRespondTime = lastRespondTime;
    if(SSPBCommands[messageID].respondQoS == SSPBCommands[messageID].qos){
        SSPBCommands[messageID].finished = 1;
        SQLAction.SQLSetField("seraph_sspb_command_logs",{"finished" : 1, "lastRespondTime" : lastRespondTime },{"messageID" : messageID});
        delete(SSPBCommands[messageID]);
    }
    dataSync();

};

var createAllTCPClients = function(){

    SQLAction.SQLSelect("seraph_device","*", "type='SS' AND IPAddress != '' AND IPAddress IS NOT NULL","",function(SQLData){
        for(var key in SQLData){

            var deviceID = SQLData[key].deviceID;

            if(SQLData[key].isServer == 1){
                setSingleTCPClient(deviceID, SQLData[key]);
            }   else    {
                TCPClients[deviceID] = SQLData[key];
                TCPClients[deviceID].TCPClient = new net.Socket();
                TCPClients[deviceID].reConnecting = false;
                TCPClients[deviceID].isClient = true;


                TCPClient.TCPConnect2Server(deviceID);
                TCPClient.TCPHandleFromServer(deviceID);

                dataSync();


            }
        }
    });
};

var setSingleTCPClient = function(deviceID, clientInfo, ifActive){
    var IPAddress = clientInfo.IPAddress;
    IP2DeviceID[IPAddress] = deviceID;

    TCPClients[deviceID] = clientInfo;
    TCPClients[deviceID].reConnecting = false;
    TCPClients[deviceID].isClient = false;

    if(ifActive){
        TCPClients[deviceID].cStatus = 1;
    }   else    {
        TCPClients[deviceID].cStatus = 0;
    }

    dataSync();

    var timeout = 10000;
    if(IPAddress != "127.0.0.1"){

        setInterval(function(){
            if(TCPClients[deviceID].cStatus == 1) {
                //SSPB_APIs.sspbDeviceStatus(TCPClients[deviceID]);
                setTimeout(function () {
                    SSPB_APIs.sspbDataSync(TCPClients[deviceID]);
                }, 1000);
            }
        },timeout);

    }
};

var findTCPClientByIP = function(remoteAddress){

    return IP2DeviceID[remoteAddress];

    /*
    for(var key in TCPClients){
        if(TCPClients[key].IPAddress == remoteAddress){
            return TCPClients[key].deviceID;
        }

    }
    return false;
    */
};

var setTCPClientOnline = function(deviceID){
    TCPClients[deviceID].cStatus = 1;
}

var setTCPClientOffline = function(deviceID){
    TCPClients[deviceID].cStatus = 0;
}





var dataSync = function(){
    module.exports.deviceREF = deviceREF;
    module.exports.channelData = channelData;
    module.exports.sensorData = sensorData;

    module.exports.deviceStatus = deviceStatus;
    module.exports.sensorStatus = sensorStatus;
    module.exports.homeKitIdentifierCache = homeKitIdentifierCache;

    module.exports.sysConfigs = sysConfigs;
    module.exports.geographicData = geographicData;
    module.exports.TCPClients = TCPClients;

    module.exports.SSPBCommands = SSPBCommands;

};

loadSysConfig(function(){});
dataSync();


module.exports.loadHomeKitData = loadHomeKitData;
module.exports.loadSysConfig = loadSysConfig;
module.exports.updateSensorValue = updateSensorValue;
module.exports.updateDeviceStatus = updateDeviceStatus;
module.exports.HomeKitCacheSet = HomeKitCacheSet;
module.exports.HomeKitCacheGet = HomeKitCacheGet;
module.exports.HomeKitCachePreLoad = HomeKitCachePreLoad;
module.exports.setSysConfig = setSysConfig;
module.exports.setGeographicData = setGeographicData;
module.exports.recordSSPBCommands = recordSSPBCommands;
module.exports.getSSPBCommands = getSSPBCommands;
module.exports.recordSSPBReturn = recordSSPBReturn;
module.exports.createAllTCPClients = createAllTCPClients;
module.exports.setSingleTCPClient = setSingleTCPClient;
module.exports.findTCPClientByIP = findTCPClientByIP;
module.exports.setTCPClientOnline = setTCPClientOnline;
module.exports.setTCPClientOffline = setTCPClientOffline;