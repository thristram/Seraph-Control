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

    sspaGetConfigHome: function(req, res){
        req.rootRoute = "/config/home";

        var APIQuery = parseExpressURI(req);
        var SSPAProtocolData = new SSPAData(req, res);
        var fetchedResult = SSPAProtocolData.homeConfigs();

        res.end(JSON.stringify(fetchedResult))
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

        let APIQuery = parseExpressURI(req);
        let SSPAProtocolData = new SSPAData(req, res);
        let fetchedResult = SSPAProtocolData.deviceDataStatus();

        res.end(JSON.stringify(fetchedResult))

    },

    sspaDataHistory: function (req, res){
        req.rootRoute = "/data/history";
        let SSPAProtocolData = new SSPAData(req, res);
        SSPAProtocolData.sensorDataHistory(function(data){
            res.end(JSON.stringify(data))
        })

    },

    sspaGetHomeData: function(req, res) {
        req.rootRoute = "/home/data";

        let SSPAProtocolData = new SSPAData(req, res);
        let fetchedResult = SSPAProtocolData.homeData();

        res.end(JSON.stringify(fetchedResult))

    },

    sspaGetAC: function (req, res){
        req.rootRoute = "/ac/control";
        let APIQuery = parseExpressURI(req);
        this.sspaAC(APIQuery.query);
        res.end('');

    },

    sspaAC(query){
        let SSDeviceID = query.SSDeviceID;
        if(SSDeviceID){
            let ACDevice = CoreData.Seraph.getACBySSDeviceID(SSDeviceID);

            if(query.TP){
                let temperature = parseInt(query["TP"]);
                ACDevice.setTemperature(temperature)
            }
            if(query.mode){
                let mode = parseInt(query["mode"]);
                ACDevice.setMode(mode)
            }
            if(query.power){
                let ACPower = true;
                if (query.power === "1"){
                    ACPower = true
                }   else    {
                    ACPower = false
                }

                ACDevice.setPower(ACPower);
            }
            if(query.fanSpeed){
                let fanSpeed = parseInt(query.fanSpeed);
                ACDevice.setFanSpeed(fanSpeed)
            }
            ACDevice.executeACCommand();

        }
        // res.end('')
    },
    /**
     * Quick Event
     */

    sspaGetQE: function (req, res) {

        req.rootRoute = "/qe";
        let APIQuery = parseExpressURI(req);

        let SSPAActions = new SSPAAction();
        let actionData = SSPAActions.qeAction(APIQuery.query);

        SSPB_APIs.sspbQE(actionData.SSDeviceID, actionData.action, actionData.SCDeviceID, actionData);


        res.end('')

    },

    /**
     * Alarm
     */

    sspaGetAlarm: function (req, res) {

        req.rootRoute = "/alarm";
        let APIQuery = parseExpressURI(req);

        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbAlarm(SSDeviceID);
        });


        res.end('')

    },

    sspaActionLearnIR: function (req, res){

        req.rootRoute = "/actions/learn/ir";
        let APIQuery = parseExpressURI(req);
        this.sspaEActionLearnIR(APIQuery.query);
        res.end('')
    },

    sspaActionIR: function (req, res){

        req.rootRoute = "/actions/ir";
        let APIQuery = parseExpressURI(req);

        this.sspaEActionIR(APIQuery.query);

        res.end('')
    },


    sspaEActionLearnIR: function(command){
        let SSDeviceID = command.SSDeviceID;
        if(SSDeviceID){
            SSPB_APIs.sspbActionLearnIR(SSDeviceID);
        }
    },

    sspaEActionIR: function (command){

        let SSDeviceID = command.SSDeviceID;
        let brand = parseInt(command.brand);
        let code = command.code;
        if(SSDeviceID){
            SSPB_APIs.sspbActionIR(SSDeviceID, brand, code)
        }

        res.end('')
    },

}





/************************************/

        //SSP-A API Function//

/************************************/


