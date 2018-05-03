/**
 * Created by Thristram on 12/10/16.
 */

var url = require('url');


var SSPB_APIs = require("./SSP-B.js");
var config = require("../../config.js");
var publicMethods = require("./public.js");
var Seraph = require ("./CoreData.js");
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
        var APIQuery = parseExpressURI(req, res);
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
        var APIQuery = parseExpressURI(req, res);
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
        var APIQuery = parseExpressURI(req, res);
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
        var APIQuery = parseExpressURI(req, res);
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
        var APIQuery = parseExpressURI(req, res);
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
        var APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    APIQuery.device.forEach(function (SSDeviceID) {

			    SSPB_APIs.sspbDataIR(SSDeviceID);
		    })
		    res.end('')
	    }
    },


    /**
     * Config SS
     */
    sspaGetConfigSS: function(req, res) {

        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req, res);
        APIQuery.device.forEach(function (SSDeviceID) {
            SSPB_APIs.sspbConfigssGet(SSDeviceID);
        })
        res.end('')

    },

    sspaPostConfigSS: function (req, res) {
        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req, res);

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
        var APIQuery = parseExpressURI(req, res);
        APIQuery.device.forEach(function (SSDeviceID) {
            var stid = APIQuery.query.STID;
            SSPB_APIs.sspbConfigStrategyHTSPGet(SSDeviceID, stid);
        })
        res.end('')

    },

    sspaPostConfigStrategy: function(req, res) {
        req.rootRoute = "/config/strategy/htsp";
        var APIQuery = parseExpressURI(req, res);
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
        var APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    APIQuery.device.forEach(function (SSDeviceID) {
			    var sepid = APIQuery.query.SEPID;
			    var channel = APIQuery.query.CH;
			    SSPB_APIs.sspbDeviceStatus(SSDeviceID, sepid, channel);
		    })

		    res.end('')
	    }

    },

    sspaGetConfigHome: function(req, res){
        req.rootRoute = "/config/home";

        var APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    var SSPAProtocolData = new SSPAData(req, res);
		    var fetchedResult = SSPAProtocolData.homeConfigs();
		    res.end(JSON.stringify(fetchedResult))
	    }

    },


    /**
     * Device List
     */

    sspaGetDeviceList: function(req, res) {

        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    APIQuery.device.forEach(function (SSDeviceID) {
			    SSPB_APIs.sspbDeviceListGet(SSDeviceID);
		    })

		    res.end('')
	    }

    },

    sspaPostDeviceList: function(req, res) {
        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    APIQuery.device.forEach(function (SSDeviceID) {
			    SSPB_APIs.sspbDeviceListPost(SSDeviceID);
		    })

		    res.end('')
	    }
    },


    sspaGetDeviceDataStatus: function(req, res) {
        req.rootRoute = "/device/dataStatus";

        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    let SSPAProtocolData = new SSPAData(req, res);
		    let fetchedResult = SSPAProtocolData.deviceDataStatus();

		    res.end(JSON.stringify(fetchedResult))
	    }

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
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    this.sspaAC(APIQuery.query);
		    res.end('');
	    }

    },

    sspaAC(query){
        console.log(query);
        let SSDeviceID = query.SSDeviceID;
        if(SSDeviceID){
            let ACDevice = Seraph.devices.getACBySSDeviceID(SSDeviceID);

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
            if(query.autoMode){
                ACDevice.autoMode = true
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
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    let SSPAActions = new SSPAAction();
		    let actionData = SSPAActions.qeAction(APIQuery.query);
		    SSPB_APIs.sspbQE(actionData.SSDeviceID, actionData.action, actionData.SCDeviceID, actionData);
		    res.end('')
	    }

    },
    sspaPOSTControl: function (req, res){

        req.rootRoute = "/control";
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    let command = APIQuery.query;
		    Seraph.commandSystem.execute("/groupControl/room", command);
	    }
    },

    /**
     * Alarm
     */

    sspaGetAlarm: function (req, res) {

        req.rootRoute = "/alarm";
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    let command = APIQuery.query;
		    Seraph.commandSystem.execute("/alarm/trigger", command);
		    res.end('')
	    }

    },
	sspaGetAlarmHoldSM: function (req, res) {

		req.rootRoute = "/alarm";
		let APIQuery = parseExpressURI(req, res);
		if(APIQuery.statusCode === 200) {
			let command = APIQuery.query;
			Seraph.commandSystem.execute("/alarm/holdsm", command);
			res.end('')
		}

	},
    sspaConfigST: function (req, res) {

        req.rootRoute = "/config/ST";
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    let command = APIQuery.query;
		    Seraph.commandSystem.execute("/config/ST", command);

		    res.end('')
	    }

    },
    sspaConfigMFiChallenge: function(req, res){
	    req.rootRoute = "/config/mfichallenge";
	    let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    let command = APIQuery.query;
		    // setInterval(function(){
		    //    Seraph.commandSystem.execute("/config/mfichallenge", command);
		    // }, 100)
		    Seraph.commandSystem.execute("/config/mfichallenge", command);

		    res.end('')
	    }
    },
    sspaTestSTClick: function (req, res) {

        req.rootRoute = "/test/STClick";
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    let STDeviceID = APIQuery.query.SEPID;
		    let value = parseInt(APIQuery.query.value);
		    let keyPad = parseInt(APIQuery.query.keyPad);
		    let ST = Seraph.devices.getDevice(STDeviceID);

		    if (ST) {

			    ST.executeCommand(keyPad, value);
		    }

		    res.end('')
	    }

    },

    sspaActionLearnIR: function (req, res){

        req.rootRoute = "/actions/learn/ir";
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    this.sspaEActionLearnIR(APIQuery.query);
		    res.end('')
	    }
    },

    sspaActionIR: function (req, res){

        req.rootRoute = "/actions/ir";
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    this.sspaEActionIR(APIQuery.query);

		    res.end('')
	    }
    },

    sspaSetMode: function(req, res){
        console.log("Setting Mode");
        req.rootRoute = "/mode/setMode";
        let APIQuery = parseExpressURI(req, res);
	    if(APIQuery.statusCode === 200) {
		    if (Seraph.commandSystem.execute("/mode/setMode", APIQuery.query)) {
			    res.end('')
		    }
	    }
    },
	sspaUpdateSS: function(req, res){
		console.log("Update SS");
		req.rootRoute = "/update/ss";
		let APIQuery = parseExpressURI(req, res);
		if(APIQuery.statusCode === 200) {
			Seraph.commandSystem.execute("/update/ss", APIQuery.query);
			res.end('')

		}
	},
    sspaConfigChangeServeAs: function(req, res){
        console.log("Setting Mode");
        req.rootRoute = "/config/changeServeAs";
        let APIQuery = parseExpressURI(req, res);
        if(APIQuery.statusCode === 200){
	        Seraph.commandSystem.execute("/config/changeServeAs", APIQuery.query)
	        es.end('')
        }


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
    },



}





