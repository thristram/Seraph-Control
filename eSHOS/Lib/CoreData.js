/**
 * Created by fangchenli on 7/10/17.
 */

var net = require('net');
var TCPClient = require("./TCPClient.js");

var SQLAction = require("./SQLAction.js");
var publicMethods = require("./public.js");
let SSPB_APIs = require("./SSP-B.js");
let SSPA_APIs = require("./SSP-A.js");
var webAction = require("./webAction.js");

let debugRemote = require('debug')("RemoteCommand");
let debugNotification = require('debug')("Notification");

var pushToServer = require("./pushToServer.js").remotePush;
var { SSPAData } =  require("./SSP-A.js").SSPAData;
var { SSPAAction } = require("./SSP-A.js").SSPAAction;
var { ACCodecs } = require("./IRCodecs.js").ACCodecs;


class Notification{
    constructor(){
        this.messages = {}
    }
    postMessage(deviceID, shortCode, content, magnitude, shouldShowAlert, timestamp){
        let message = new NotificationMessage(deviceID, shortCode, content, magnitude, shouldShowAlert, timestamp);
        debugNotification(message);
        this.messages[message.notificationID] = message;
    }
    getMessageByNID(nid){
        return this.messages[nid];
    }
    getMessagesByLatestNID(latestNotificaitonID){
        let fetchedMessage = [];
        let latestNID = parseInt(latestNotificaitonID, 16);
        let currentNID = 0;
        for (let nid in this.messages){
            currentNID = parseInt(nid, 16);
            if (latestNID < currentNID){
                fetchedMessage.push(this.getMessageByNID(nid).exportData());
            }
        }
        if (latestNID < currentNID){
            SQLAction.SQLSelect("seraph_notification", "*", "timestamp >= " + (latestNID / 10), "", function(data){
                for (let dataID in data){
                    let item = data[dataID];
                    let isValid = item.isValid === 1;
                    let shouldShowAlert = item.shouldShowAlert === 1;
                    let message = new NotificationMessage(item.deviceID, item.shortCode, item.content, item.magnitude, shouldShowAlert, item.timestamp).exportData();

                    fetchedMessage.push(message);
                }
            })
        }
        return fetchedMessage;
    }
}
class NotificationMessage{
    constructor(deviceID, shortCode, content, magnitude, shouldShowAlert, timestamp){
        this.notificationID = publicMethods.generateTimeBasedUID();
        this.deviceID = "";
        this.shortCode = "";
        this.content = "";
        this.magnitude = 2;
        this.isValid = false;
        this.shouldShowAlert = false;
        this.timestamp = publicMethods.timestamp();

        this.deviceID = deviceID;
        this.shortCode = shortCode;
        this.content = content;
        this.magnitude = magnitude;
        this.shouldShowAlert = shouldShowAlert;
        this.timestamp = timestamp;

        let sqlData = {
            "nid"               :   this.notificationID,
            "deviceID"          :   this.deviceID,
            "shortCode"         :   this.shortCode,
            "content"           :   this.content,
            "magnitude"         :   this.magnitude,
            "isValid"           :   1,
            "shuoldShowAlert"   :   this.shouldShowAlert?1:0,
            "timestamp"         :   this.timestamp
        };

        // SQLAction.SQLAdd("seraph_notification", sqlData);
    }

    exportData(){
        let data = {
            "notificationID"    :   this.notificationID,
            "deviceID"          :   this.deviceID,
            "shortCode"         :   this.shortCode,
            "content"           :   this.content,
            "magnitude"         :   this.magnitude,
            "isValid"           :   this.isValid,
            "shuoldShowAlert"   :   this.shouldShowAlert,
            "timestamp"         :   this.timestamp
        }
        return data
    }


}

class SMode{
    constructor(modeID, name, picture, welcomeText){
        this.modeID = "";
        this.name = "";
        this.picture = "";
        this.welcomeText = "";

        this.modeID = modeID;
        this.name = name;
        this.picture = picture;
        this.welcomeText = welcomeText;
    }
}