let parseExpressURI = function(request){
    let query;
    if(request.method === "GET") {
        query = url.parse(request.url, true).query;
    }	else if(request.method === "POST") {

        query = request.body;
    }

    if(!query.protocolType) query.protocolType = "SSP-A";
    if(!query.ssuid) query.ssuid = "";
    let APIQuery = {
        action 			: request.rootRoute,
        query 			: query,
        paramURL 		: request.url,
        method 			: request.method,
        device			: query.ssuid.split(","),
        protocolType    : query.protocolType
    };
    publicMethods.eventTitle("REQUEST RECEIVED",1,APIQuery.protocolType + " Request");



    publicMethods.dataLog(APIQuery,"SSP-A Request");

    if(APIQuery.device[0] == ''){
        APIQuery.device = [];
        publicMethods.eventTitle("NO DEVICE SELECTED",2,APIQuery.protocolType + " Request",true);

    }

    return APIQuery;
}
class SSPAAction{
    constructor(req, res){
        this.req = req;
        this.res = res;
    }

    qeAction(query){
        var data = {};
        data["action"] = query.action;
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
        this.apiBase = "";
        this.query = {};
        this.req = req;
        this.res = res;
        if (req){
            if (req.rootRoute){
                this.apiBase = req.rootRoute;
            }
            this.query = parseExpressURI(req).query;
        }

    }
    deviceDataStatus(){
        var fetchResult = {};
        let list = [];
        list = CoreData.Seraph.getDeviceList(["SL","SP"]);
        for (let key in list){
            let deviceID = list[key];
            let device = CoreData.Seraph.getDevice(deviceID);
            fetchResult[deviceID] = {};
            fetchResult[deviceID]["statusData"] = {};
            fetchResult[deviceID]["deviceStatus"] = device.deviceStatus;
            for (let cID in device.channels){
                let channel = device.channels[cID];
                let channelID = parseInt(cID) + 1;
                fetchResult[deviceID]["statusData"]["C" + channelID] = {};
                fetchResult[deviceID]["statusData"]["C" + channelID]["value"] = channel.getValue();
            }
            if (device.type === "SP"){
                fetchResult[deviceID]["sensorData"] = {};
                fetchResult[deviceID]["sensorData"]["EG"] = device.getSensor("EG").getValue();
            }

        }
        list = CoreData.Seraph.getDeviceList(["SS"]);
        for (let key in list){
            let deviceID = list[key];
            if(deviceID !== "SS000000"){
                let device = CoreData.Seraph.getDevice(deviceID);
                fetchResult[deviceID] = {};
                fetchResult[deviceID]["sensorData"] = {};
                fetchResult[deviceID]["deviceStatus"] = device.deviceStatus;
                for (let sensorID in device.sensors){
                    let sensor = device.sensors[sensorID];
                    try{
                        fetchResult[deviceID]["sensorData"][sensorID] = {};
                        fetchResult[deviceID]["sensorData"][sensorID]["value"] = parseInt(sensor.getValue())
                    }   catch(err){

                    }
                }
            }

        }
        list = CoreData.Seraph.getDeviceList(["SAAC"]);
        for (let key in list){
            let deviceID = list[key];
            let device = CoreData.Seraph.getDevice(deviceID);
            let SSDevice = CoreData.Seraph.getDevice(device.SSDeviceID);
            fetchResult[deviceID] = {};
            fetchResult[deviceID]["ACDeviceData"] = {
                "targetTemperature" : device.IRCodecs.targetTemperature,
                "fanSpeed"          : device.IRCodecs.fanSpeed,
                "mode"              : device.IRCodecs.mode,
                "power"             : device.IRCodecs.power,

            };
            fetchResult[deviceID]["deviceStatus"] = SSDevice.deviceStatus;


        }
        return fetchResult
    }
    homeNotifications(){
        let fetchedMessages = CoreData.Seraph.notification.getMessagesByLatestNID(this.query.latestNID ? this.query.latestNID : 0);
        return fetchedMessages;
    }
    homeData(){
        let fetchedResult = {};
        let deviceDataStatus = this.deviceDataStatus();

        fetchedResult = {
            "homeID"             :   CoreData.Seraph.homeID,
            "deviceDataStatus"   :   deviceDataStatus,
            "notifications"      :   this.homeNotifications()
        };
        return fetchedResult;
    }

