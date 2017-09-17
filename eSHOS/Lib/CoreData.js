/**
 * Created by fangchenli on 7/10/17.
 */

var net = require('net');
var TCPClient

var SQLAction = require("./SQLAction.js");
var publicMethods = require("./public.js");
var SSPB_APIs = require("./SSP-B.js");
var webAction = require("./webAction.js");

var pushToServer = require("./pushToServer.js").remotePush;
var { SSPAData } =  require("./SSP-A.js").SSPAData;
var { SSPAAction } =  require("./SSP-A.js").SSPAAction;

class Sensor{
    constructor(sensorID, deviceID){
        this.sensorID = "";
        this.deviceID = "";
        this.sensorName = "";
        this.shortName = "";
        this.value = 0;
        this.lastUpdate = 0;
        this.currentLog = [];
        this.currentLogFirstUpdate = 0;

        this.sensorID = sensorID;
        this.deviceID = deviceID;

        this.allocateAttribute();
    }
    setValue(value, lastUpdate){
        this.value = value;
        this.lastUpdate = lastUpdate;
        if(this.sensorID === "MI"){
            Seraph.getDevice(this.deviceID)
        }   else    {
            this.recordSensorLog()
        }


    }
    getSensorID(){
        return this.sensorID
    }
    getName(){
        return this.sensorName
    }
    getValue(){
        return this.value
    }
    addValueToLog(value){
        this.currentLog.push(value);
    }
    allocateAttribute(){
        switch (this.sensorID){
            case "CD":
                this.sensorName = "Carbon Dioxide";
                this.shortName = "CO2";
                break;
            case "CO":
                this.sensorName = "Carbon Monoxide";
                this.shortName = "CO";
                break;
            case "TP":
                this.sensorName = "Temperature";
                this.shortName = "Temperature";
                break;
            case "HM":
                this.sensorName = "Humidity";
                this.shortName = "Humidity";
                break;
            case "PT":
                this.sensorName = "PM 2.5";
                this.shortName = "PM2.5";
                break;
            case "VO":
                this.sensorName = "Volatile Organic Compound";
                this.shortName = "VOC";
                break;
            case "MI":
                this.sensorName = "Motion";
                this.shortName = "Motion";
                break;
            case "SM":
                this.sensorName = "Smoke";
                this.shortName = "Smoke";
                break;
            default:
                this.sensorName = "Sensor";
                this.shortName = "Sensor";
                break
        }
    }
    recordSensorLog(){
        let recordPeriod = 30;

        let timestamp = publicMethods.timestamp();
        this.currentLog.push(this.value);
        if(this.currentLogFirstUpdate === 0){
            this.currentLogFirstUpdate = timestamp
        }
        if((this.currentLogFirstUpdate !== 0) && (timestamp - this.currentLogFirstUpdate) > (recordPeriod * 60)){

            //Wait 30 min and process data
            let numberOfElements = this.currentLog.length;
            if(numberOfElements > 0){

                let sum = 0;
                for(let element in this.currentLog){
                    sum = sum + this.currentLog[element]
                }

                let avgData =  parseInt(sum / numberOfElements);
                let data = {
                    channel     : this.sensorID,
                    deviceID    : this.deviceID,
                    value       : avgData,
                    timestamp   : timestamp
                };
                SQLAction.SQLAdd("seraph_sensor_log", data);

            }

            this.currentLog = [];
            this.currentLogFirstUpdate = 0


        }
    }
}
class SChannel{


    constructor (channelID, channelType, deviceID, moduleID){

        //Declaring Value
        this.channelID = 0;
        this.deviceID = "";
        this.lastUpdate = 0
        this.value = 0;
        this.actionOnHold = 0;
        this.channelType = "";
        this.moduleID = 0;
        this.name = "";


        this.channelID = channelID;
        this.moduleID = moduleID;
        this.deviceID = deviceID;
        this.actionOnHold = 0;
        this.channelType = channelType;

    }
    setValue(value, lastupdate){
        this.value = parseInt(value);
        if(lastupdate){
            this.lastUpdate = parseInt(lastupdate)
        }   else    {
            this.lastUpdate = publicMethods.timestamp();
        }
        SQLAction.SQLSetField(
            "seraph_sc_device",
            {"value" : value, "lastupdate": this.lastUpdate},
            {"channel" : this.channelID, "deviceID" : this.deviceID.substring(2), "type" : this.channelType}
        );
    }

