/**
 * Created by Thristram on 12/10/16.
 */

var url = require('url');


var SSPB_APIs = require("./SSP-B.js");
var config = require("../../config.js");
var publicMethods = require("./public.js");
var CoreData = require ("./CoreData.js");
var SQLAction = require("./SQLAction.js");
/************************************/

            //SSP-A API//

/************************************/

module.exports = {
    /**
     * Action Perform
     */
    sspaGetActionsPerform: function (req, res) {

        req.rootRoute = "actions/perform";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbActionPerform(SSDeviceID);
        })
        res.end("");


    },

    /**
     * Action Refresh
     */
    sspaGetActionsRefresh: function (req, res) {

        req.rootRoute = "actions/refresh";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbActionRefresh(SSDeviceID,channel);
        });
        res.end('')
    },

    /**
     * Action Backlight
     */
    sspaGetActionsBacklight: function (req, res) {

        req.rootRoute = "actions/backlight";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            var mode = APIQuery.query.mode;
            var options = {};
            if(APIQuery.query.colors){
                options["colors"] = APIQuery.query.colors.split(",");
            }
            if(APIQuery.query.density){
                options["density"] = APIQuery.query.density;
            }
            if(APIQuery.query.speed){
                options["speed"] = APIQuery.query.speed;
            }
            if(APIQuery.query.display){
                options["display"] = parseInt(APIQuery.query.display)
            }
            if(APIQuery.query.timeIn){
                options["timeIn"] = parseInt(APIQuery.query.timeIn)
            }
            if(APIQuery.query.timeOut){
                options["timeOut"] = parseInt(APIQuery.query.timeOut)
            }
            if(APIQuery.query.timeDuration){
                options["timeDuration"] = parseInt(APIQuery.query.timeDuration)
            }
            if(APIQuery.query.timeBlank){
                options["timeBlank"] = parseInt(APIQuery.query.timeBlank)
            }
            SSPB_APIs.sspbActionBacklight(SSDeviceID, mode, options);
        })
        res.end('')
    },

    /**
     * Data Sync
     */
    sspaGetDataSync: function (req, res) {

        req.rootRoute = "data/sync";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDataSync(SSDeviceID, sepid, channel);
        })
        res.end('')
    },

    /**
     * Data Recent
     */
    sspaGetDataRecent: function (req, res) {

        req.rootRoute = "data/recent";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDataRecent(SSDeviceID, sepid, channel);
        })
        res.end('')
    },


    /**
     * Data IR
     */
    sspaGetDataIr: function(req, res) {

        req.rootRoute = "data/ir";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {

            SSPB_APIs.sspbDataIR(SSDeviceID);
        })
        res.end('')
    },


    /**
     * Config SS
     */
    sspaGetConfigSS: function(req, res) {

        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbConfigssGet(SSDeviceID);
        })
        res.end('')

    },

    sspaPostConfigSS: function (req, res) {
        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req);

        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbConfigssPost(SSDeviceID);
        })
        res.end('')
    },


    /**
     * Config SS
     */

    sspaGetConfigStrategy: function(req, res) {

        req.rootRoute = "/config/strategy/htsp";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            var stid = APIQuery.query.STID;
            SSPB_APIs.sspbConfigStrategyHTSPGet(SSDeviceID, stid);
        })
        res.end('')

    },

    sspaPostConfigStrategy: function(req, res) {
        req.rootRoute = "/config/strategy/htsp";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbConfigStrategyHTSPPost(SSDeviceID);
        })

        res.end('')
    },


    /**
     * Device Status
     */

    sspaGetDeviceStatus: function(req, res) {

        req.rootRoute = "/device/status";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDeviceStatus(SSDeviceID, sepid, channel);
        })

        res.end('')

    },


    /**
     * Device List
     */

    sspaGetDeviceList: function(req, res) {

        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbDeviceListGet(SSDeviceID);
        })

        res.end('')

    },

    sspaPostDeviceList: function(req, res) {
        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbDeviceListPost(SSDeviceID);
        })

        res.end('')
    },


    sspaGetDeviceDataStatus: function(req, res) {
        req.rootRoute = "/device/dataStatus";

        var APIQuery = parseExpressURI(req);
        var SSPAProtocolData = new SSPAData(req, res);
        var fetchedResult = SSPAProtocolData.deviceDataStatus();

        res.end(JSON.stringify(fetchedResult))

    },

    sspaDataHistory: function (req, res){

        let SSPAProtocolData = new SSPAData()
        SSPAProtocolData.sensorDataHistory(function(data){
            res.end(JSON.stringify(data))
        })

    },
    /**
     * Quick Event
     */

    sspaGetQE: function (req, res) {

        req.rootRoute = "/qe";
        var APIQuery = parseExpressURI(req);

        var SSPAActions = new SSPAAction()
        var actionData = SSPAActions.qeAction(APIQuery.query)

        SSPB_APIs.sspbQE(actionData.SSDeviceID, actionData.action, actionData.SCDeviceID, actionData);


        res.end('')

    },

    /**
     * Alarm
     */

    sspaGetAlarm: function (req, res) {

        req.rootRoute = "/alarm";
        var APIQuery = parseExpressURI(req);

        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbAlarm(SSDeviceID);
        })


        res.end('')

    }

}