    homeFloors(){
        let fetchResult = {};
        let floors = CoreData.Seraph.floors;
        for(let key in floors){
            let floor = floors[key];
            fetchResult[floor.floorID] = {
                floorID     : floor.floorID,
                name        : floor.getName(),
                position    : floor.position,
                rooms       : floor.getRoomIDs()
            }
        }
        return fetchResult
    }

    homeRooms(){
        let fetchResult = {};
        let rooms = CoreData.Seraph.rooms;
        for(let key in rooms){
            let room = rooms[key];
            fetchResult[room.roomID] = {
                roomID      : room.roomID,
                name        : room.name,
                devices     : room.getDeviceList()
            }
        }
        return fetchResult
    }

    homeDevices(){
        let fetchResult = {};
        let devices = CoreData.Seraph.devices;
        for(let key in devices){
            let device = devices[key];
            fetchResult[device.deviceID]= {
                deviceID    : device.deviceID,
                model       : device.model
            };

            switch(device.constructor.name){
                case "SSDevice":
                    fetchResult[device.deviceID]["webCam"] = {
                        "webcamUID"         : device.webcamUID,
                        "webcamUsername"    : device.webcamUsername,
                        "webcamPassword"    : device.webcamPassword,
                    };

                    break;
                case "SCEPDevice":
                    fetchResult[device.deviceID]["SCDeviceID"] = device.SCDeviceID;
                    fetchResult[device.deviceID]["MDID"] = device.MDID;
                    if(!fetchResult[device.deviceID].hasOwnProperty("channels")){
                        fetchResult[device.deviceID]["channels"] = {}
                    }
                    for(let key in device.channels){
                        let channel = device.channels[key];
                        let CChannel = "C" + channel.channelID;
                        if(!fetchResult[device.deviceID]["channels"].hasOwnProperty(CChannel)){
                            fetchResult[device.deviceID]["channels"][CChannel] = {}
                        }
                        fetchResult[device.deviceID]["channels"]["C" + channel.channelID]["name"] = channel.name;
                    }
                    break;
                case "ACDevice":
                    fetchResult[device.deviceID]["brand"] = device.brand;
                    fetchResult[device.deviceID]["SSDeviceID"] = device.SSDeviceID;
                    fetchResult[device.deviceID]["isHAVC"] = device.isHAVC;
                    fetchResult[device.deviceID]["brandName"] = device.brandName;
                    fetchResult[device.deviceID]["modelName"] = device.modelName;
                    break;
                default:
                    break;
            }
        }

        return fetchResult

    }

    homeConfigs(){
        let fetchedResult = {};
        let devices = this.homeDevices();
        let rooms = this.homeRooms();
        let floors = this.homeFloors();

        fetchedResult = {
            "homeID"            :   CoreData.Seraph.homeID,
            "sensorThrehold"    :   CoreData.Seraph.threshold,
            "modes"             :   CoreData.Seraph.modes,
            "quickAccesses"     :   CoreData.Seraph.quickAccesses,
            "devices"           :   devices,
            "rooms"             :   rooms,
            "floors"            :   floors,

        };
        return fetchedResult;

    }

    sensorDataHistory(callback){
        let fetchResult = {};
        let timeScale = 24 * 3600;
        SQLAction.SQLSelect("seraph_sensor_log", "*", "timestamp > " + (publicMethods.timestamp() - 24 * 3600 * 10), "timestamp", function(rawData){
            if(rawData !== []){

                for(let key in rawData){

                    let item = rawData[key];
                    //console.log(item)
                    let deviceID = item.deviceID;
                    let sensorID = item.channel;
                    let sensorValue = parseInt(item.value);
                    let currentDate = Math.floor((parseInt(item.timestamp)) / timeScale) * timeScale;


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
module.exports.SSPAData = { SSPAData };
module.exports.SSPAAction = { SSPAAction };