    getValue(){
        return this.value
    }
    getName(){
        if(this.name == ""){
            let name = this.channelType + " " + this.moduleID + "-" + this.channelID
            return name
        }   else    {
            return this.name
        }
    }




}
class SDevice{
    constructor(deviceID, model, SSDeviceID) {
        this.deviceID = "";
        this.model = "";
        this.type = "";
        this.deviceStatus = 0;
        this.SSDeviceID = "";

        //Init Value
        this.deviceID = deviceID;
        this.model = model;
        this.type = deviceID.substring(0,2);
        this.SSDeviceID = SSDeviceID
    }
    initSensors(sensorCodes){
        for (let key in sensorCodes){
            let sensorName = sensorCodes[key];
            this.sensors[sensorName] = new Sensor(sensorName, this.deviceID)
        }
    }
    getSensor(sensorID){
        if (this.checkExistSensor(sensorID)){
            return this.sensors[sensorID]
        }
    }
    checkExistChannel(channelID){
        if(this.type === "SP" || this.type === "SL"){
            let maxAvalibleChannel = this.channels.length;
            if ((channelID > 0) && (channelID <= maxAvalibleChannel)){
                return true
            }   else{
                return false
            }
        }   else    {
            return false
        }

    }
    checkExistSensor(sensorID){
        if(this.type === "SS") {
            if (this.sensors.hasOwnProperty(sensorID)) {
                return true
            } else {
                return false
            }
        }

    }
}
class SSDevice extends SDevice{
    constructor(deviceID, model, IPAddress){

        super(deviceID, model, deviceID);

        //Declaring Value
        this.sensors = {};
        this.motion = false;
        this.cameraEnabled = true;
        this.MDID = 0;
        this.airQuality = 1;
        this.IPAddress = "";
        this.TCPSocket = {};
        this.reConnecting = false;
        this.isServer = true;
        this.connectionStatus = false;

        //Init Value
        this.initSS();
        this.IPAddress = IPAddress;
        if(this.deviceID === "SS000000"){
            this.isServer = false;
        }   else    {
            this.initTCPSocket()
            this.initQueryCommandToSS()
        }

    }

    initSS(){
        switch(this.model){
            case "1":

                break;
            default:
                this.initSensors(["TP","HM","CO","CD","PT","VO","SM","MI"]);
                break
        }
    }
    setTCPConnectionStauts(connectionStatus){
        if(connectionStatus){
            this.connectionStatus = true;
            this.deviceStatus = 1
        }   else    {
            this.connectionStatus = false;
            this.deviceStatus = 0;
        }
    }

    getTCPConnectionStauts(){
        return this.connectionStatus;
    }

    initTCPSocket(){
        this.reConnecting = false;
    }

    initQueryCommandToSS(){
        let self = this;
        let timeout = 3000
        if(this.IPAddress !== "127.0.0.1"){
            setInterval(function(){
                if(self.getTCPConnectionStauts()) {
                    SSPB_APIs.sspbDeviceStatus(self.TCPSocket);
                    setTimeout(function () {
                        SSPB_APIs.sspbDataSync(self.TCPSocket);
                    }, 1000);
                }
            },timeout);
        }
    }

    initTCPClientSocket(){
        this.TCPSocket = new net.Socket();
        this.reConnecting = false;
        TCPClient.TCPConnect2Server(this.deviceID);
        TCPClient.TCPHandleFromServer(this.deviceID);
    }



}
class SCEPDevice extends SDevice{
    constructor(deviceID, model, SSDeviceID, SCDeviceID, MDID){

        super(deviceID, model, SSDeviceID);

        //Declaring Value
        this.channels = [];
        this.SCDeviceID = "";
        this.MDID = 0;
        this.sensors = {};

        //Init Value
        this.SCDeviceID = SCDeviceID;
        this.MDID = MDID;
        this.type = deviceID.substring(0,2);

        switch(this.type){
            case "SL":
                this.initSL();

                break;
            case "SP":
                this.initSP();
                this.initSensors(["EG"]);
                break;
            default:
                break;
        }


    }
    initSP(){
        this.channels.push(new SChannel(1, "SP", this.deviceID, this.MDID));
        this.channels.push(new SChannel(2, "SP", this.deviceID, this.MDID));
        this.channels.push(new SChannel(3, "SP", this.deviceID, this.MDID));
    }
    initSL(){
        this.channels.push(new SChannel(1, "SL", this.deviceID, this.MDID));
        this.channels.push(new SChannel(2, "SL", this.deviceID, this.MDID));


    }
    getChannel(channelID){
        let cid = parseInt(channelID)

        if (this.checkExistChannel(cid)){
            return this.channels[(cid - 1)]
        }
    }

}
class Home{

    constructor(homeID, name){

        //Declaring Value
        this.homeID = "";
        this.sensorName = "";

        //Init Value
        this.homeID = homeID;
        this.sensorName = name;
    }
}

class SeraphHome extends Home {

