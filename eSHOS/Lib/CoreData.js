/**
 * Created by fangchenli on 7/10/17.
 */

var SQLAction = require("./SQLAction.js");
var public = require("./public.js");
var TCPClient = require("./TCPClient.js");

var deviceREF = {};
var channelData = {};
var sensorData = {};
var deviceStatus = {};
var sensorStatus = {};
var sysConfigs = {};
var homeKitIdentifierCache = {};
var geographicData = {};


var TCPClients = {};



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
    SQLAction.SQLSetField("seraph_sensor",{"value" : value, "lastupdate": public.timestamp()},{"code":channel, "deviceID" : deviceID});
    sensorStatus[deviceID][channel] = value;
    dataSync();
};

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
    SQLAction.SQLAdd("seraph_sspb_command_logs",data);
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