class SeraphModes{
    constructor(){
        this.modes = {}
    }
    addMode(mode){
        this.modes[mode.modeID] = mode;
    }
}

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
        this.sensorState = {};
        this.pendingState = {};

        this.stateCount = 0;
        this.pendingStateCount = 0;

        this.sensorID = sensorID;
        this.deviceID = deviceID;
        this.sensorState = Seraph.getNormalSensorState(this.sensorID);
        this.pendingState = Seraph.getNormalSensorState(this.sensorID);

        this.allocateAttribute();
    }
    setValue(value, lastUpdate){
        let currentTimestamp = publicMethods.timestamp();
        if (this.sensorID === "EG") {

            let timestampToday = currentTimestamp - (currentTimestamp % 86400) - 28800;
            if (this.lastUpdate < timestampToday) {
                this.value = parseInt(value);
            }   else    {
                this.value += parseInt(value);
            }
        }   else    {
            this.value = parseInt(value);
        }
        if (lastUpdate){
            this.lastUpdate = lastUpdate;
        }   else    {
            this.lastUpdate = currentTimestamp
        }

        let threshold = Seraph.getThresholdBy(this.sensorID);

        if (threshold !== null){
            let state = threshold.checkSatisfy(value);
            if (this.sensorState.level === state.level){
                this.pendingState = {};
                this.pendingStateCount = 0;
                this.stateCount ++;
                debugNotification("Sensor Count: " + this.sensorID + " - " + this.stateCount + "@" + state.level);
                if (this.stateCount === 3){
                    if (this.sensorState.level !== 1){
                        Seraph.notification.postMessage(this.deviceID, this.sensorID, this.sensorState.warningText, this.sensorState.level, true, this.lastUpdate)
                    }
                }
            }   else    {
                this.pendingStateCount ++;
                if (this.pendingStateCount === 2){
                    this.sensorState = state;
                    this.pendingStateCount = 0;
                    this.stateCount = 0
                }
            }
        }


        if(this.sensorID === "MI"){

            // Seraph.getDevice(this.deviceID)
        }   else  {
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
        let self = this;
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

                if (this.sensorID === "EG"){
                    avgData = sum;
                }

                let data = {
                    channel     : this.sensorID,
                    deviceID    : this.deviceID,
                    value       : avgData,
                    timestamp   : timestamp
                };
                SQLAction.SQLAdd("seraph_sensor_log", data);
                SQLAction.SQLSetField("seraph_sensor",{"value": this.value, "lastupdate": timestamp},{"code" : self.sensorID});
            }

            this.currentLog = [];
            this.currentLogFirstUpdate = 0


        }
    }
}
class sensorThresholdLevel{

    constructor(code, level, lowerBound, upperBound, warningText){

        this.level = 0;
        this.code = "";
        this.shortStatus = "";
        this.warningText = "";
        this.upperBound = 0;
        this.lowerBound = 0;

        this.code = code;
        this.level = level;
        this.getShortStatus(this.code, this.level);
        this.upperBound = upperBound;
        this.lowerBound = lowerBound;
        this.warningText = warningText;
    }

    ifSatisfy(value){
        let ubCheck = true;
        let lbCheck = true;
        if (this.upperBound !== null){
            if (value < this.upperBound){
                ubCheck = true
            }   else{
                ubCheck = false
            }
        }
        if (this.lowerBound !== null){
            if (value >= this.lowerBound){
                lbCheck = true
            }   else{
                lbCheck = false
            }
        }
        if (ubCheck && lbCheck){
            return true
        }   else    {
            return false
        }

    }