/************************************/

        //SSP-A API Function//

/************************************/


var parseExpressURI = function(request){
    var query;
    if(request.method == "GET") {
        query = url.parse(request.url, true).query;
    }	else if(request.method == "POST") {

        query = request.body;
    }

    if(!query.protocolType) query.protocolType = "SSP-A";
    if(!query.ssuid) query.ssuid = "";
    var APIQuery = {
        action 			: request.rootRoute,
        query 			: query,
        paramURL 		: request.url,
        method 			: request.method,
        device			: query.ssuid.split(","),
        protocolType    : query.protocolType
    };
    publicMethods.eventTitle("REQUEST RECEIVED",1,APIQuery.protocolType + " Request");



    publicMethods.dataLog(APIQuery,"SSP-A Request")

    if(APIQuery.device[0] == ''){
        APIQuery.device = [];
        publicMethods.eventTitle("NO DEVICE SELECTED",2,APIQuery.protocolType + " Request",true);

    }

    return APIQuery;
}
class SSPAAction{
    constructor(req, res){
        this.req = req
        this.res = res
    }

    qeAction(query){
        var data = {}
        data["action"] = query.action
        let device = {};
        let SCDevice = {};
        if(query.SEPID){
            device = CoreData.Seraph.getDevice(query.SEPID);
        }
        if(query.SCDeviceID){
            SCDevice = CoreData.Seraph.getDevice(query.SCDeviceID);
        }

        switch(query.action){
            case "DM":
                data["CH"] = publicMethods.translateChannel(parseInt(query.CH));
                data["topos"] = query.TOPOS;
                data["duration"] = query.duration;
                data["MD"] = device.MDID;
                data["SCDeviceID"] = device.SCDeviceID;
                data["SSDeviceID"] = device.SSDeviceID;
                break;
            case "DMM":
                //let SCDevice = CoreData.Seraph.getDevice(query.SCDeviceID);
                data["CH"] = query.CH;
                data["topos"] = query.TOPOS;
                data["duration"] = query.duration;
                data["MD"] = query.MDID;
                data["SCDeviceID"] = query.SCDeviceID;
                data["SSDeviceID"] = SCDevice.SSDeviceID;
                break;
            case "WP":
                //let device = CoreData.Seraph.getDevice(query.SEPID);
                data["CH"] = publicMethods.translateChannel(parseInt(query.CH));
                data["topos"] = query.TOPOS;
                data["MD"] = device.MDID;
                data["SCDeviceID"] = device.SCDeviceID;
                data["SSDeviceID"] = device.SSDeviceID;
                break;
            case "WPM":
                //let SCDevice = CoreData.Seraph.getDevice(query.SCDeviceID);
                data["CH"] =query.CH;
                data["topos"] = query.TOPOS;
                data["MD"] = query.MDID;
                data["SCDeviceID"] = query.SCDeviceID;
                data["SSDeviceID"] = SCDevice.SSDeviceID;
                break;
            case "UR":
                //let device = CoreData.Seraph.getDevice(query.SEPID);
                if(query.hasOwnProperty("type")){
                    data["type"] = query.type;
                }
                if(query.hasOwnProperty("code")){
                    data["code"] = query.code;
                }
                if(query.hasOwnProperty("raw")){
                    data["raw"] = query.raw;
                }
                if(query.hasOwnProperty("address")){
                    data["address"] = query.address;
                }
                if(query.hasOwnProperty("other")){
                    data["other"] = query.other;
                }
                data["SSDeviceID"] = device.SSDeviceID;
                break;
            default:
                break;

        }
        return data
    }
}
class SSPAData{
    constructor(req, res){
        this.req = req
        this.res = res
    }
    deviceDataStatus(){
        var fetchResult = {}
        for (let key in CoreData.Seraph.getDeviceList(["SL","SP"])){
            let deviceID = CoreData.Seraph.getDeviceList(["SL","SP"])[key];
            let device = CoreData.Seraph.getDevice(deviceID);
            fetchResult[deviceID] = {};
            fetchResult[deviceID]["statusData"] = {};
            for (let cID in device.channels){
                let channel = device.channels[cID];
                let channelID = parseInt(cID) + 1;
                fetchResult[deviceID]["statusData"]["C" + channelID] = {}
                fetchResult[deviceID]["statusData"]["C" + channelID]["value"] = channel.getValue();
            }
        }

        for (let key in CoreData.Seraph.getDeviceList(["SS"])){
            let deviceID = CoreData.Seraph.getDeviceList(["SS"])[key];
            if(deviceID != "SS000000"){
                let device = CoreData.Seraph.getDevice(deviceID);
                fetchResult[deviceID] = {}
                fetchResult[deviceID]["sensorData"] = {}
                for (let sensorID in device.sensors){
                    let sensor = device.sensors[sensorID];
                    try{
                        fetchResult[deviceID]["sensorData"][sensorID] = {}
                        fetchResult[deviceID]["sensorData"][sensorID]["value"] = parseInt(sensor.getValue())

                        if(sensorID == "CO"){
                            fetchResult[deviceID]["sensorData"][sensorID]["value"] = 0
                        }
                    }   catch(err){

                    }
                }
            }

        }

        return fetchResult
    }