    constructor(homeID, name){
        super(homeID, name);
        this.devices = {};
        this.threshold = {};
        this.rooms = {};
        this.floors = {};
        this.homeKitIdentifiers = {};
        this.sysConfigs = {};
        this.geographicInfos = {};
        this.SSPBLogs = {}

        let self = this


        self.initHomeKitIdentifiers(function(){
            self.initSysConfig(function(){
                webAction.getLocalIP(function(localIP){});
                webAction.refreshAll(function(){});
                initDevices(function(){
                    assignInitialSCDeviceValue(function(){
                        assignInitialSensorValue(function(){
                            initConnectionWithSeraphCloud()
                            TCPClient = require("./TCPClient.js");
                            for(let key in self.getDeviceList(["SS"])){
                                let SSDeviceID = self.getDeviceList(["SS"])[key]
                                let SSDevice = self.getDevice(SSDeviceID);
                                if(!SSDevice.isServer){
                                    self.getDevice(SSDeviceID).initTCPClientSocket()
                                }
                            }
                            require("./test.js");
                            require("../HomeKit/BridgedCore.js");


                        })
                    })


                })

            })
        })

    }

    addDevcie(deviceID, device){
        this.devices[deviceID] = device
    }

    getDevice(deviceID){
        return this.devices[deviceID]
    }

    getDeviceList(deviceType){

        let deviceList = [];
        if(deviceType && (deviceType.length > 0)){

            for (let deviceID in this.devices){

                if (deviceType.indexOf(this.devices[deviceID].type) > (-1)){
                    deviceList.push(deviceID);
                }
            }
        }   else    {
            for (let deviceID in this.devices){
                deviceList.push(deviceID);
            }
        }
        return deviceList;
    }
    getChannelLists(){
        let channelList = []
        for(let key in this.devices) {
            let device = this.devices[key];
            if (device.type === "SP" || device.type === "SL") {
                for(let ckey in device.channels){
                    channelList.push(device.deviceID + "-" + (parseInt(ckey) + 1))
                }
            }
        }
        return channelList
    }

    getDeviceByIP(IPAddress){
        for(let key in this.devices){
            let device = this.devices[key];
            if(device.type === "SS"){
                if(IPAddress === device.IPAddress){
                    return device
                }
            }
        }
    }
    getDeviceByMDID(SCDeviceID, moduleID){
        let MDID = parseInt(moduleID)
        for(let key in this.devices) {
            let device = this.devices[key];
            if(device.type === "SP" || device.type === "SL"){
                if(device.SCDeviceID === SCDeviceID){
                    if(device.checkExistChannel(MDID)){
                        return device
                    }
                }
            }
        }
    }
    initHomeKitIdentifiers(callback){
        let self = this;
        SQLAction.SQLSelect("seraph_HomeKit_cache", "*", "","", function (data) {
            if(data != []){
                for(let key in data){
                    self.homeKitIdentifiers[data[key].key] = JSON.parse(data[key].value);
                }
                callback();
            }   else    {
                callback(null)
            }
        })
    }


    initSysConfig(callback){
        let self = this;
        SQLAction.SQLSelect("config", "*", "","", function (data) {
            for (let key in data){
                let value = data[key]
                self.sysConfigs[value.name] = value.value;
            }
            callback()
        })
    }



    setSysConfig(key, data){
        SQLAction.SQLSetField("config", {"value" : data}, {"name" : key})
        this.sysConfigs[key] = data;
    }

    setSysConfigs(data){
        for (let key in data){
            this.setSysConfig(key, data[key])
        }
        dataSync();

    }

    setGeographicInfo(key, data){
        SQLAction.SQLSetField("temp_variable", {"value" : data}, {"name" : key})
        this.geographicInfos[key] = data;
    };
    setGeographicInfos(data){
        for (var key in data){
            this.setGeographicInfo(key, data[key])
        }
    };
    getHomeKitIdentifier(key){
        if(this.homeKitIdentifiers.hasOwnProperty(key)){
            return this.homeKitIdentifiers[key];
        }   else    {
            return null
        }
    }

    setHomeKitIdentifier(key, saved){
        var value = JSON.stringify(saved);
        this.homeKitIdentifiers[key] = value;
        SQLAction.SQLFind("seraph_HomeKit_cache", "id", {"key": key}, function (data) {

            if(data.length == 0){
                SQLAction.SQLAdd("seraph_HomeKit_cache", {"key":key, "value":value})

            }   else    {
                SQLAction.SQLSetField("seraph_HomeKit_cache", {"key":key,"value":value}, {"key": key})
            }
        })
    }