    getShortStatus(code, state){
        if(state === 1){
            this.shortStatus = "Normal";
        }
        switch(code){
            case "HM":
                if(state === 4){
                    this.shortStatus =  "Humid";
                }
                if(state === 2){
                    this.shortStatus =  "Dry";
                }
                break;
            case "TP":
                if(state === 2){
                    this.shortStatus =  "Melting";
                }
                if(state === 4){
                    this.shortStatus =  "Freeze";
                }
                break;
            case "CO":
                if (state === 2){
                    this.shortStatus =  "Warning";
                }
                if (state === 3){
                    this.shortStatus =  "Danger";
                }
                break;
            case "CD":
                if (state === 2){
                    this.shortStatus =  "Warning";
                }
                if (state === 3){
                    this.shortStatus =  "Danger";
                }
                break;
            case "VO":
                if (state === 2){
                    this.shortStatus =  "Warning";
                }
                if (state === 3){
                    this.shortStatus =  "Danger";
                }
                break;
            case "PT":
                if (state === 2){
                    this.shortStatus =  "Warning";
                }
                if (state === 3){
                    this.shortStatus =  "Danger";
                }
                break;
            default:
                break
        }

    }
}
class sensorThreshold{

    constructor(code, normalLowerBound, normalUpperBound){
        this.code = "";
        this.thresholds = [];
        this.normalRule = {};

        this.code = code;
        this.normalRule = new sensorThresholdLevel(code, 1, normalLowerBound, normalUpperBound, "");
    }