    sensorDataHistory(callback){
        var fetchResult = {};
        var timeScale = 24 * 3600
        SQLAction.SQLSelect("seraph_sensor_log", "*", "timestamp > " + (publicMethods.timestamp() - 24 * 3600 * 10), "timestamp", function(rawData){
            if(rawData != []){

                for(var key in rawData){

                    var item = rawData[key];
                    //console.log(item)
                    var deviceID = item.deviceID;
                    var sensorID = item.channel;
                    var sensorValue = parseInt(item.value)
                    var currentDate = Math.floor(parseInt(item.timestamp) / timeScale) * timeScale


                    if(!fetchResult.hasOwnProperty(deviceID)){
                        fetchResult[deviceID] = {}
                    }
                    if(!fetchResult[deviceID].hasOwnProperty("sensorHistoryData")){
                        fetchResult[deviceID]["sensorHistoryData"] = {}
                    }
                    if(!fetchResult[deviceID]["sensorHistoryData"].hasOwnProperty(currentDate)){
                        fetchResult[deviceID]["sensorHistoryData"][currentDate] = {}
                    }
                    if(!fetchResult[deviceID]["sensorHistoryData"][currentDate].hasOwnProperty(sensorID)){
                        fetchResult[deviceID]["sensorHistoryData"][currentDate][sensorID] = []
                    }
                    fetchResult[deviceID]["sensorHistoryData"][currentDate][sensorID].push(sensorValue)
                }
            }
            callback(fetchResult)
        })


    }
}

module.exports.parseExpressURI = parseExpressURI;
module.exports.SSPAData = { SSPAData }
module.exports.SSPAAction = { SSPAAction }