/************************************/

        //SSP-A API Function//home

/************************************/


let parseExpressURI = function(request, response){
    let query;
    if(request.method === "GET") {
        query = url.parse(request.url, true).query;
    }	else if(request.method === "POST") {

        query = request.body;
    }

    if (query.homeID === Seraph.homeID){
        if(!query.protocolType) query.protocolType = "SSP-A";
        if(!query.ssuid) query.ssuid = "";
        var APIQuery = {
	        statusCode      : 200,
            action 			: request.rootRoute,
            query 			: query,
            paramURL 		: request.url,
            method 			: request.method,
            device			: query.ssuid.split(","),
            protocolType    : query.protocolType
        };
        publicMethods.eventTitle("REQUEST RECEIVED",1,APIQuery.protocolType + " Request");
        publicMethods.dataLog(APIQuery,"SSP-A Request");

        if(APIQuery.device[0] === ''){
            APIQuery.device = [];
            publicMethods.eventTitle("NO DEVICE SELECTED",2,APIQuery.protocolType + " Request",true);

        }
        return APIQuery;
    }   else    {
        if(response){
            response.statusCode = 401;
            response.end('{"code":401,"error":"Unauthorized"}');

        }
        var APIQuery = {
        	statusCode : 401
        };
	    return APIQuery;
    }






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
            device = Seraph.devices.getDevice(query.SEPID);
        }
        if(query.SCDeviceID){
            SCDevice = Seraph.devices.getDevice(query.SCDeviceID);
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
                //let SCDevice = Seraph.devices.getDevice(query.SCDeviceID);
                data["CH"] = query.CH;
                data["topos"] = query.TOPOS;
                data["duration"] = query.duration;
                data["MD"] = query.MDID;
                data["SCDeviceID"] = query.SCDeviceID;
                data["SSDeviceID"] = SCDevice.SSDeviceID;
                break;
            case "WP":
                //let device = Seraph.devices.getDevice(query.SEPID);
                if(query.channel){
                    data["CH"] = query.channel;
                }   else    {
                    data["CH"] = publicMethods.translateChannel(parseInt(query.CH));
                }

                data["topos"] = query.TOPOS;
                if(query.SCDeviceID){
                    data["MD"] = query.MDID;
                    data["SCDeviceID"] = SCDevice.deviceID;
                    data["SSDeviceID"] = SCDevice.SSDeviceID;

                }   else    {
                    data["MD"] = device.MDID;
                    data["SCDeviceID"] = device.SCDeviceID;
                    data["SSDeviceID"] = device.SSDeviceID;
                }

                break;
            case "WPM":
                //let SCDevice = Seraph.devices.getDevice(query.SCDeviceID);
                data["CH"] = query.CH;
                data["topos"] = query.TOPOS;
                data["MD"] = query.MDID;
                data["SCDeviceID"] = query.SCDeviceID;
                data["SSDeviceID"] = SCDevice.SSDeviceID;
                break;
            case "UR":
                //let device = Seraph.devices.getDevice(query.SEPID);
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

        this.isSCSCall = false;
        if (req){
            if (req.rootRoute){
                this.apiBase = req.rootRoute;
            }
            let APIQuery = parseExpressURI(req, res);
            if (APIQuery){
                this.query = APIQuery.query;
            }

        }

    }
    deviceDataStatus(){
        var fetchResult = {};
        let list = [];
        list = Seraph.devices.getDeviceList(["SL","SP"]);
        for (let key in list){
            let deviceID = list[key];
            let device = Seraph.devices.getDevice(deviceID);
            fetchResult[deviceID] = {};
            fetchResult[deviceID]["statusData"] = {};
            fetchResult[deviceID]["deviceStatus"] = device.deviceStatus.getStatus();
            fetchResult[deviceID]["errorCode"] = device.deviceStatus.errorCode;

            for (let cID in device.channels){
                let channel = device.channels[cID];
                let channelID = parseInt(cID) + 1;
                fetchResult[deviceID]["statusData"]["C" + channelID] = {};
                fetchResult[deviceID]["statusData"]["C" + channelID]["value"] = channel.getValue();
                fetchResult[deviceID]["statusData"]["C" + channelID]["serveAs"] = (channel.serveAS && channel.serveAS !== "undefined") ? channel.serveAS : "";
                fetchResult[deviceID]["statusData"]["C" + channelID]["icon"] = channel.icon;
            }
            if (device.type === "SP"){
                fetchResult[deviceID]["sensorData"] = {};
                fetchResult[deviceID]["sensorData"]["EG"] = device.getSensor("EG").getValue();
            }

        }
        list = Seraph.devices.getDeviceList(["SS"]);
        for (let key in list){
            let deviceID = list[key];
            if(deviceID !== "SS000000"){
                let device = Seraph.devices.getDevice(deviceID);
                fetchResult[deviceID] = {};
                fetchResult[deviceID]["sensorData"] = {};
                fetchResult[deviceID]["deviceStatus"] = device.deviceStatus.getStatus();
                fetchResult[deviceID]["errorCode"] = device.deviceStatus.errorCode;
                fetchResult[deviceID]["airQuality"] = device.airQuality.exportData();
	            fetchResult[deviceID]["alarmSystem"] = device.alarms.exportData();
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
        list = Seraph.devices.getDeviceList(["SAAC"]);
        for (let key in list){
            let deviceID = list[key];
            let device = Seraph.devices.getDevice(deviceID);
            let SSDevice = Seraph.devices.getDevice(device.SSDeviceID);
            fetchResult[deviceID] = {};
            fetchResult[deviceID]["ACDeviceData"] = {
                "targetTemperature" : device.targetTemperature,
                "fanSpeed"          : device.fanSpeed,
                "mode"              : device.mode,
                "power"             : device.power,
                "currentHardwareMode": device.currentHardwareMode,
                "autoMode"          : device.autoMode,
                "heatingThreshold"  : device.getHeatingThreshold(),
                "collingThreshold"  : device.getCoolingThreshold()
            };
            fetchResult[deviceID]["deviceStatus"] = device.deviceStatus.getStatus();
            fetchResult[deviceID]["errorCode"] = SSDevice.deviceStatus.errorCode;

        }
        list = Seraph.devices.getDeviceList(["ST"]);
        for (let key in list){
            let deviceID = list[key];
            let device = Seraph.devices.getDevice(deviceID);
            fetchResult[deviceID] = {};
            fetchResult[deviceID]["sensorData"] = {};
            fetchResult[deviceID]["deviceStatus"] = device.deviceStatus.getStatus();
            fetchResult[deviceID]["errorCode"] = device.deviceStatus.errorCode;
            for (let sensorID in device.sensors){
                let sensor = device.sensors[sensorID];
                try{
                    fetchResult[deviceID]["sensorData"][sensorID] = {};
                    fetchResult[deviceID]["sensorData"][sensorID]["value"] = parseInt(sensor.getValue())
                }   catch(err){

                }
            }

        }
	    list = Seraph.devices.getDeviceList(["SC"]);
	    for (let key in list){
		    let deviceID = list[key];
		    let device = Seraph.devices.getDevice(deviceID);
		    fetchResult[deviceID] = {};
		    fetchResult[deviceID]["deviceStatus"] = device.deviceStatus.getStatus();
		    fetchResult[deviceID]["errorCode"] = device.deviceStatus.errorCode;
	    }
        return fetchResult
    }
    homeNotifications(){
        try{
            let lastTimestamp = this.query.lastReportedTimestamp ? this.query.lastReportedTimestamp : 0;
            if (this.isSCSCall){
                lastTimestamp = Seraph.notification.lastReportedTimestamp;
            }
            if(Seraph.notification){
                return Seraph.notification.getLatestMessages(lastTimestamp);
            }
        }   catch (err){
            // debug(err);
            return {}
        }

        return {};
    }
    homeData(){
        let fetchedResult = {};
        let deviceDataStatus = this.deviceDataStatus();

        fetchedResult = {
            "homeID"             :   Seraph.homeID,
            "deviceDataStatus"   :   deviceDataStatus,
            "modeSystem"         :   Seraph.modes.exportData(),
            "notifications"      :   this.homeNotifications()

        };
        return fetchedResult;
    }

    homeFloors(){
        let fetchResult = {};
        let floors = Seraph.floors;
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
        let rooms = Seraph.rooms;
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
        let devices = Seraph.devices.devices;
        for(let key in devices){

            let device = devices[key];
            if(device.deviceID === "SS000000"){
            	continue;
            }
            fetchResult[device.deviceID]= {
                deviceID    : device.deviceID,
                model       : device.model
            };

            switch(device.constructor.name){
                case "SSDevice":
	                fetchResult[device.deviceID]["firmware"] = device.firmware;
	                fetchResult[device.deviceID]["meshID"] = device.meshID;
                    fetchResult[device.deviceID]["webCam"] = {
                        "webcamUID"         : device.webcamUID,
                        "webcamUsername"    : device.webcamUsername,
                        "webcamPassword"    : device.webcamPassword,
                    };
	                fetchResult[device.deviceID]["HomeKitUUID"] = {};
                    // if(device.airQuality.homeKitUUID){
		             //    fetchResult[device.deviceID]["HomeKitUUID"]["AQ"] = device.airQuality.homeKitUUID;
                    // }
                    // for(let skey in device.sensors){
						// let sensor = device.sensors[skey];
						// if(sensor.homeKitUUID){
						// 	fetchResult[device.deviceID]["HomeKitUUID"][sensor.sensorID] = sensor.homeKitUUID
						// }
                    // }

                    break;
                case "SCEPDevice":
                    fetchResult[device.deviceID]["SCDeviceID"] = device.SCDeviceID;
                    fetchResult[device.deviceID]["MDID"] = device.MDID;
	                fetchResult[device.deviceID]["model"] = device.model;

                    if(!fetchResult[device.deviceID].hasOwnProperty("channels")){
                        fetchResult[device.deviceID]["channels"] = {}
                    }
                    for(let key in device.channels){
                        let channel = device.channels[key];
                        let CChannel = "C" + channel.channelID;
                        if(!fetchResult[device.deviceID]["channels"].hasOwnProperty(CChannel)){
                            fetchResult[device.deviceID]["channels"][CChannel] = {}
                        }
                        // if(channel.homeKitUUID){
	                     //    fetchResult[device.deviceID]["channels"]["C" + channel.channelID]["HomeKitUUID"] = channel.homeKitUUID;
                        // }

                        fetchResult[device.deviceID]["channels"]["C" + channel.channelID]["name"] = channel.name;
                        fetchResult[device.deviceID]["channels"]["C" + channel.channelID]["serveAs"] = (channel.serveAS && channel.serveAS !== "undefined") ? channel.serveAS : "";
                        fetchResult[device.deviceID]["channels"]["C" + channel.channelID]["icon"] = channel.icon ? channel.icon : "";
                    }
                    break;
                case "ACDevice":
                    fetchResult[device.deviceID]["brand"] = device.brand;
                    fetchResult[device.deviceID]["SSDeviceID"] = device.SSDeviceID;
                    fetchResult[device.deviceID]["isHAVC"] = device.isHAVC;
                    fetchResult[device.deviceID]["brandName"] = device.brandName;
                    fetchResult[device.deviceID]["modelName"] = device.modelName;
                    // if(device.HomeKitUUID){
	                 //    fetchResult[device.deviceID]["HomeKitUUID"] = device.HomeKitUUID;
                    // }

                    if(device.isHAVC){
                        fetchResult[device.deviceID]["SCDeviceID"] = device.SCDeviceID;
                    }
                    break;
                case "STDevice":
                    if(!fetchResult[device.deviceID].hasOwnProperty('config')){
                        fetchResult[device.deviceID]["config"] = {};
                    }
                    fetchResult[device.deviceID]["SSDeviceID"] = device.SSDeviceID;
	                // fetchResult[device.deviceID]["config"]["room"] = device.getCommand(0);
                    fetchResult[device.deviceID]["config"]["key1"] = device.getCommand("key1");
                    fetchResult[device.deviceID]["config"]["key2"] = device.getCommand("key2");
                    fetchResult[device.deviceID]["config"]["key3"] = device.getCommand("key3");
                    fetchResult[device.deviceID]["config"]["gestureNormal"] = device.getCommand("gestureNormal");

                    break;
                default:
                    fetchResult[device.deviceID]["SSDeviceID"] = device.SSDeviceID;
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
            "homeID"            :   Seraph.homeID,
	        "eSH"               :   Seraph.geteSHInfo(),
            "sensorThrehold"    :   this.sensorThrehold(),
            "modes"             :   Seraph.modes,
            "quickAccesses"     :   Seraph.quickAccesses,
            "devices"           :   devices,
            "rooms"             :   rooms,
            "floors"            :   floors,

        };
        return fetchedResult;

    }

    sensorThrehold(){
        let fetchedData = {};
        for(let sensorID in Seraph.threshold){
            let threshold = Seraph.threshold[sensorID];
            fetchedData[sensorID] = {
                thresholds: threshold.exportHomeDataThreshold(),
                normalRule: threshold.normalRule.exportConfigHomeData()
            }
        }
        return fetchedData
    }
    sensorDataHistory(callback){
        let fetchResult = {
            homeID              :   Seraph.homeID
        };
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
