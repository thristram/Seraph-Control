/**
 * Created by fangchenli on 7/10/17.
 */

var SQLAction = require("./SQLAction.js");

var deviceREF = {};
var channelData = {};
var sensorData = {};
loadHomeKitData()

function loadHomeKitData(){

    SQLAction.SQLSelect("seraph_device","type||deviceID as deviceID, type, model, managedSS, managedSC, moduleID","","",function(deviceData){

        for (var key in deviceData){
            deviceREF[deviceData[key].deviceID] = deviceData[key]
        }
        module.exports.deviceREF = deviceREF

        SQLAction.SQLSelect("seraph_sc_device","type||deviceID as deviceID, channel, type","type = 'SL' OR type = 'SP'","",function(cData){

            module.exports.channelData = cData;

            SQLAction.SQLSelect("seraph_sensor","deviceID, channel, code","code = 'TP' OR code = 'HM'","",function(sData){

                module.exports.sensorData = sData;
            })
        });
    })
}
module.exports = {
    deviceREF : deviceREF,
    channelData: channelData,
    sensorData: sensorData
}