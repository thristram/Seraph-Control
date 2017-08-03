/**
 * Created by fangchenli on 7/10/17.
 */

var SQLAction = require("./SQLAction.js");
var TCPClient = require("./TCPClient.js");


var deviceREF = {};
var channelData = {};
var sensorData = {};
var deviceStatus = {};
var sensorStatus = {};
var sysConfigs = {};

var loadHomeKitData = function(callback){

    SQLAction.SQLSelect("seraph_device","type||deviceID as deviceID, type, model, managedSS, managedSC, moduleID","","",function(deviceData){

        for (var key in deviceData){
            deviceREF[deviceData[key].deviceID] = deviceData[key]
        }
        module.exports.deviceREF = deviceREF

        SQLAction.SQLSelect("seraph_sc_device","type||deviceID as deviceID, channel, type, value, lastupdate","type = 'SL' OR type = 'SP'","",function(cData){
            //console.log(cData);

            for(var dKey in cData){
                if(!deviceStatus.hasOwnProperty(cData[dKey].deviceID)){
                    deviceStatus[cData[dKey].deviceID] = {};
                }
                deviceStatus[cData[dKey].deviceID][cData[dKey].channel] = cData[dKey];
            }
            module.exports.channelData = cData;
            module.exports.deviceStatus = deviceStatus;
            //console.log(deviceStatus)

            SQLAction.SQLSelect("seraph_sensor","deviceID, channel, code, value, lastupdate","","",function(sData){


                for(var sKey in sData){
                    if(!sData.hasOwnProperty(sData[sKey].deviceID)) {sensorStatus[sData[sKey].deviceID] = {}}
                    sensorStatus[sData[sKey].deviceID][sData[sKey].channel] = sData[sKey];
                }
                module.exports.sensorData = sData;
                module.exports.sensorStatus = sensorStatus;

                callback();
            })
        });
    })
};

var loadSysConfig = function(callback){
    if(sysConfigs == {}){
        var sql = "SELECT * FROM config";
        SQLAction.SQLConnection.all(sql, function(err, res) {
            res.forEach(function (value) {
                module.exports.sysConfigs[value.name] = value.value;
            })
            callback()
        });
    }   else    {
        callback();
    }


};


loadSysConfig(function(){});



module.exports.deviceREF = deviceREF;
module.exports.channelData = channelData;
module.exports.sensorData = sensorData;
module.exports.deviceStatus = deviceStatus;
module.exports.sensorStatus = sensorStatus;
module.exports.loadHomeKitData = loadHomeKitData;
module.exports.sysConfigs = sysConfigs;
module.exports.loadSysConfig = loadSysConfig;