    addRule(level, lowerBound, upperBound, warningText){
        let newRule = new sensorThresholdLevel(this.code, level, lowerBound, upperBound, warningText);
        this.thresholds.push(newRule)
    }
    checkSatisfy(value){
        if(this.normalRule.ifSatisfy(value)){
            return this.normalRule
        }   else    {
            for (let ruleIndex in this.thresholds){
                let rule = this.thresholds[ruleIndex];
                if (rule.ifSatisfy(value)){
                    return rule
                }
            }
            return this.normalRule
        }


    }
    getNormalLevel(){
        return this.normalRule
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
            {"channel" : this.channelID, "deviceID" : this.deviceID}
        );
    }

    getValue(){
        return this.value
    }
    getName(){
        if(this.name === ""){
            let name = this.channelType + " " + this.moduleID + "-" + this.channelID;
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
        this.sensors = {};

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
        }   else    {
            console.log(sensorID + " Sensor not found")
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
        let self = this;
        if(self.type == "SS" || self.type == "SP") {
            if (self.sensors.hasOwnProperty(sensorID)) {
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

        this.motion = false;
        this.cameraEnabled = true;
        this.MDID = 0;
        this.airQuality = 1;
        this.IPAddress = "";
        this.TCPSocket = {};
        this.reConnecting = false;
        this.isServer = true;
        this.connectionStatus = false;
        this.webcamUID = "RTEST-004255-NIPIJ";
        this.webcamUsername = "admin";
        this.webcamPassword = "ackapp123";
        this.ACDevice = "";

        //Init Value
        this.initSS();
        this.IPAddress = IPAddress;
        if(this.deviceID === "SS000000"){
            this.isServer = false;
        }   else    {
            this.initTCPSocket();
            this.initQueryCommandToSS();
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
    setTCPConnectionStatus(connectionStatus){
        if(connectionStatus){
            this.connectionStatus = true;
            this.deviceStatus = 1
        }   else    {
            this.connectionStatus = false;
            this.deviceStatus = 0;
        }
        let AllDevices = Seraph.getDevicesBySS(this.deviceID);
        for (let key in AllDevices){
            let device = AllDevices[key];
            device.deviceStatus = this.deviceStatus
        }

    }

    getTCPConnectionStauts(){
        return this.connectionStatus;
    }

    initTCPSocket(con){
        this.reConnecting = false;
        this.TCPSocket = con;
    }

    initQueryCommandToSS(){
        let self = this;
        let timeout = 3000;
        if(this.IPAddress !== "127.0.0.1"){
            setInterval(function(){
                if(self.getTCPConnectionStauts()) {
                    SSPB_APIs.sspbDeviceStatus(self.deviceID);
                    setTimeout(function () {
                        SSPB_APIs.sspbDataSync(self.deviceID);
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
    initSSConfig(){
        let self = this;
        SSPB_APIs.sspbDeviceListPost(self.deviceID);
        setTimeout(function(){
            SSPB_APIs.sspbConfigST(self.deviceID);
            setTimeout(function(){
                SSPB_APIs.sspbConfigssGet(self.deviceID)
            },1000)
        },1000)
    }

    addWebCam(webcamUID, username, password){
        this.webcamUID = webcamUID;
        if (username == ""){
            this.webcamUsername = "admin";
        }   else    {
            this.webcamUsername = username;
        }
        this.webcamPassword = password;
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
class ACDevice extends SDevice{
    constructor(deviceID, model, SSDeviceID, brand){
        super(deviceID, model, SSDeviceID);
        this.isHAVC = false;
        this.IRCodecs = new ACCodecs();
        this.brand = brand;
        this.type = "SAAC";
        this.brandName = "GREE";
        this.modelName = "LIVS09HP230V1A";

    }
    setTemperature(temperature){
        if(!this.isHAVC){
            this.IRCodecs.targetTemperature = temperature;
        }
    }
    setMode(mode){
        if(!this.isHAVC){
            this.IRCodecs.mode = mode;
        }
    }
    setFanSpeed(fanSpeed){
        if(!this.isHAVC){
            this.IRCodecs.fanSpeed = fanSpeed;
        }
    }
    setPower(power){
        if(!this.isHAVC){
            this.IRCodecs.power = power;
        }
    }
    executeACCommand(){
        if(!this.isHAVC){
            let code = this.IRCodecs.IREncode();
            SSPB_APIs.sspbActionIR(this.SSDeviceID, this.brand, code);
        }
    }
}
class IRDevice extends SDevice{
    constructor(deviceID, model, SSDeviceID){
        super(deviceID, model, SSDeviceID);

    }

}
class IRCommand{
    constructor(IRCommandID, brand, data){
        this.IRCommandID = IRCommandID;
        this.brand = brand;
        this.data = data;
    }
}
class Room {
    constructor(roomID, name) {

        this.roomID = "";
        this.status = 0;
        this.name = "";
        this.deviceList = {};
        this.roomSS = "";

        this.SLGroup = {};
        this.SPGroup = {};
        this.quickActions = {};

        this.roomID = roomID;
        this.status = 0;
        this.name = name;
        this.roomSS = "";
        //this.SLGroup = SCGroup(groupID: roomID, groupName: "All Lights", groupType: "SL")
        //this.SPGroup = SCGroup(groupID: roomID, groupName: "All Plugs", groupType: "SP")
    }


    addDevices(devices){
        for(let deviceID in devices){
            this.addDevice(deviceID);
        }
    }
    addDevice(deviceID){

        let device = Seraph.getDevice(deviceID);
        if(device){
            let deviceType = device.type;
            if(deviceType === "SS"){
                this.roomSS = deviceID;
            }
            if(deviceType === "SL"){
                for(let channel in device.channels){
                    //this.SLGroup.addDevice(device: device, channelID: channel.channelID)
                }
            }
            if(deviceType === "SP"){
                for(let channel in device.channels){
                    //this.SPGroup.addDevice(device: device, channelID: channel.channelID)
                }
            }
            this.deviceList[deviceID] = 1;
        }

    }

    getDeviceList(){
        let fetchedDeviceList = [];
        for(let deviceID in this.deviceList){
            fetchedDeviceList.push(deviceID);
        }
        return fetchedDeviceList;
    }

    getName(){
        return this.name;
    }
    getSS(){
        return this.roomSS;
    }
    getGroupBy(type){
        if(type === "SL"){
            return SLGroup;
        }
    }



}
class Floor{

    constructor(floorID, name, position){
        this.floorID = "";
        this.name = "";
        this.roomList = {};
        this.position = "";

        this.floorID = floorID;
        this.name = name;
        this.position = position;
    }

    addRoomsToFloor(rooms){
        for(let roomID in rooms){
            this.addRoomToFloor(roomID);
        }
    }

    addRoomToFloor(roomID){
        this.roomList[roomID] = 1
    }

    getRoomIDs(){
        let fetchedRoomList = [];
        for (let roomIDk in this.roomList){
            fetchedRoomList.push(roomIDk);
        }
        return fetchedRoomList
    }

    getName(){
        return this.name
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
class QuickAccess{
    constructor(quickAccessID, name, modeTriggered, icon, isRoomBased, roomID){
        this.quickAccessID = "";
        this.name = "";
        this.icon = "";
        this.isRoomBased = false;
        this.roomID = "";
        this.modeTriggered = "";

        this.quickAccessID = quickAccessID;
        this.name = name;
        this.icon = icon;
        if (isRoomBased !== null){
            this.isRoomBased = isRoomBased;
        }
        this.roomID = roomID;
        this.modeTriggered = modeTriggered
    }
}
class SeraphQuickAccesses{
    constructor(){
        this.quickAccesses = {}
    }
    addHomeQuickAccesses(quickAccess){
        this.quickAccesses[quickAccess.quickAccessID] = quickAccess
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
        this.SSPBLogs = {};
        this.ACDevices = {};
        this.notification = new Notification();
        this.modes= new SeraphModes();
        this.quickAccesses = new SeraphQuickAccesses();

        let self = this;

        self.initSysConfig(function(){

            initDevices(function(){
                //TCPClient = require("./TCPClient.js");
                for(let key in self.getDeviceList(["SS"])){
                    let SSDeviceID = self.getDeviceList(["SS"])[key];
                    let SSDevice = self.getDevice(SSDeviceID);
                    if(!SSDevice.isServer){
                        self.getDevice(SSDeviceID).initTCPClientSocket()
                    }
                }
                initRooms(function(){
                    initFloors(function(){

                    })
                });

                assignInitialSCDeviceValue(function(){
                    assignInitialSensorValue(function(){
                        initConnectionWithSeraphCloud();
                        require("./test.js");
                        self.initHomeKitIdentifiers(function(){
                            require("../HomeKit/BridgedCore.js");

                        })
                    })
                })
            });
            webAction.getLocalIP(function(localIP){});
            webAction.refreshAll(function(){});
        })
    }

    addDevcie(deviceID, device){
        this.devices[deviceID] = device
    }

    addRoom(roomID, room){
        this.rooms[roomID] = room;
    }

    addFloor(floorID, floor){
        this.floors[floorID] = floor;
    }

    addACDevice(deviceID, model, SSDeviceID, brand){

        let ACDevices = new ACDevice(deviceID, model, SSDeviceID, brand);

        if(SSDeviceID !== "SS000000"){

            let SSDevice = this.getDevice(SSDeviceID);
            SSDevice.ACDevice = deviceID;
            this.devices[deviceID] = ACDevices;
        }

    }
    getNormalSensorState(code){
        if (this.threshold[code]){
            return this.threshold[code].getNormalLevel()
        }

    }

    getDevice(deviceID){
        let deviceType = deviceID.substring(0,2);
        return this.devices[deviceID];

    }
    getRoom(roomID){
        return this.rooms[roomID];
    }

    getFloor(floorID){
        return this.floors[floorID];
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
    getDevicesBySS(SSDeviceID){
        let fetchedData = [];
        for(let key in this.devices) {
            let device = this.devices[key];
            if (device.SSDeviceID === SSDeviceID) {
                fetchedData.push(device);
            }
        }
        return fetchedData;
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

    getACBySSDeviceID(SSDeviceID){

        let SSDevice = this.getDevice(SSDeviceID);
        if (SSDevice){
            let ACDeviceID = SSDevice.ACDevice;
            if (ACDeviceID){

                return this.getDevice(ACDeviceID)
            }
        }

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
        let MDID = parseInt(moduleID);
        for(let key in this.devices) {
            let device = this.devices[key];
            if(device.type == "SL" || device.type == "SP"){

                if(device.SCDeviceID == SCDeviceID){
                    if(device.MDID ==  MDID){
                        return device
                    }
                }
            }
        }
    }
    getThresholdBy(sensorID){
        if (this.threshold[sensorID]){
            return this.threshold[sensorID]
        }   else{
            return null
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
                let value = data[key];
                self.sysConfigs[value.name] = value.value;
            }
            initSensorThreshold(function(){
                initSeraphModes(function(){
                    initSeraphQuickAccesses(function(){
                        callback();
                    });
                });
            });
        });
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
        // SQLAction.SQLAdd("seraph_sspb_command_logs",commandData);
        if(data.hasOwnProperty("hash")){
            commandData["hash"] = data.hash;
        }

        this.SSPBLogs[commandData.messageID] = commandData;
    }

    getSSPBCommands(messageID, callback){
        let self = this;
        if(self.SSPBLogs.hasOwnProperty(messageID)){
            callback(self.SSPBLogs[messageID]);
        }   else    {
            // let query = "messageID = '" + messageID + "' AND (finished = 0 OR finished IS NULL)";
            // SQLAction.SQLFind("seraph_sspb_command_logs","*", query,function(SQLData){
            //     self.SSPBLogs[messageID] = SQLData;
            //     callback(SQLData);
            // });
        }
    };

    recordSSPBReturn(messageID, data){

        let lastRespondTime = publicMethods.timestamp();
        this.SSPBLogs[messageID].respondQoS++;
        this.SSPBLogs[messageID].lastRespondTime = lastRespondTime;
        if(this.SSPBLogs[messageID].respondQoS === this.SSPBLogs[messageID].qos){
            this.SSPBLogs[messageID].finished = 1;
            // SQLAction.SQLSetField("seraph_sspb_command_logs",{"finished" : 1, "lastRespondTime" : lastRespondTime },{"messageID" : messageID});
            delete(this.SSPBLogs[messageID]);
        }

    };

}

var tempTCPConnection = {};

var Seraph = new SeraphHome("HM0000001", "Seraph Home");

var initRooms = function(callback){
    SQLAction.SQLSelect("seraph_room", "*", "", "", function(roomData){
        SQLAction.SQLSelect("seraph_room_device", "*", "", "", function(roomDeviceData){
            for(let rkey in roomData){
                let roomInfo = roomData[rkey];
                let room = new Room(roomInfo.roomID, roomInfo.name);
                Seraph.addRoom(roomInfo.roomID, room);
            }
            for(let rdkey in roomDeviceData){
                let roomDeviceInfo = roomDeviceData[rdkey];

                Seraph.getRoom(roomDeviceInfo.roomID).addDevice(roomDeviceInfo.deviceID)
            }
            callback()

        });
    })
};

var initFloors = function(callback){
    SQLAction.SQLSelect("seraph_floor", "*", "", "", function(floorData){
        SQLAction.SQLSelect("seraph_floor_room", "*", "", "", function(floorRoomData){
            for(let fkey in floorData){
                let floorInfo = floorData[fkey];
                let floor = new Floor(floorInfo.floorID, floorInfo.name, floorInfo.position);
                Seraph.addFloor(floorInfo.floorID, floor)
            }
            for(let frkey in floorRoomData){
                let floorRoomInfo = floorRoomData[frkey];
                Seraph.getFloor(floorRoomInfo.floorID).addRoomToFloor(floorRoomInfo.roomID);
            }
            callback()

        });
    })
};



var initDevices = function(callback) {
    SQLAction.SQLSelect("seraph_device", "deviceID, type, model, managedSS, managedSC, moduleID, IPAddress, webcamUID, webcamUsername, webcamPassword", "", "", function (deviceData) {

        for (let key in deviceData) {
            if (deviceData.hasOwnProperty(key)) {

                let deviceID = deviceData[key].deviceID;

                let model = deviceData[key].model;
                let managedSS = deviceData[key].managedSS;
                let managedSC = deviceData[key].managedSC;
                let moduleID = deviceData[key].moduleID;
                let deviceType = deviceData[key].type;
                let webcamUID = deviceData[key].webcamUID;
                let webcamUsername = deviceData[key].webcamUsername;
                let webcamPassword = deviceData[key].webcamPassword;

                if (deviceType === "SS") {
                    let IPAddress = deviceData[key].IPAddress;
                    let device = new SSDevice(deviceID, model, IPAddress);

                    if (webcamUID != ""){
                        device.addWebCam(webcamUID, webcamUsername, webcamPassword)
                    }

                    Seraph.addDevcie(deviceID, device);
                    Seraph.addACDevice("SAAC000001","YB0F2",deviceID, 3);

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
    SQLAction.SQLSelect("seraph_sc_device","deviceID, channel, type, value, lastupdate", "","",function(cData) {
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
};

var initSeraphQuickAccesses = function(callback){
    SQLAction.SQLSelect("seraph_quick_access","*","","",function(qData) {

        for (let qKey in qData){
            let qa = qData[qKey];
            let quickAccessID = qa.qaID;
            let name = qa.name;
            let modeTriggered = qa.modeTriggered;

            let quickAccess = new QuickAccess(quickAccessID, name, modeTriggered);
            console.log(quickAccess)
            Seraph.quickAccesses.addHomeQuickAccesses(quickAccess);
        }
        callback();
    })
};
var initSeraphModes = function(callback){
    SQLAction.SQLSelect("seraph_modes","*","","",function(mData) {
        for (let mKey in mData){
            let mode = mData[mKey];
            let modeID = mode.modeID;
            let name = mode.name;
            let picture = mode.picture;
            let welcomeText = mode.welcomeText;

            let modeObject = new SMode(modeID, name, picture, welcomeText);
            Seraph.modes.addMode(modeObject);
        }
        callback();
    })
};
var initSensorThreshold = function(callback){
    SQLAction.SQLSelect("seraph_sensor_threshold","*","","level",function(sData) {
        for (let sKey in sData){
            let threshold = sData[sKey];
            let sensorType = threshold.sensorCode;
            let level = parseInt(threshold.level);
            let lowerBound = threshold.lowerBound;
            if (lowerBound == null || lowerBound == ""){
                lowerBound = null
            }
            let upperBound = threshold.upperBound;
            if (upperBound == null || upperBound == ""){
                upperBound = null
            }
            let warningText = threshold.warningText;

            if (level === 0){
                Seraph.threshold[sensorType] = new sensorThreshold(sensorType, lowerBound, upperBound)
            }   else    {
                Seraph.threshold[sensorType].addRule(level, lowerBound, upperBound , warningText)
            }

        }

        callback();
    })
};

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
    var SSPAActions = new SSPAAction();
    var SSPAProtocolData = new SSPAData();
    setInterval(function(){

        var data = SSPAProtocolData.homeData();
        httpPush.webCall("POST", "/home/data", data, function(res){
            let body = JSON.parse(res);
            if( body != []){
                for (let key in body){

                    let command = JSON.parse(body[key]);
                    if(command.ApiBase){

                    }   else    {
                        command.ApiBase = "qe";
                    }
                    switch (command.ApiBase){
                        case "ac":
                            //Receive Remote Control Command
                            debugRemote("Received Remote AC Control Command");
                            debugRemote(command);
                            SSPA_APIs.sspaAC(command);
                            break;
                        case "/actions/ir":
                            debugRemote("Received IR Control Command");
                            debugRemote(command);
                            SSPA_APIs.sspaEActionIR(command);
                            break;
                        case "/actions/learn/ir":
                            debugRemote("Received IR Learning Command");
                            debugRemote(command);
                            SSPA_APIs.sspaEActionLearnIR(command);
                            break;
                        default:
                            debugRemote("Received Remote QE Command");
                            debugRemote(command);
                            if(["WP","WPM","DM","DMM","UR","CP"].indexOf(command.action) > -1) {
                                var parsedCommand = SSPAActions.qeAction(command);

                                SSPB_APIs.sspbQE(parsedCommand.SSDeviceID, parsedCommand.action, parsedCommand.SCDeviceID, parsedCommand);
                            }
                            break;
                    }

                }
            }
        });

    }, 3000);

    setInterval(function(){
        let data = SSPAProtocolData.homeConfigs();
        httpPush.webCall("POST", "/config/home", data, function(res){})
    },60000);

    setInterval(function(){
        SSPAProtocolData.sensorDataHistory(function(data){
            httpPush.webCall("POST", "/data/history", data, function(res){})
        })

    }, 5000)
};



module.exports.Seraph = Seraph;
module.exports.tempTCPConnection = tempTCPConnection;
