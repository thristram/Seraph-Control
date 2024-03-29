/**
 * Created by fangchenli on 7/11/17.
 */


var public = require("./public.js");
var SQLAction =  require ("./SQLAction.js");
var webAction = require("./webAction.js");
var Seraph =  require ("./CoreData.js");
/************************************/

//SSP-B Object//

/************************************/

module.exports = {
    SSConfigObject: function(){
        var config = webAction.getSSConfig();
        var weatherLocation = webAction.getWeatherLocation();
        var conf = {
            system 		: config.system,
            wifi 		: config.wifi,
            time 		: public.timestamp(),
            location 	: weatherLocation.location,
            weather 	: weatherLocation.weather
        }

        return conf;

    },

    strategyExecutionObject: function(){
        var strategy = [{
            seqid 		: 1,
            sepid 		: "SL03Y87D",
            CH 			: 52,
            action 		: "DM",
            topos 		: 99,
            option 		: {
                duration 	: 3,
                erase 		: 1,
            },
            stseq 		: 0,
            timeout 	: 3
        },{
            seqid 		: 2,
            sepid 		: "SP048372",
            CH 			: 32,
            action 		: "WP",
            topos 		: 1,
            stseq 		: 0,
            timeout 	: 3
        }
        ];
        return strategy;
    },
    strategyConditionObject: function(){

        var condition = "this.HM = 1 || floor.TP > 10 && home.PR = true";
        return condition;

    },
    deviceListObject: function (ssid,callback){

        var queryWhere = ['SC','ST'];
        var queryField = ['deviceID', 'model', 'coord'];

        SQLAction.SQLSelect("seraph_device", queryField, "managedSS = '" + ssid + "' AND (type = '" + queryWhere.join("' OR type = '") + "')", "", function(res){

            var data = {
                "deviceID"  : ssid,
                "devices"   : []
            }
            for(var i = 0; i < res.length; i ++){
                var subDevice = {};
                subDevice["deviceID"] = res[i].deviceID;
                subDevice["model"] = res[i].model;
                subDevice["coords"] = res[i].coords;
                data.devices.push(subDevice);

            }
            public.eventLog(JSON.stringify(data));
            callback(data);
        })
    },
    dataSTObject: function(SSDeviceID){
        let fetchedResult = {};
        for(let deviceID in Seraph.devices.devices){
            let ST = Seraph.devices.devices[deviceID];
            if((ST.type === "ST") && (ST.SSDeviceID === SSDeviceID)){
                fetchedResult[deviceID] = {
                    key0    : ST.getRoomBrightness(true),
                    key1    : ST.getKey("key1").getBrightness(true),
                    key2    : ST.getKey("key2").getBrightness(true),
                    key3    : ST.getKey("key3").getBrightness(true)
                }
            }
        }
        return fetchedResult
    },
    configSTObject: function(ssid, callback){
        var stConfig = {};
        SQLAction.SQLSelect("seraph_device","type, deviceID","managedSS = '" + ssid + "' AND type = 'ST'","",function(stData){
            if(stData != []){
                var stIDs = [];
                for(var stKey in stData){
                    stIDs.push(stData[stKey].deviceID);
                    stConfig[stData[stKey].deviceID] = []
                }
                SQLAction.SQLSelect("seraph_st_config","*","deviceID = '" + stIDs.join("' OR deviceID = '") + "'","",function(stConfigData){
                    if(stConfigData != []) {


                        for (var stConfigKey in stConfigData) {

                            var singleSTConfigData = {}
                            singleSTConfigData["type"] = parseInt(stConfigData[stConfigKey].type);
                            singleSTConfigData["targetID"] = stConfigData[stConfigKey].targetID;
                            singleSTConfigData["CH"] = stConfigData[stConfigKey].CH;
                            singleSTConfigData["action"] = stConfigData[stConfigKey].action;

                            if(stConfigData[stConfigKey].targetID.substring(0,2) == "SC"){

                                singleSTConfigData["MDID"] = parseInt(stConfigData[stConfigKey].moduleID);

                            }

                            if(parseInt(stConfigData[stConfigKey].type) == 1){

                                singleSTConfigData["key"] = parseInt(stConfigData[stConfigKey].STKey);

                            }   else if(parseInt(stConfigData[stConfigKey].type) == 2){

                                singleSTConfigData["cond"] = stConfigData[stConfigKey].cond;
                                singleSTConfigData["value"] = parseInt(stConfigData[stConfigKey].value);
                            }
                            stConfig[stConfigData[stConfigKey].deviceID].push(singleSTConfigData);

                        }
                        callback(stConfig);
                    }   else    {
                        public.eventError("No ST Config Found");
                        callback(false);
                    }
                })
            }   else   {
                public.eventError("No ST Found");
                callback(false)
            }
        })
    }
}