    recordSSPBCommands(data){
        let commandData = {
            messageID 		: data.MessageID,
            action 			: data.topicType,
            parameter 		: JSON.stringify(data.topicExt),
            requestedURI 	: data.Topic,
            method 			: data.MessageType,
            timestamp 		: publicMethods.timestamp(),
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

        this.SSPBLogs[commandData.messageID] = commandData;
    }

    getSSPBCommands(messageID, callback){
        if(this.SSPBLogs.hasOwnProperty(messageID)){
            callback(this.SSPBLogs[messageID]);
        }   else    {
            let query = "messageID = '" + messageID + "' AND (finished = 0 OR finished IS NULL)";
            SQLAction.SQLFind("seraph_sspb_command_logs","*", query,function(SQLData){
                this.SSPBLogs[messageID] = SQLData;
                callback(SQLData);
            });
        }
    };

    recordSSPBReturn(messageID, data){

        let lastRespondTime = publicMethods.timestamp();
        this.SSPBLogs[messageID].respondQoS++;
        this.SSPBLogs[messageID].lastRespondTime = lastRespondTime;
        if(this.SSPBLogs[messageID].respondQoS == this.SSPBLogs[messageID].qos){
            this.SSPBLogs[messageID].finished = 1;
            SQLAction.SQLSetField("seraph_sspb_command_logs",{"finished" : 1, "lastRespondTime" : lastRespondTime },{"messageID" : messageID});
            delete(this.SSPBLogs[messageID]);
        }

    };

}

var tempTCPConnection = {}

var Seraph = new SeraphHome("HM0000001", "Seraph Home");

var initDevices = function(callback) {
    SQLAction.SQLSelect("seraph_device", "type||deviceID as deviceID, type, model, managedSS, managedSC, moduleID", "", "", function (deviceData) {

        for (let key in deviceData) {
            if (deviceData.hasOwnProperty(key)) {

                let deviceID = deviceData[key].deviceID;

                let model = deviceData[key].model;
                let managedSS = deviceData[key].managedSS;
                let managedSC = "SC" + deviceData[key].managedSC;
                let moduleID = deviceData[key].moduleID;
                let deviceType = deviceData[key].type;
                if (deviceType === "SS") {
                    deviceID = deviceID.substring(2);
                    let device = new SSDevice(deviceID, model);
                    Seraph.addDevcie(deviceID, device);
                } else if (deviceType === "SP" || deviceType === "SL") {
                    let device = new SCEPDevice(deviceID, model, managedSS, managedSC, moduleID);
                    Seraph.addDevcie(deviceID, device);
                } else {
                    let device = new SDevice(deviceID, model, managedSS);
                    Seraph.addDevcie(deviceID, device);
                }

            }


        }
        callback()

    });
}

var assignInitialSCDeviceValue = function(callback){
    SQLAction.SQLSelect("seraph_sc_device","type||deviceID as deviceID, channel, type, value, lastupdate", "","",function(cData) {
        //console.log(cData);

        for (let dKey in cData) {
            if (cData.hasOwnProperty(dKey)) {
                let deviceID = cData[dKey].deviceID;
                let channelID = parseInt(cData[dKey].channel);
                let value = parseInt(cData[dKey].value);
                let lastUpdate = parseInt(cData[dKey].lastUpdate);
                Seraph.getDevice(deviceID).getChannel(channelID).setValue(value, lastUpdate)

            }

        }
        callback()
    });
}

var assignInitialSensorValue = function(callback){
    SQLAction.SQLSelect("seraph_sensor","deviceID, channel, code, value, lastupdate","","",function(sData) {


        for (let sKey in sData) {
            let deviceID = sData[sKey].deviceID;
            let sensorID = sData[sKey].code;
            let value = parseInt(sData[sKey].value);
            let lastUpdate = parseInt(sData[sKey].lastUpdate);
            if (Seraph.getDevice(deviceID).checkExistSensor(sensorID)) {
                Seraph.getDevice(deviceID).getSensor(sensorID).setValue(value, lastUpdate);
            }
        }
        callback()
    });
}

var initConnectionWithSeraphCloud = function(){
    var httpPush = new pushToServer();
    var SSPAActions = new SSPAAction()
    setInterval(function(){
        var SSPAProtocolData = new SSPAData()
        var data = SSPAProtocolData.deviceDataStatus()
        httpPush.webCall("POST", "/device/dataStatus", data, function(res){
            console.log(res)

            var body = JSON.parse(res)
            if( body != []){
                for (var key in body){

                    var command = JSON.parse(body[key])

                    if(["WP","WPM","DM","DMM","UR","CP"].indexOf(command.action) > -1) {
                        var parsedCommand = SSPAActions.qeAction(command)

                        SSPB_APIs.sspbQE(TCPClients[parsedCommand.SSDeviceID], parsedCommand.action, parsedCommand.SCDeviceID, parsedCommand);
                    }
                }
            }
        })
    }, 3000)

    setInterval(function(){
        var SSPAProtocolData = new SSPAData()
        SSPAProtocolData.sensorDataHistory(function(data){
            httpPush.webCall("POST", "/data/history", data, function(res){})
        })

    }, 5000)
};



module.exports.Seraph = Seraph;
module.exports.tempTCPConnection = tempTCPConnection
