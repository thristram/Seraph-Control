/**
 * Created by fangchenli on 7/10/17.
 */

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
    }
    getSensorID(){
        return this.sensorID
    }
    getName(){
        return this.sensorName
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
                this.shorName = "PM2.5";
                break;
            case "VO":
                this.sensorName = "Volatile Organic Compound";
                this.shorName = "VOC";
                break;
            default:
                this.sensorName = "Sensor";
                this.shorName = "Sensor";
                break
        }
    }
}
class SChannel{


    constructor (channelID, channelType){

        //Declaring Value
        this.channelID = 0;
        this.lastUpdate = 0
        this.value = 0;
        this.actionOnHold = 0;
        this.channelType = "";
        this.name = "";


        this.channelID = channelID;
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
    }

    getValue(){
        return this.value
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
    constructor(deviceID, model){

        super(deviceID, model, deviceID);

        //Declaring Value
        this.sensors = {};
        this.motion = false;
        this.cameraEnabled = true;
        this.MDID = 0;
        this.airQuality = 1;
        this.IPAddress = "";
        this.TCPSocket = {}

        //Init Value
        this.initSS();


    }
    initSensors(sensorCodes){
        for (let key in sensorCodes){
            let sensorName = sensorCodes[key];
            this.sensors[sensorName] = new Sensor(sensorName, this.deviceID)
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

    getSensor(sensorID){
        if (this.checkExistSensor(sensorID)){
            return this.sensors[sensorID]
        }
    }


}
class SCEPDevice extends SDevice{
    constructor(deviceID, model, SSDeviceID, SCDeviceID, MDID){

        super(deviceID, model, SSDeviceID);

        //Declaring Value
        this.channels = [];
        this.SCDeviceID = "";
        this.MDID = 0;

        //Init Value
        this.SCDeviceID = SCDeviceID;
        this.MDID = MDID
        this.type = deviceID.substring(0,2);

        switch(this.type){
            case "SL":
                this.initSL();
                break;
            case "SP":
                this.initSP();
                break;
            default:
                break;
        }


    }
    initSP(){
        this.channels.push(new SChannel(1, "SP"));
        this.channels.push(new SChannel(2, "SP"));
        this.channels.push(new SChannel(3, "SP"));
    }
    initSL(){
        this.channels.push(new SChannel(1, "SL"));
        this.channels.push(new SChannel(2, "SL"));


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

        this.initHomeKitIdentifiers(function(){})
        this.initSysConfig(function(){})
    }

    addDevcie(deviceID, device){
        this.devices[deviceID] = device
    }

    getDevice(deviceID){
        return this.devices[deviceID]
    }
    getChannelLists(){
        let channelList = []
        for(let key in this.devices) {
            let device = this.devices[key];
            if (device.type === "SP" || device.type === "SL") {
                for(let ckey in device.channels){
                    channelList.push(device.deviceID + "-" + (ckey + 1))
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
    getDeviceByMDID(SCDeviceID, MDID){
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
            return homeKitIdentifiers[key];
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

}



var net = require('net');

var SQLAction = require("./SQLAction.js");
var publicMethods = require("./public.js");
var TCPClient = require("./TCPClient.js");
var SSPB_APIs = require("./SSP-B.js");


var pushToServer = require("./pushToServer.js").remotePush;
var { SSPAData } =  require("./SSP-A.js").SSPAData;
var { SSPAAction } =  require("./SSP-A.js").SSPAAction;


var SSPBCommands = {};


var homeKitIdentifierCache = {};
var deviceREF = {};
var channelData = {};
var sensorData = {};
var sensorLog = {};
var deviceStatus = {};
var sensorStatus = {};
var TCPClients = {};
var IP2DeviceID = {};
var mdid2DeviceID = {};

var Seraph = new SeraphHome("HM0000001", "Seraph Home");

var loadHomeKitData = function(callback){

    SQLAction.SQLSelect("seraph_device","type||deviceID as deviceID, type, model, managedSS, managedSC, moduleID","","",function(deviceData){

        for (let key in deviceData){
            if(deviceData.hasOwnProperty(key)){

                let deviceID = deviceData[key].deviceID;

                let model = deviceData[key].model;
                let managedSS = deviceData[key].managedSS;
                let managedSC = "SC" + deviceData[key].managedSC;
                let moduleID = deviceData[key].moduleID;
                let deviceType = deviceData[key].type;
                if(deviceType === "SS"){
                    deviceID = deviceID.substring(2);
                    let device = new SSDevice(deviceID, model);
                    Seraph.addDevcie(deviceID, device);
                }   else if(deviceType === "SP" || deviceType === "SL"){
                    let device = new SCEPDevice(deviceID, model, managedSS, managedSC, moduleID);
                    Seraph.addDevcie(deviceID, device);
                }   else    {
                    let device = new SDevice(deviceID, model, managedSS);
                    Seraph.addDevcie(deviceID, device);
                }

            }

            deviceREF[deviceData[key].deviceID] = deviceData[key]

            if(deviceData[key].type == "SL" || deviceData[key].type == "SP"){
                if(!mdid2DeviceID.hasOwnProperty(deviceData[key].managedSC)){
                    mdid2DeviceID[deviceData[key].managedSC] = {};
                }
                mdid2DeviceID[deviceData[key].managedSC]["M" + deviceData[key].moduleID] = deviceData[key].deviceID;
            }
        }




        SQLAction.SQLSelect("seraph_sc_device","type||deviceID as deviceID, channel, type, value, lastupdate", "","",function(cData){
            //console.log(cData);

            for(let dKey in cData){
                if(deviceData.hasOwnProperty(dKey)){
                    let deviceID = cData[dKey].deviceID;
                    let channelID = parseInt(cData[dKey].channel);
                    let value = parseInt(cData[dKey].value);
                    let lastUpdate = parseInt(cData[dKey].lastUpdate);
                    Seraph.getDevice(deviceID).getChannel(channelID).setValue(value, lastUpdate)

                }


                if(!deviceStatus.hasOwnProperty(cData[dKey].deviceID)){
                    deviceStatus[cData[dKey].deviceID] = {};
                }
                deviceStatus[cData[dKey].deviceID][cData[dKey].channel] = cData[dKey];

            }
            channelData = cData;

            SQLAction.SQLSelect("seraph_sensor","deviceID, channel, code, value, lastupdate","","",function(sData){


                for(let sKey in sData){
                    let deviceID = sData[sKey].deviceID;
                    let sensorID = sData[sKey].code;
                    let value = parseInt(sData[sKey].value);
                    let lastUpdate = parseInt(sData[sKey].lastUpdate);
                    console.log(Seraph.getDevice(deviceID));
                    if(Seraph.getDevice(deviceID).checkExistSensor(sensorID)){
                        Seraph.getDevice(deviceID).getSensor(sensorID).setValue(value, lastUpdate);
                    }



                    if(!sensorStatus.hasOwnProperty(deviceID)) {sensorStatus[deviceID] = {}}
                    if(!sensorLog.hasOwnProperty(deviceID)) {sensorLog[deviceID] = {}}
                    if(!sensorLog[deviceID].hasOwnProperty(sensorID)) {sensorLog[deviceID][sensorID] = {}}
                    sensorStatus[deviceID][sensorID] = value;
                    sensorLog[deviceID][sensorID]["lastUpdate"] = 0;
                    sensorLog[deviceID][sensorID]["data"] = []

                }
                sensorData = sData;
                dataSync();

                HomeKitCachePreLoad(function(){
                    callback();
                });

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


var updateSensorValue = function(value, channel, deviceID){
    //SQLAction.SQLSetField("seraph_sensor",{"value" : value, "lastupdate": publicMethods.timestamp()},{"code":channel, "deviceID" : deviceID});

    switch(channel){
        case "EG":
            recordSensorValue(value, channel, deviceID);
            break;
        case "MI":
            sensorStatus[deviceID][channel] = value;
            break;
        case "HM":
        case "TP":
        case "PT":
        case "SM":
        //case "BT":
        case "CO":
        case "CD":
        case "VO":
            recordSensorValue(value, channel, deviceID);
            sensorStatus[deviceID][channel] = value;
            break;
        default:
            break;
    }
    dataSync();
};

var recordSensorValue = function(value, channel, deviceID){
    var recordPeriod = 30

    var timestamp = publicMethods.timestamp();


    sensorLog[deviceID][channel]["data"].push(value)
    if(sensorLog[deviceID][channel].lastUpdate == 0){
        sensorLog[deviceID][channel].lastUpdate = timestamp
    }
    if((sensorLog[deviceID][channel].lastUpdate != 0) && (timestamp - sensorLog[deviceID][channel].lastUpdate) > (recordPeriod * 60)){

        //Wait 30 min and process data
        var numberOfElements = sensorLog[deviceID][channel].data.length
        if(numberOfElements > 0){

            var sum = 0
            for(var element in sensorLog[deviceID][channel].data){
                sum = sum + sensorLog[deviceID][channel].data[element]
            }

            var avgData =  parseInt(sum / numberOfElements);
            var data = {
                channel     : channel,
                deviceID    : deviceID,
                value       : avgData,
                timestamp   : timestamp
            }
            SQLAction.SQLAdd("seraph_sensor_log", data);

        }

        sensorLog[deviceID][channel].data = []
        sensorLog[deviceID][channel].lastUpdate = 0


    }
}

var updateDeviceStatus = function(value, channel, deviceID, deviceType) {
    //console.log(deviceStatus)
    SQLAction.SQLSetField("seraph_sc_device",{"value" : value, "lastupdate": publicMethods.timestamp()},{"channel" : channel, "deviceID" : deviceID.substring(2), "type" : deviceType});
    deviceStatus[deviceID]["" + channel].value = value;
    dataSync();
};


var recordSSPBCommands = function(data){
    var commandData = {
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

    var lastRespondTime = publicMethods.timestamp();
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

    var timeout = 3000;
    if(IPAddress != "127.0.0.1"){

        setInterval(function(){
            if(TCPClients[deviceID].cStatus == 1) {
                SSPB_APIs.sspbDeviceStatus(TCPClients[deviceID]);
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

    module.exports.TCPClients = TCPClients;

    module.exports.SSPBCommands = SSPBCommands;
    module.exports.mdid2DeviceID = mdid2DeviceID;
    module.exports.IP2DeviceID = IP2DeviceID;
};

dataSync();

module.exports.Seraph = Seraph
module.exports.loadHomeKitData = loadHomeKitData;
module.exports.updateSensorValue = updateSensorValue;
module.exports.updateDeviceStatus = updateDeviceStatus;
module.exports.HomeKitCacheSet = HomeKitCacheSet;
module.exports.HomeKitCacheGet = HomeKitCacheGet;
module.exports.HomeKitCachePreLoad = HomeKitCachePreLoad;
module.exports.recordSSPBCommands = recordSSPBCommands;
module.exports.getSSPBCommands = getSSPBCommands;
module.exports.recordSSPBReturn = recordSSPBReturn;
module.exports.createAllTCPClients = createAllTCPClients;
module.exports.setSingleTCPClient = setSingleTCPClient;
module.exports.findTCPClientByIP = findTCPClientByIP;
module.exports.setTCPClientOnline = setTCPClientOnline;
module.exports.setTCPClientOffline = setTCPClientOffline;
