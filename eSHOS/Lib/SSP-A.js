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
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbActionPerform(CoreData.TCPClients[SSDevice]);
        })
        res.end("");


    },

    /**
     * Action Refresh
     */
    sspaGetActionsRefresh: function (req, res) {

        req.rootRoute = "actions/refresh";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbActionRefresh(CoreData.TCPClients[SSDevice],channel);
        });
        res.end('')
    },

    /**
     * Action Backlight
     */
    sspaGetActionsBacklight: function (req, res) {

        req.rootRoute = "actions/backlight";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
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
            SSPB_APIs.sspbActionBacklight(CoreData.TCPClients[SSDevice], mode, options);
        })
        res.end('')
    },

    /**
     * Data Sync
     */
    sspaGetDataSync: function (req, res) {

        req.rootRoute = "data/sync";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDataSync(CoreData.TCPClients[SSDevice], sepid, channel);
        })
        res.end('')
    },

    /**
     * Data Recent
     */
    sspaGetDataRecent: function (req, res) {

        req.rootRoute = "data/recent";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDataRecent(CoreData.TCPClients[SSDevice], sepid, channel);
        })
        res.end('')
    },


    /**
     * Data IR
     */
    sspaGetDataIr: function(req, res) {

        req.rootRoute = "data/ir";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {

            SSPB_APIs.sspbDataIR(CoreData.TCPClients[SSDevice]);
        })
        res.end('')
    },


    /**
     * Config SS
     */
    sspaGetConfigSS: function(req, res) {

        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbConfigssGet(CoreData.TCPClients[SSDevice]);
        })
        res.end('')

    },

    sspaPostConfigSS: function (req, res) {
        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req);

        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbConfigssPost(CoreData.TCPClients[SSDevice]);
        })
        res.end('')
    },


    /**
     * Config SS
     */

    sspaGetConfigStrategy: function(req, res) {

        req.rootRoute = "/config/strategy/htsp";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var stid = APIQuery.query.STID;
            SSPB_APIs.sspbConfigStrategyHTSPGet(CoreData.TCPClients[SSDevice], stid);
        })
        res.end('')

    },

    sspaPostConfigStrategy: function(req, res) {
        req.rootRoute = "/config/strategy/htsp";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbConfigStrategyHTSPPost(CoreData.TCPClients[SSDevice]);
        })

        res.end('')
    },


    /**
     * Device Status
     */

    sspaGetDeviceStatus: function(req, res) {

        req.rootRoute = "/device/status";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDeviceStatus(CoreData.TCPClients[SSDevice], sepid, channel);
        })

        res.end('')

    },


    /**
     * Device List
     */

    sspaGetDeviceList: function(req, res) {

        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbDeviceListGet(CoreData.TCPClients[SSDevice]);
        })

        res.end('')

    },

    sspaPostDeviceList: function(req, res) {
        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbDeviceListPost(CoreData.TCPClients[SSDevice]);
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

        if(APIQuery.device = []){

            SSPB_APIs.sspbQE(CoreData.TCPClients[actionData.SSDeviceID], actionData.action, actionData.SCDeviceID, actionData);

        }   else    {
            APIQuery.device.forEach(function (SSDevice) {
                SSPB_APIs.sspbQE(CoreData.TCPClients[actionData.SSDeviceID], APIQuery.query.action, APIQuery.query.SEPID, actionData);
            })
        }


        res.end('')

    },

    /**
     * Alarm
     */

    sspaGetAlarm: function (req, res) {

        req.rootRoute = "/alarm";
        var APIQuery = parseExpressURI(req);

        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbAlarm(CoreData.TCPClients[SSDevice]);
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


        switch(query.action){
            case "DM":
                data["CH"] = publicMethods.translateChannel(parseInt(query.CH));
                data["topos"] = query.TOPOS;
                data["duration"] = query.duration;
                data["MD"] = CoreData.deviceREF[query.SEPID].moduleID;
                data["SCDeviceID"] = "SC" + CoreData.deviceREF[query.SEPID].managedSC
                data["SSDeviceID"] = CoreData.deviceREF[query.SEPID].managedSS
                break;
            case "DMM":
                data["CH"] = query.CH;
                data["topos"] = query.TOPOS;
                data["duration"] = query.duration;
                data["MD"] = query.MDID;
                data["SCDeviceID"] = query.SCDeviceID
                data["SSDeviceID"] = CoreData.deviceREF[query.SCDeviceID].managedSS
                break;
            case "WP":
                data["CH"] = publicMethods.translateChannel(parseInt(query.CH));
                data["topos"] = query.TOPOS;
                data["MD"] = CoreData.deviceREF[query.SEPID].moduleID;
                data["SCDeviceID"] = "SC" + CoreData.deviceREF[query.SEPID].managedSC
                data["SSDeviceID"] = CoreData.deviceREF[query.SEPID].managedSS
                break;
            case "WPM":
                data["CH"] =query.CH;
                data["topos"] = query.TOPOS;
                data["MD"] = query.MDID;
                data["SCDeviceID"] = query.SCDeviceID
                data["SSDeviceID"] = CoreData.deviceREF[query.SCDeviceID].managedSS
                break;
            case "UR":
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
                data["SSDeviceID"] = CoreData.deviceREF[query.SEPID].managedSS
                break;
            default:
                break;

        }
        console.log(data)
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
        for (var deviceID in CoreData.deviceStatus){
            fetchResult[deviceID] = {}
            fetchResult[deviceID]["statusData"] = {}
            for (var channelID in CoreData.deviceStatus[deviceID]){

                fetchResult[deviceID]["statusData"]["C" + channelID] = {}
                fetchResult[deviceID]["statusData"]["C" + channelID]["value"] = CoreData.deviceStatus[deviceID][channelID].value
            }
        }
        for(var deviceID in CoreData.sensorStatus){
            fetchResult[deviceID] = {}
            fetchResult[deviceID]["sensorData"] = {}
            for (var channelID in CoreData.sensorStatus[deviceID]){

                try{


                    fetchResult[deviceID]["sensorData"][channelID] = {}
                    fetchResult[deviceID]["sensorData"][channelID]["value"] = parseInt(CoreData.sensorStatus[deviceID][channelID])

                    if(channelID == "CO"){
                        fetchResult[deviceID]["sensorData"][channelID]["value"] = 0
                    }


                }   catch(err){

                }
            }
        }
        //console.log(CoreData.sensorStatus)

        console.log(JSON.stringify(fetchResult))
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
