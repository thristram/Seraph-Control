/**
 * Created by fangchenli on 7/10/17.
 */

let net = require('net');
let fs = require('fs');
let debugRemote = require('debug')("RemoteCommand");
let debugNotification = require('debug')("Notification");
let debug = require("debug")("SeraphCore");
let debugUpdate = require("debug")("SeraphUpdate");
let debugHVAC = require("debug")("HVAC");
let publicMethods = require("./public.js");
let defaultValue = require("../../defaultValues.js");
var EventEmitter = require('events');
var HAPEvent = new EventEmitter.EventEmitter();
var smartConnect = {};
var HAPLinker = {};
var SIAP = {};

class Notification{
    constructor(){
        this.messages = {};
        this.lastReportedTimestamp = 0;
        this.initFromDB();
    }

    initFromDB(){
        let self = this;
        SQLAction.SQLSelect("seraph_notification", "*", "", "", function(data){
            for (let dataID in data){
                let item = data[dataID];
                let shouldShowAlert = (item.shouldShowAlert === 1);
                let message = new NotificationMessage(item.nid, item.deviceID, item.shortCode, item.content, item.magnitude, shouldShowAlert, item.timestamp);
                try {message.updateTime = JSON.parse(item["updateTime"])} catch(err){}
                self.messages[message.notificationID] = message;
            }
        })
    }
    postMessage(deviceID, shortCode, content, magnitude, shouldShowAlert, timestamp){

        let timestampToday = publicMethods.getTimestampMSToday();
        debugNotification("Posting new notification message, timestampToday: " + timestampToday);
        for (let index in this.messages){
            let message = this.messages[index];
            if (message.timestamp > timestampToday){
                debugNotification("checking notification: " + message.notificationID);
                if ((message.shortCode === shortCode) && (message.magnitude === magnitude)){
                    debugNotification("Insert into existing notification message " + message.notificationID)
                    this.messages[index].insertUpdateTime();
                    return index;
                }
            }
        }
        debugNotification("No update found, creating new...");
        let message = new NotificationMessage("", deviceID, shortCode, content, magnitude, shouldShowAlert, timestamp);
        message.addToDB();
        debugNotification(message);
        this.messages[message.notificationID] = message;
        return message.notificationID;
    }
    getMessageByNID(nid){
        return this.messages[nid];
    }
    getLatestMessages(lastUpdate){
        if(!lastUpdate){
            lastUpdate = publicMethods.getTimestampMSToday() - 86400000 * 3
        }
        let fetchedMessage = [];
        let cachedLatestUpdate = 0;
        for (let nid in this.messages){
            if (lastUpdate < this.messages[nid].lastUpdate){
                fetchedMessage.push(this.getMessageByNID(nid).exportData());
                // console.log(this.getMessageByNID(nid));
            }
            if ((cachedLatestUpdate === 0) || (this.messages[nid].lastUpdate < cachedLatestUpdate)){
                cachedLatestUpdate = this.messages[nid].lastUpdate;
            }

        }

        if (lastUpdate < cachedLatestUpdate){
            SQLAction.SQLSelect("seraph_notification", "*", "lastUpdate >= " + lastUpdate, "", function(data){
                for (let dataID in data){
                    let item = data[dataID];
                    let isValid = item.isValid === 1;
                    let shouldShowAlert = item.shouldShowAlert === 1;
                    let message = new NotificationMessage(item.notificationID, item.deviceID, item.shortCode, item.content, item.magnitude, shouldShowAlert, item.timestamp).exportData();
                    fetchedMessage.push(message);
                }
            })
        }

        fetchedMessage = publicMethods.sortBy(fetchedMessage, "lastUpdate", "DESC");
        debug("Getting Message up to: " + lastUpdate);
        for(let i in fetchedMessage){

            debug("Fetching Message: " + fetchedMessage[i].notificationID);
        }
        return fetchedMessage;
    }
}
class NotificationMessage{
    constructor(notificationID, deviceID, shortCode, content, magnitude, shouldShowAlert, timestamp){
        this.notificationID = notificationID? notificationID : publicMethods.generateTimeBasedUID();
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
        this.lastUpdate = timestamp;

        this.updateTime = [];

        this.roomIDs = Seraph.devices.getRoomByDevice(deviceID);
        this.getDefualtContent();
        // console.log(this.roomIDs);

    }
    addToDB(){
        let sqlData = {
            "nid"               :   this.notificationID,
            "deviceID"          :   this.deviceID,
            "shortCode"         :   this.shortCode,
            "content"           :   this.content,
            "magnitude"         :   this.magnitude,
            "isValid"           :   this.isValid ? 1 : 0,
            "shuoldShowAlert"   :   this.shouldShowAlert?1:0,
            "timestamp"         :   this.timestamp,
            "lastUpdate"        :   this.lastUpdate,
            "roomIDs"           :   JSON.stringify(this.roomIDs),
            "updateTime"        :   JSON.stringify(this.updateTime),
        };

        SQLAction.SQLAdd("seraph_notification", sqlData);
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
            "timestamp"         :   this.timestamp,
            "lastUpdate"        :   this.lastUpdate,
            "roomIDs"           :   this.roomIDs,
            "updateTime"        :   this.updateTime,
        };
        return data
    }

    updateMessage(sensorState){
        this.lastUpdate = publicMethods.timestampMS();
        this.magnitude = sensorState.level;
        this.getDefualtContent();
        this.insertUpdateTime();
    }
    insertUpdateTime(){
        let timestamp = publicMethods.timestampMS();
        this.updateTime.push(timestamp);
        this.lastUpdate = timestamp;
        SQLAction.SQLSetField("seraph_notification", {
            lastUpdate : this.lastUpdate,
            magnitude  : this.magnitude,
            updateTime : JSON.stringify(this.updateTime),
            content    : this.content,
        }, {nid: this.notificationID});
    }
    getDefualtContent(){
        if((!this.content) || (this.content === "null")){

            let roomText = [];

            try{
                for (let index in this.roomIDs){
                    let roomID = this.roomIDs[index];
                    let roomName = Seraph.getRoom(roomID).name;
                    roomText.push(roomName);
                }
            }   catch(err){
                debug(err);
            }


            switch (this.shortCode){
                case "PT":
                    if (this.magnitude === 2){
                        this.content = "PM2.5 Attention";
                    }
                    if (this.magnitude === 3){
                        this.content = "PM2.5 Danger";
                    }
                    break;
                case "CO":
                    if (this.magnitude === 2){
                        this.content = "Carbon Monoxide Attention";
                    }
                    if (this.magnitude === 3){
                        this.content = "Carbon Monoxide Danger";
                    }
                    break;
                case "CD":
                    if (this.magnitude === 2){
                        this.content = "Carbon Dioxide Attention";
                    }
                    if (this.magnitude === 3){
                        this.content = "Carbon Dioxide Danger";
                    }
                    break;
                case "VO":
                    if (this.magnitude === 2){
                        this.content = "VOC Attention";
                    }
                    if (this.magnitude === 3){
                        this.content = "VOC Danger";
                    }
                    break;
                case "HM":
                    if (this.magnitude === 4){
                        this.content = "Too Humid";
                    }
                    if (this.magnitude === 2){
                        this.content = "Too Dry";
                    }
                    break;
            }
            if (roomText.length !== 0){
                if (roomText.length > 1){
                    let lastName = roomText.pop();
                    this.content =  this.content + " in " + roomText.join(", ") + " and " + lastName;
                }   else    {
                    this.content =  this.content + " in " + roomText[0];
                }

            }
        }
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
    constructor() {
        this.modes = {};

        this.currentMode = "";
        this.currentTimeMode = "";

        this.atHome = false;
        this.isSleeping = false;
    }
    exportData(){
        return{
            currentMode     : this.currentMode,
            currentTimeMode : this.currentTimeMode,
            atHome          : this.atHome,
            isSleeping      : this.isSleeping
        }
    }
    setMode(modeID){
        if(modeID === "SM00000004"){
            this.atHome = false
        }   else if(modeID === "SM00000001"){
            this.isSleeping = true
        }   else    {
            this.atHome = true
        }


        if(this.modes[modeID]){
            this.currentMode = modeID;
            return true
        }   else    {
            this.currentMode = "";
            return false
        }
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
        this.homeKitUUID = "";

        this.sensorID = sensorID;
        this.deviceID = deviceID;
        this.sensorState = Seraph.getNormalSensorState(this.sensorID);

        this.stateBuffer = [];
        this.currentNotificationID = "";

        this.bufferSize = 20;
        this.peakValue = 0;

        this.allocateAttribute();
    }

    getBufferSize(){
        return this.bufferSize;
    }
    getBufferThresholdSize(){
        let bufferThreshold = 0.8;
        return parseInt(this.bufferSize * bufferThreshold);
    }
    setValue(value, lastUpdate){
        let currentTimestamp = publicMethods.timestamp();
        let timestampToday = publicMethods.getTimestampToday();
        if (this.sensorID === "EG") {

            if (this.lastUpdate < timestampToday) {
                this.value = parseInt(value);
            }   else    {
                this.value += parseInt(value);
            }
        }   else    {
            this.value = parseInt(value);
            if (this.lastUpdate < timestampToday) {
                this.peakValue = 0
            }
            if(this.value > this.peakValue){
                this.peakValue = this.value;
            }
        }
        if (lastUpdate){
            this.lastUpdate = lastUpdate;
        }   else    {
            this.lastUpdate = currentTimestamp
        }

        let threshold = Seraph.getThresholdBy(this.sensorID);

        if (threshold) {
            let currentState = threshold.checkSatisfy(value);
            this.sensorState = currentState;
            if (this.stateBuffer.length < this.getBufferSize()) {
                this.stateBuffer.push(currentState.level);
            }   else    {

                let stat = publicMethods.countNSort(this.stateBuffer);
                // debugNotification(this.stateBuffer);
                // debugNotification(stat);
                let commonState = parseInt(stat[0][0]);
                let commonStateFrequency = stat[0][1];

                if (commonState !== 1){

                    debugNotification(this.sensorID + " Sensor Status: " + commonState + " for " + commonStateFrequency + "/" + this.bufferSize + " time");
                    if (commonStateFrequency > this.getBufferThresholdSize()){
                        this.bufferSize = 100;
                        this.stateBuffer = [];
                        if(this.currentNotificationID){
                            let message = Seraph.notification.getMessageByNID(this.currentNotificationID);
                            let timestampToday = publicMethods.getTimestampToday();
                            if (message.timestamp < timestampToday){
                                Seraph.notification.getMessageByNID(this.currentNotificationID).updateMessage(this.sensorState);
                            }   else    {
                                this.currentNotificationID = Seraph.notification.postMessage(this.deviceID, this.sensorID, "", commonState, true, publicMethods.timestampMS())
                            }

                        }   else    {
                            this.currentNotificationID = Seraph.notification.postMessage(this.deviceID, this.sensorID, "", commonState, true, publicMethods.timestampMS())
                        }

                    }

                }   else    {
                    this.bufferSize = 20;
                    this.currentNotificationID = "";
                    debugNotification(this.sensorID + " Sensor Normal for " + stat[0][1] + "/" + this.bufferSize + " time");
                }
                this.stateBuffer.shift();
            }
        }

		switch(this.sensorID){
			case "MI":
				// Seraph.devices.getDevice(this.deviceID)
				break;
			case "BZ":
				var SSDevice = Seraph.devices.getDevice(this.deviceID);
				if(SSDevice){
					SSDevice.alarms.buzz = this.value;
					SSDevice.alarms.led = this.value;
					if(this.value === 0){
						SSDevice.alarms.cause = [];
					}
				}
				break;
			case "SM":
				var SSDevice = Seraph.devices.getDevice(this.deviceID);
				if(SSDevice){
					if(this.value > 0){
						SSDevice.alarms.addCause("SM");
					}   else    {
						SSDevice.alarms.removeCause("SM")
					}

				}

				this.recordSensorLog();
				break;
			default:
				this.recordSensorLog();
				break;
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
    getRealValue(){
        if(this.sensorID === "TP" ||this.sensorID === "CO"){
            return parseInt(this.value / 10);
        }   else    {
            return this.value;
        }
    }
    getPeakValue(){
        if(this.sensorID === "TP" ||this.sensorID === "CO"){
            return parseInt(this.peakValue / 10);
        }   else    {
            return this.peakValue;
        }
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

    constructor(code, level, lowerBound, upperBound, warningText, airQualityImpactIndex, recommendations, description){

        this.level = 0;
        this.code = "";
        this.shortStatus = "";
        this.warningText = "";
        this.upperBound = 0;
        this.lowerBound = 0;
        this.airQualityImpact = 0;

        this.code = code;
        this.level = level;
        this.getShortStatus(this.code, this.level);
        this.upperBound = upperBound;
        this.lowerBound = lowerBound;
        this.warningText = warningText;
        this.airQualityImpactIndex = airQualityImpactIndex;
        this.recommendations = recommendations;
        this.description = description;

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

    computeAirQualityImpact(value){
        this.airQualityImpact = parseInt((value / this.lowerBound) * this.airQualityImpactIndex * (this.level - 1));
        return this.airQualityImpact;
    }
    exportConfigHomeData(){
        return {
            level           : this.level,
            upperBound      : this.upperBound,
            lowerBound      : this.lowerBound,
            warningText     : this.warningText,
        };
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

    addRule(level, lowerBound, upperBound, warningText, airQualityImpactIndex, recommendations, description){
        let newRule = new sensorThresholdLevel(this.code, level, lowerBound, upperBound, warningText, airQualityImpactIndex, recommendations, description);
        this.thresholds.push(newRule)
    }
    checkSatisfy(value){
        if(this.normalRule.ifSatisfy(value)){

            return this.normalRule
        }   else    {
            for (let ruleIndex in this.thresholds){
                let rule = this.thresholds[ruleIndex];
                if (rule.ifSatisfy(value)){
                    rule.computeAirQualityImpact(value);
                    return rule
                }
            }
            if (this.code === "AQ") { debug("No satisfied: " + value) };
            return this.normalRule
        }


    }
    getNormalLevel(){
        return this.normalRule
    }

    exportHomeDataThreshold(){
        let fetchedData = [];
        for (let index in this.thresholds){
            fetchedData.push(this.thresholds[index].exportConfigHomeData())
        }
        return fetchedData;
    }

}


class SChannel{


    constructor (channelID, channelType, deviceID, moduleID){

        //Declaring Value
        this.channelID = 0;
        this.deviceID = "";
        this.lastUpdate = 0;
        this.value = 0;
        this.actionOnHold = 0;
        this.channelType = "";
        this.moduleID = 0;
        this.name = "";
	    this.homeKitUUID = "";


        this.channelID = channelID;
        this.moduleID = moduleID;
        this.deviceID = deviceID;
        this.actionOnHold = 0;
        this.channelType = channelType;

        this.serveAS = null;
        this.icon = null;

    }
    updateConfigToDB(){
        SQLAction.SQLSetField("seraph_sc_device",{serveAS: this.serveAS, icon: this.icon}, {deviceID: this.deviceID, channel: this.channelID})
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
    getCH(){
        return publicMethods.translateChannel(this.channelID)
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
        this.firmware = "";
        this.hardware = "";
        this.type = "";
        this.meshID = "";

        this.SSDeviceID = "";
        this.sensors = {};



        //Init Value
        this.deviceID = deviceID;
        this.model = model;
        this.type = deviceID.substring(0,2);
        this.SSDeviceID = SSDeviceID;
        this.deviceStatus = new deviceStatus(this.type, this.deviceID);
        this.lastUpdate = 0;
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
        if(self.type === "SS" || self.type === "SP" || self.type === "ST") {
            if (self.sensors.hasOwnProperty(sensorID)) {
                return true
            } else {
                return false
            }
        }

    }

    setSSDeviceStatus(status){
        let AllDevices = Seraph.devices.getDevicesBySS(this.deviceID);
        for (let key in AllDevices){
            let device = AllDevices[key];
            device.deviceStatus.SSOnline = status;
        }
    }

    setSCDeviceStatus(status){
        let AllDevices = Seraph.devices.getDevicesBySC(this.deviceID);
        for (let key in AllDevices){
            let device = AllDevices[key];
            device.deviceStatus.SCOnline = status;
        }
    }
    writePropertyToDB(data){
        SQLAction.SQLSetField("seraph_device", data, {deviceID: this.deviceID});
    }
    setFirmware(version){
        this.firmware = version;
        this.writePropertyToDB({firmware: version})
    }
    getFirmwareVersion(){
        if(this.firmware){
	        return this.firmware + ".0";
        }
        return "1.0";
    }

}
class deviceStatus{
    constructor(deviceType, deviceID){
        this.deviceType = deviceType;
        this.deviceID = deviceID;

        this.SCDeviceID = "";
        this.SSDeviceID = "";

        this.SSOnline = false;
        this.SCOnline = false;
        this.deviceOnline = false;

        this.lastUpdate = 0;

        this.errorCode = 0;

        this.updatePeriod = 0;



        this.deviceConnection = true;
        //SS Specific
        this.TCPStatus = false;
        this.MFIChip = true;
        this.BLE = true;
        this.IR = true;

        this.sensors = {
            HM      : true,
            TP      : true,
            CO      : true,
            CD      : true,
            PT      : true,
            MI      : true,
            VO      : true,
            SM      : true
        };
        //FOR ST
        this.APDS9960 = true;
        this.MPR121 = true;

        //FOR SLC
        this.SLCPower = true;



    }
    setStatus(code){
        this.errorCode = code;
        // let errorCodes = code.toString(2).map( x => parseInt(x) );
        // switch(this.deviceType){
        //     case "SS":
        //         this.BLE = !errorCodes[1];
        //         this.MFIChip = !errorCodes[3];
        //         this.sensors.TP = !errorCodes[4];
        //         this.sensors.HM = !errorCodes[4];
        //         this.sensors.CO = !errorCodes[5];
        //         this.sensors.CD = !errorCodes[6];
        //         this.sensors.PT = !errorCodes[7];
        //         this.sensors.MI = !errorCodes[8] && !errorCodes[9];
        //         this.IR = !errorCodes[10];
        //         break;
        //     case "ST":
        //         this.deviceConnection = !errorCodes[0];
        //         this.APDS9960 = !errorCodes[3];
        //         this.MPR121 = !errorCodes[4];
        //         break;
        //     case "SC":
        //         this.deviceConnection = !errorCodes[0];
        //         break;
        //     case "SL":
        //         this.deviceConnection = !errorCodes[0];
        //         this.SLCPower = !errorCodes[3];
        //         break;
        //     default:
        //         this.deviceConnection = !errorCodes[0];
        //         break;
        // }
    }
    updateLastUpdate(){
        this.lastUpdate = parseInt(publicMethods.timestamp());
    }

    checkLastUpdate(){
        if ((publicMethods.timestamp() - this.lastUpdate) > Seraph.sysConfigs.serviceInterval.offlineDetermitation){
            debug("Device " + this.deviceID + " Offline for: " + (publicMethods.timestamp() - this.lastUpdate));
            this.deviceOnline = 0;
            if(this.deviceType === "SS"){
                Seraph.devices.getDevice(this.deviceID).setSSDeviceStatus(false);
            }
            if(this.deviceType === "SC"){
                Seraph.devices.getDevice(this.deviceID).setSCDeviceStatus(false);
            }

        }   else       {
            this.deviceOnline = 1;
            if(this.deviceType === "SS"){
                Seraph.devices.getDevice(this.deviceID).setSSDeviceStatus(true);
            }
            if(this.deviceType === "SC"){
                Seraph.devices.getDevice(this.deviceID).setSCDeviceStatus(true);
            }

        }

    }
    getStatus(){
        switch (this.deviceType){
            case "SS":
                if(this.deviceOnline){
                    return 1
                }   else    {
                    return 0
                }


            case "SAAC-HVAC":
                let device6 = Seraph.devices.getDeviceByMDID(this.SCDeviceID, 6);
                let device7 = Seraph.devices.getDeviceByMDID(this.SCDeviceID, 7);
                if (device6){
                    if (device7){
                        this.SSOnline = device6.deviceStatus.SSOnline | device7.deviceStatus.SSOnline;
                        this.SCOnline = device6.deviceStatus.SCOnline | device7.deviceStatus.SCOnline;
                        this.deviceOnline = device6.deviceStatus.deviceOnline | device7.deviceStatus.deviceOnline;
                    }   else    {
                        return 0
                    }
                }   else    {
                    return 0
                }

            case "SL":
            case "SP":
                if(this.SSOnline){
                    if(this.SCOnline){
                        if(this.deviceOnline){
                            return 1
                        }   else    {
                            return 0
                        }
                    }   else    {
                        return 4
                    }

                }   else     {
                    return 3
                }
            case "SAAC":
                let SSDevice = Seraph.devices.getDevice(this.SSDeviceID);
                if(SSDevice){
                    return SSDevice.deviceStatus.getStatus();
                }   else    {
                    return 0
                }
            default:
                if(this.SSOnline){
                    if(this.deviceOnline){
                        return 1
                    }   else    {
                        return 0
                    }
                }   else     {
                    return 3
                }

        }
    }
}
class STDeviceKey{
    constructor(keyNumber){
        this.keyNumber = keyNumber;
        this.command = [];
        this.value = false;
    }
    getCommand(){
        return this.command
    }
    setCommand(command){
    	    if(Array.isArray(command)){
    	    	    this.command = command;
    	    }   else    {
    	    	    this.command = [];
    	    }

    }
    getBrightness(isShort){
        let actionGroup = new SCDeviceGroup();
        for(let index in this.command){
            let cmd = this.command[index];

            switch(cmd.api){
                case "/groupControl/room":
                    actionGroup.addDeviceByRoom(cmd.roomID, "SL");
                    break;
                case "/groupControl/multiDevices":
                    let rawDeviceList = cmd.deviceValue.split(",");
                    actionGroup.addDeviceByRawDeviceList(rawDeviceList, "SL");
                    break;
            }
        }
        if(isShort){
            return parseInt(actionGroup.getAverageBrightenss() / 12.5);
        }
        return actionGroup.getAverageBrightenss();
    }

}
class STDevice extends SDevice{
    constructor(deviceID, model, SSDeviceID){
        super(deviceID, model, SSDeviceID);
        this.roomID = "";
        this.keys = {
            roomState   : new STDeviceKey(0),
            gestureNormal   : new STDeviceKey(4),
            key1   : new STDeviceKey(1),
            key2   : new STDeviceKey(2),
            key3   : new STDeviceKey(3),
        };
        this.initSensors(["CS","AL"]);

    }
    setRoomID(roomID){
        this.roomID = roomID;
        this.setCommand(0, [{
            duration    : "20",
            api         : "/groupControl/room",
            roomID      : this.roomID
        }]);
    }
    getRoomBrightness(isShort){
        let actionGroup = new SCDeviceGroup();
        actionGroup.addDeviceByRoom(this.roomID, "SL");
        if(isShort){
            return parseInt(actionGroup.getAverageBrightenss() / 12.5);
        }
        return actionGroup.getAverageBrightenss();
    }
    getKey(type){
        switch(type){
            case 0:
                return this.keys["roomState"];
            case 1:
            case "key1":
                return this.keys["key1"];
            case 2:
            case "key2":
                return this.keys["key2"];
            case 3:
            case "key3":
                return this.keys["key3"];
            case 4:
            case "gestureNormal":
                return this.keys["gestureNormal"];
        }
    }
    getCommand(type){
        let key = this.getKey(type);
        if(key){
            return key.getCommand();
        }
    }
    executeCommand(keyPad, value){
        let commands = this.getCommand(keyPad);

        for(let index in commands){
            let command = commands[index];
            command["value"] = value;
            Seraph.commandSystem.execute(command.api, command)
        }

    }
    setCommand(type, command){
        let effectiveCommands = [];
	    if(Array.isArray(command)){
		    for(let cKey in command){
			    let cmd = command[cKey];
			    switch(cmd.api){
				    case "/groupControl/room":
                        if(cmd.roomID){
	                        effectiveCommands.push(cmd);
                        }
                        break;
                    case "/groupControl/multiDevices":
	                    if(cmd.deviceValue){
		                    effectiveCommands.push(cmd);
	                    }
	                    break;
                    default:
	                    effectiveCommands.push(cmd);
	                    break;
			    }
		    }
	    }

        let keyNumber = 0;
        let typeNuber = 1;
        switch(type){
            case 0:
                this.keys["roomState"].setCommand(effectiveCommands);
                break;
            case 1:
            case "key1":
                keyNumber = 1;
                this.keys["key1"].setCommand(effectiveCommands);
                break;
            case 2:
            case "key2":
                keyNumber = 2;
                this.keys["key2"].setCommand(effectiveCommands);
                break;
            case 3:
            case "key3":
                keyNumber = 3;
                this.keys["key3"].setCommand(effectiveCommands);
                break;
            case 4:
            case "gestureNormal":
                keyNumber = 4;
	            typeNuber = 2;
                this.keys["gestureNormal"].setCommand(effectiveCommands);
                break;
        }
		if(keyNumber && (keyNumber !== 0)){
        	    let dataToSet = {
		        STKey       : keyNumber,
		        deviceID    : this.deviceID,
		        command     : JSON.stringify(effectiveCommands),
				type        : typeNuber
	        }
			SQLAction.SQLUpdateIfExist("seraph_st",dataToSet,{STKey: keyNumber, deviceID: this.deviceID})
		}

    }
    hasCommand(type){
        if(["key1","key2","key3","gestureNormal"].indexOf(type) >= 0){
            return true
        }   else    {
            return false
        }
    }
}
class AlarmSystem{
	constructor(){
		this.state = 0;
		this.cause = [];
		this.buzz = 0;
		this.led = 0;
	}
	addCause(cause){
		if(this.cause.indexOf(cause) < 0){
			this.cause.push(cause)
		}
	}
	removeCause(cause){
		let indexNumber = this.cause.indexOf(cause);
		if(indexNumber > -1){
			this.cause.splice(indexNumber, 1);
		}
	}
	exportData(){
		return{
			state   : this.state,
			cause   : this.cause,
			buzz    : this.buzz,
			led     : this.led
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

        this.IPAddress = "";
        this.TCPSocket = {};
        this.reConnecting = false;
        this.isServer = true;
        this.connectionStatus = false;
        this.webcamUID = "RTEST-004255-NIPIJ";
        this.webcamUsername = "admin";
        this.webcamPassword = "ackapp123";
        this.ACDevice = "";

        this.airQuality = new AirQuality(1, 0, {}, 'Excellent', '', 0, 0);
		this.alarms = new AlarmSystem();

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

            default:
                this.initSensors(["TP","HM","CO","CD","PT","VO","SM","MI","BZ"]);
                break
        }
    }
    setTCPConnectionStatus(connectionStatus){
        if(connectionStatus){
            this.connectionStatus = true;
            this.deviceStatus.deviceOnline = true;
        }   else    {
            this.connectionStatus = false;
            this.deviceStatus.deviceOnline = false;
        }
        this.setSSDeviceStatus(connectionStatus);

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
        if(this.IPAddress !== "127.0.0.1"){
            setInterval(function(){
                if(self.deviceStatus.updatePeriod > 0){
                    self.deviceStatus.updatePeriod -= 1;
                }
                if(self.getTCPConnectionStauts()) {
                    if(self.deviceStatus.updatePeriod === 0){
	                    SSPB_APIs.sspbDeviceStatus(self.deviceID);
	                    setTimeout(function () {
		                    SSPB_APIs.sspbDataSync(self.deviceID);
		                    setTimeout(function () {
			                    SSPB_APIs.sspbDeviceMalfunctionGet(self.deviceID);
			                    setTimeout(function () {
				                    SSPB_APIs.sspbDataSTPost(self.deviceID);
			                    }, Seraph.sysConfigs.serviceInterval.SSDataSyncDelay);
		                    }, Seraph.sysConfigs.serviceInterval.SSDataSyncDelay);
	                    }, Seraph.sysConfigs.serviceInterval.SSDataSyncDelay);
                    }


                }

            }, Seraph.sysConfigs.serviceInterval.SSStatusUpdate);
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
            SSPB_APIs.sspbConfigssGet(self.deviceID)
        },1000)
        // setTimeout(function(){
        //     SSPB_APIs.sspbConfigST(self.deviceID);
        //
        // },1000)
    }

    addWebCam(webcamUID, username, password){
        this.webcamUID = webcamUID;
        if (username === ""){
            this.webcamUsername = "admin";
        }   else    {
            this.webcamUsername = username;
        }
        this.webcamPassword = password;
    }
    computeAirQuality(){
        this.airQuality = Seraph.getThresholdBy("AQ").computeAirQuality(this.deviceID);
        debug(this.airQuality.title);
    }
	MFiChallenge(MFiChallengeData, callback){
		let command = {
			deviceID        : this.deviceID,
			MFiChallenge    : MFiChallengeData,
		};
		let messageID = Seraph.commandSystem.execute("/config/mfichallenge", command);
		console.log(messageID);

		HAPLinker.HAPEvent.on('MFiProof', function(payload){
			console.log(payload.messageID);
			if(messageID === payload.messageID){
				console.log("Accepted");
				callback(payload);
			}

		});
	}
	receivePreUpdateInfo(model, hardware, firmware){
        this.model = model;
        this.hardware = hardware;
        this.firmware = firmware;
        this.writePropertyToDB({
            model   : model,
            hardware: hardware,
            firmware: firmware
        });
		SIAP.siapSendUpdateInfo(this.deviceID, Seraph.seraphUpdate.getVersion("SS"));
		SIAP.siapSendUpdatePacket(this.deviceID, Seraph.seraphUpdate.getVersion("SS"));
	}
	receiveUpdateResult(status, firmware){
        if(status === 0){
	        this.setFirmware(firmware);
	        this.deviceStatus.updatePeriod = 0;
        }
        debugUpdate("Update status:" + status + ", updated Firmware v." + firmware);
	}


}

class AirQuality extends sensorThresholdLevel{
    constructor(AQIndex, indexScore, indexComponent, title, recommendation, lowerBound, upperBound){
        super("AQ", AQIndex, lowerBound, upperBound, title);
        this.indexScore = indexScore;
        this.indexComponent = indexComponent;
        this.title = title;
        this.recommendation = recommendation;
        this.homeKitUUID = "";


    }

    exportData(){
        return {
            index           : this.level,
            title           : this.title,
            recommendation  : this.recommendation,
            description     : this.description,
            indexComponent  : this.indexComponent,
            indexScore      : this.indexScore
        };
    }
}
class AirQualityThreshold extends sensorThreshold{
    constructor(){
        super("AQ", 0, 0);
    }

    computeAirQuality(SSDeviceID){
        let indexScore = 0;
        let indexComponent = {};
        let title = "";
        let recommendation = "";
        let description = [];
        let dangerFlag = false

        let sensors = Seraph.devices.getDevice(SSDeviceID).sensors;
        for (let index in sensors){
            let sensor = sensors[index];
            let sensorLevel = sensor.sensorState;
            if (sensorLevel && (sensorLevel.level !== 1)){
                indexComponent[sensor.sensorID] = sensorLevel.airQualityImpact;
                indexScore =+ parseInt(sensorLevel.airQualityImpact);
                description.push(sensorLevel.description);
                if (sensorLevel.level === 3){
                    dangerFlag = true
                }
            }
        }


        let AQLevel = this.checkSatisfy(indexScore);
        title = AQLevel.warningText;
        if(dangerFlag === true){
            recommendation = "Please Ventilate Immediately!";
        }   else if(indexScore > 0){
            recommendation = "Open the window and get fresh air. "
        }   else    {
            recommendation = "Everything is Fine."
        }

        let AQ = new AirQuality(AQLevel.level, indexScore, indexComponent, title, recommendation, AQLevel.lowerBound, AQLevel.upperBound);
        AQ.description = description.join(" ");
        return AQ



    }
}
class roomState{
    constructor(){
        // this.
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

        this.serveAS = "";

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
        let cid = parseInt(channelID);

        if (this.checkExistChannel(cid)){
            return this.channels[(cid - 1)]
        }
    }

}
class CommandSystem{
    constructor(){

    }
    execute(api, command){
        var SSPAActions = new SSPAAction();
        switch (api){
            case "ac":
                //Receive Remote Control Command
                // SSDeviceID
                // TP
                // mode
                // power
                // fanSpeed
                // AutoMode
                debugRemote("Received Remote AC Control Command");
                debugRemote(command);
                SSPA_APIs.sspaAC(command);
                break;
            case "/actions/ir":
                // SSDeviceID
                // brand
                // code
                debugRemote("Received IR Control Command");
                debugRemote(command);
                SSPA_APIs.sspaEActionIR(command);
                break;
            case "/mode/setMode":
                debugRemote("Received Set Mode Command");
                debugRemote(command);
                let targetMode = command.targetMode;
                let commands = JSON.parse(command.commands);
                for(let index in commands){
                    let cmd  = commands[index];
                    Seraph.commandSystem.execute(cmd.api, cmd);
                }
                if(Seraph.modes.setMode(targetMode)){
                    return true
                }
                break;
            case "/actions/learn/ir":
                // SSDeviceID
                debugRemote("Received IR Learning Command");
                debugRemote(command);
                SSPA_APIs.sspaEActionLearnIR(command);
                break;
            case "/config/ST":
                debugRemote("Received Config ST Command");
                debugRemote(command);
                try{
                    let STDeviceID = command.deviceID;
                    let TDevice = Seraph.devices.getDevice(STDeviceID);
                    if (TDevice){
                        TDevice.setCommand(command.type, JSON.parse(command.commands));
                    }
	                var httpPush = new pushToServer();
	                var SSPAProtocolData = new SSPAData();
	                let data = SSPAProtocolData.homeConfigs();
	                httpPush.webCall("POST", "/config/home", data, function(res){})
                }   catch(err){
                    debug(err);
                }

                break;
            case "/groupControl/multiDevices":
	            debugRemote("Received Multi-Device Control Command");
	            debugRemote(command);
                let rawDeviceList = command.deviceValue.split(",");
                var actionGroup = new SCDeviceGroup();
                actionGroup.addDeviceByRawDeviceList(rawDeviceList, "ALL");

                this.executeMultiDeviceCommands(actionGroup, command.value, command.duration);
                break;
            case "/groupControl/room":
                // RoomID
                debugRemote("Received Room Group Control Command");
                debugRemote(command);
                let roomID = command.roomID;
                var actionGroup = new SCDeviceGroup();
                actionGroup.addDeviceByRoom(roomID, "MSL");
                this.executeMultiDeviceCommands(actionGroup, command.value, command.duration);
                break;
            case "/config/changeServeAs":

                debugRemote(command);
                var deviceID = command.deviceID;
                let channelID = parseInt(command.channel);
                let serveAs = command.serveAs;
                let icon = command.icon;
                let device = Seraph.devices.getDevice(deviceID);
                if(device){debugRemote("Received Change ServeAs Command");
                    let channel = device.getChannel(channelID);
                    debugRemote("Received Change ServeAs Command");
                    if(channel){
                        debugRemote("Received Change ServeAs Command");
                        channel.serveAS = serveAs;
                        channel.icon = icon;
                        channel.updateConfigToDB();
                    }
                }
                break;
            case "/config/mfichallenge":
	            var SSDeviceID = command.deviceID;
	            let MFiChallenge = command.MFiChallenge;
                let data = SSPB_APIs.sspbConfigMFiChallengeGet(SSDeviceID, MFiChallenge);
                return data.MessageID;
                break;
	        case "/alarm/trigger":
		        var deviceID = command.deviceID;
		        let buzzState = parseInt(command.buzz);
		        let ledState = parseInt(command.led);
		        let duration = parseInt(command.time);
		        let cause = "TT";
		        if(command.cause){
					cause = command.cause;
		        }
		        if(deviceID.seraphType() === "SS"){
			        var SSDevice = Seraph.devices.getDevice(deviceID);
			        if(SSDevice){
			        	if((buzzState + ledState) === 0){
					        SSDevice.alarms.removeCause(cause);
				        }   else    {
					        SSDevice.alarms.addCause(cause);
				        }

				        SSDevice.alarms.buzz = buzzState;
				        SSDevice.alarms.led = ledState;
			        }
		        }

		        SSPB_APIs.sspbAlarm(deviceID, buzzState, ledState, duration);
		        break;
	        case "/alarm/holdsm":
		        var deviceID = command.deviceID;
		        if(deviceID.seraphType() === "SS"){
			        var SSDevice = Seraph.devices.getDevice(deviceID);
			        if(SSDevice){
				        SSDevice.alarms.buzz = 0;
				        SSDevice.alarms.led = 0;
			        }
		        }
		        SSPB_APIs.sspbAlarmHoldSM(deviceID);
		        break;
	        case "/update/ss":
		        var deviceID = command.deviceID;
		        if(deviceID){
			        if(deviceID.seraphType() === "SS"){
				        SSPB_APIs.sspbUpdateSS(deviceID);
			        }
                }
		        break;
            default:
                // CH - Int/Hex (Single/Multiple)
                // TOPOS
                // duration
                // (MDID, SCDeviceID) OR (SEPID)
                debugRemote("Received QE Command");
                debugRemote(command);
                if(["WP","WPM","DM","DMM","UR","CP"].indexOf(command.action) > -1) {
                    var parsedCommand = SSPAActions.qeAction(command);
                    SSPB_APIs.sspbQE(parsedCommand.SSDeviceID, parsedCommand.action, parsedCommand.SCDeviceID, parsedCommand);
                }
                break;
        }
    }
    executeMultiDeviceCommands(actionGroup, value, duration){
        let bulkCommand = actionGroup.getCommand(value, duration);
        // console.log(bulkCommand);
        for(let i in bulkCommand){
            Seraph.commandSystem.execute("qe", bulkCommand[i]);
        }
    }

}

class ACDevice extends SDevice{
    constructor(deviceID, model, SSDeviceID, brand, SCDeviceID){
        super(deviceID, model, SSDeviceID);
        this.isHAVC = false;
        this.IRCodecs = new ACCodecs();
        this.brand = brand;
        this.type = "SAAC";
        this.brandName = "GREE";
        this.modelName = "LIVS09HP230V1A";
	    this.homeKitUUID = "";

        //HVAC

        this.SCDeviceID = SCDeviceID;

        this.targetTemperature = 25;
        this.mode = 0;
        this.power = false;
        this.fanSpeed = 0;

        this.currentHardwareMode = 0;

        this.autoMode = false;
        this.heatingThreshold = 0;
        this.collingThreshold = 0;
        this.defaultThreshold = 2;
        // COOL - 1
        // Heat - 2
        // Fan - 4
        // Off - 0

        if(brand === 99){
            this.isHAVC = true;
            this.deviceStatus = new deviceStatus("SAAC-HVAC", this.deviceID);
            this.deviceStatus.SCDeviceID = this.SCDeviceID;
            this.deviceStatus.SSDeviceID = this.SSDeviceID;
            let self = this;
            setInterval(function(){
                self.HVACUpdateHardwareMode();
                self.HVACUpdateMode();
            }, defaultValue.serviceInterval.HVACUpdatePeriod)
        }   else    {
            this.deviceStatus = new deviceStatus("SAAC", this.deviceID);
            this.deviceStatus.SSDeviceID = this.SSDeviceID;
        }



    }
    HVACUpdateHardwareMode(){
        if(this.isHAVC){
            let device6 = Seraph.devices.getDeviceByMDID(this.SCDeviceID, 6);
            let device7 = Seraph.devices.getDeviceByMDID(this.SCDeviceID, 7);
            if (device6 && device7){
                let channels = [
                    device7.getChannel(1).getValue() === 99,
                    device7.getChannel(2).getValue() === 99,
                    device7.getChannel(3).getValue() === 99,
                    device6.getChannel(1).getValue() === 99,
                    device6.getChannel(2).getValue() === 99,
                    device6.getChannel(3).getValue() === 99,
                ];
                debugHVAC(channels)
                if(channels[0] && channels[1] && !channels[2] && channels[3] && channels[4] && !channels[5]){
                    debugHVAC("Current Hardware mode is 2");
                    this.currentHardwareMode = 2;
                }   else    if(channels[0] && channels[1] && !channels[2] && !channels[3] && !channels[4] && channels[5]){
                    debugHVAC("Current Hardware mode is 1");
                    this.currentHardwareMode = 1;
                }   else    if(channels[0] && !channels[1] && !channels[2] && !channels[3] && !channels[4] && !channels[5]){
                    debugHVAC("Current Hardware mode is 4");
                    this.currentHardwareMode = 4;
                }   else    if(channels[0] && channels[1] && !channels[2] && !channels[3] && channels[4] && !channels[5]){
                    debugHVAC("Current Hardware mode is 5");
                    this.currentHardwareMode = 5;
                }   else    if(!channels[0] && !channels[1] && !channels[2] && !channels[3] && !channels[4] && !channels[5]){
                    debugHVAC("Current Hardware mode is 0");
                    this.currentHardwareMode = 0;
                }   else    {
                    debugHVAC("Current Hardware mode is Unkown");
                    this.HAVCActivateMode(0);
                    this.currentHardwareMode = 0;

                }

            }
        }

    }
    setHeatingThreshold(value){
        this.heatingThreshold = value;
    }
    setCoolingThreshold(value){
        this.collingThreshold = value;
    }
    getHeatingThreshold(){
        if(this.heatingThreshold === 0){
            return this.targetTemperature - 2;
        }   else    {
            return this.targetTemperature
        }
    }
    getCoolingThreshold(){
        if(this.collingThreshold === 0){
            return this.targetTemperature + 2;
        }   else    {
            return this.collingThreshold
        }
    }
    HVACUpdateMode(){
        let SSDevice = Seraph.devices.getDevice(this.SSDeviceID);
        if(SSDevice){
            let currentTemperature = SSDevice.getSensor("TP").getValue() / 10;
            if(this.autoMode){
                if(this.getCoolingThreshold() <= currentTemperature) {
                    debugHVAC("Colling Mode: targetTemp: " + this.targetTemperature + " < currentTemp:" + currentTemperature + " Activate Colling")
                    this.setMode(1);
                    this.HAVCActivateMode(1)
                }   else if(this.getHeatingThreshold() >= currentTemperature){
                    debugHVAC("Heating Mode: targetTemp: " + this.targetTemperature + " > currentTemp:" + currentTemperature + " Activate Heating")
                    this.setMode(2);
                    this.HAVCActivateMode(2)
                }   else    {

                }
                return
            }
            if(!this.power){
                this.HAVCActivateMode(0);
                return
            }
            switch(this.mode){
                case 1: //COOL
                    if(this.getCoolingThreshold() <= currentTemperature){
                        debugHVAC("Colling Mode: Colling Threshold: " + this.getCoolingThreshold() + " < currentTemp:" + currentTemperature + " Activate Colling")
                        this.HAVCActivateMode(1)
                    }   else if(this.targetTemperature > currentTemperature)    {
                        debugHVAC("Colling Mode: targetTemp: " + this.targetTemperature + " >= currentTemp:" + currentTemperature + " Shutdown Colling")
                        this.HAVCActivateMode(0);
                    }
                    break;
                case 2:

                    if(this.getHeatingThreshold() >= currentTemperature){
                        debugHVAC("Heating Mode: Heating Threshold: " + this.getHeatingThreshold() + " > currentTemp:" + currentTemperature + " Activate Heating")
                        this.HAVCActivateMode(2)
                    }   else if(this.targetTemperature < currentTemperature)   {
                        debugHVAC("Heating Mode: targetTemp: " + this.targetTemperature + " >= currentTemp:" + currentTemperature + " Shutdown Heating")
                        this.HAVCActivateMode(0);
                    }
                    break;
                case 4:
                    debugHVAC("Fan Mode");
                    this.HAVCActivateMode(4);
                    break;
            }
        }
    }
    setTemperature(temperature){
        this.targetTemperature = parseInt(temperature);
        if(!this.isHAVC){
            this.IRCodecs.targetTemperature = temperature;
        }   else    {

        }
    }
    setMode(mode){


        debug("Setting Mode to " + mode);
        if(!this.isHAVC){
            this.mode = mode;
            this.IRCodecs.mode = mode;
        }   else    {
            this.mode = mode;
        }
    }
    HAVCActivateMode(mode){
        let timeout = 0;
        if(!this.power){
            mode = 0
        }
        if(this.currentHardwareMode !== mode){
            if((mode !== 0) && (this.currentHardwareMode !== 0)){
                let OffCommand = {
                    TOPOS: "00",
                    SCDeviceID: this.SCDeviceID,
                    SSDeviceID: this.SSDeviceID,
                    action    : "WPM",
                    MDID      : "7,6",
                    CH        : "7,7"
                };
                Seraph.commandSystem.execute("qe", OffCommand);
	            Seraph.log("ACStatus to OFF", "HVAC Status Change");
                timeout = 1000;
            }
        }   else    {
            return
        }
        this.currentHardwareMode = mode;
        let commandToSend = {
            TOPOS: "99",
            SCDeviceID: this.SCDeviceID,
            SSDeviceID: this.SSDeviceID
        };
        switch(mode){
            case 2:
                commandToSend["action"] = "WPM";
                commandToSend["MDID"] = "7,6";
                commandToSend["CH"] = "3,3";
                break;
            case 1:
                commandToSend["action"] = "WPM";
                commandToSend["MDID"] = "7,6";
                commandToSend["CH"] = "3,4";
                break;
            case 4:
                commandToSend["action"] = "WP";
                commandToSend["MDID"] = "7";
                commandToSend["CH"] = "1";
                break;
            case 5:
                commandToSend["action"] = "WPM";
                commandToSend["MDID"] = "7,6";
                commandToSend["CH"] = "3,2";
                break;
            case 0:
                commandToSend["action"] = "WPM";
                commandToSend["TOPOS"] = "00";
                commandToSend["MDID"] = "7,6";
                commandToSend["CH"] = "7,7";
                break;
            default:
                return
        }
        setTimeout(function(){
            Seraph.commandSystem.execute("qe", commandToSend);
            Seraph.log("ACStatus Changed to " + mode, "HVAC Status Change")
        },timeout);


    }
    setFanSpeed(fanSpeed){
        this.fanSpeed = fanSpeed;
        if(!this.isHAVC){
            this.IRCodecs.fanSpeed = fanSpeed;
        }
    }
    setPower(power){
        this.power = power;
        if(!this.isHAVC){
            this.IRCodecs.power = power;
        }   else    {


        }
    }
    executeACCommand(){
        HAPEvent.emit("ACUpdate", this.deviceID);
        if(!this.isHAVC){
            let code = this.IRCodecs.IREncode();
            SSPB_APIs.sspbActionIR(this.SSDeviceID, this.brand, code);
        }   else    {
            this.HVACUpdateMode();

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

class SCDeviceGroup{
    constructor(){
        this.devices = {};
    }
    addDeviceByRawDeviceList(rawDeviceList, deviceType){
        let deviceLists = {};
        for (let index in rawDeviceList){
            let deviceValue = rawDeviceList[index].split(":");
            let value = 0;
            if(deviceValue.length > 1){
                value = deviceValue[1];
            }
            let deviceWithChannel = deviceValue[0].split("-");
            let deviceID = deviceWithChannel[0];
            let channel = parseInt(deviceWithChannel[1]);
            let CH = publicMethods.translateChannel(channel);

            if(!deviceLists[deviceID]){
                deviceLists[deviceID] = 0
            }
            deviceLists[deviceID] = deviceLists[deviceID] | CH
        }
        this.addDeviceByDeviceList(deviceLists, deviceType);
    }
    addDeviceByDeviceList(deviceList, deviceType){

        for (let deviceID in deviceList){
            let type = deviceID.seraphType();
            if(deviceType === "MSL"){
                if(type === "SP"){
                    let device = Seraph.devices.getDevice(deviceID);
                    for(let index in device.channels){
                        let channel = device.channels[index];
                        if((channel.serveAS === "light") && ((channel.getCH() | deviceList[deviceID]) === deviceList[deviceID])){
                            this.addDeviceChannel(deviceID, channel.getCH())
                        }
                    }
                }
            }
            if(deviceType === "MSL" || deviceType === "SL" || deviceType === "ALL") {
                if (type === "SL") {
                    this.addDeviceChannel(deviceID, deviceList[deviceID])
                }
            }
            if(deviceType === "SP" || deviceType === "ALL") {
                if (type === "SP") {
                    this.addDeviceChannel(deviceID, deviceList[deviceID])
                }
            }
        }
    }
    addDeviceByRoom(roomID, deviceType){
        let room = Seraph.getRoom(roomID);
        let deviceLists = {};
        if (room){
            deviceLists = room.deviceList;
        }   else    {
            let SeraphDevices = Seraph.devices.devices;
            for(let index in SeraphDevices){
                let device = SeraphDevices[index];
                if(device.type === "SL"){
                    deviceLists[device.deviceID] = 3
                }
                if(device.type === "SP"){
                    deviceLists[device.deviceID] = 7
                }
            }

        }
        this.addDeviceByDeviceList(deviceLists, deviceType)

    }
    addDevice(deviceID){

        let channel = 0;
        let device = Seraph.devices.getDevice(deviceID);
        if(device.type === "SL"){
            channel = 3;
        }   else if(device.type === "SP"){
            channel = 7;
        }
        this.devices[deviceID] = channel;
    }
    addDeviceChannel(deviceID, channel){
        if(!this.devices[deviceID]){
            this.devices[deviceID] = 0;
        }
        this.devices[deviceID] = this.devices[deviceID] | channel
    }
    getAverageBrightenss(){
        let brightness = [];
        let totalBrightenss = 0;
        let totalNumber = 0;
        for(let deviceID in this.devices){
            let CHs = this.devices[deviceID];
            if (publicMethods.getSimpleDeviceType(deviceID) === "SL"){
                let channels = CHs.channels();
                for(let index in channels){
                    let channelID = channels[index];
                    let device = Seraph.devices.getDevice(deviceID);
                    if(device){
                        let channel = device.getChannel(channelID);
                        totalBrightenss += channel.getValue();
                        totalNumber ++;
                    }
                }
            }
        }
        if (totalNumber === 0){
            return -1;
        }
        return parseInt(totalBrightenss / totalNumber);
    }
    getCommand(value, duration){
        let fetchedResult = {
            "SP"    :   {},
            "SL"    :   {},

        };
        for(let deviceID in this.devices){
            let CH = this.devices[deviceID];
            let device = Seraph.devices.getDevice(deviceID);
            if (!fetchedResult[device.type]){
                fetchedResult[device.type] = {}
            }
            if (!fetchedResult[device.type][device.SCDeviceID]){
                fetchedResult[device.type][device.SCDeviceID] = {
                    type     : "",
                    SSDeviceID: device.SSDeviceID,
                    MDIDs    : [],
                    CHs      : [],
                }
            }

            fetchedResult[device.type][device.SCDeviceID].MDIDs.push(device.MDID);
            fetchedResult[device.type][device.SCDeviceID].CHs.push(CH);
            if(device.type === "SL"){
                fetchedResult[device.type][device.SCDeviceID].type = "DM";
            }   else if(device.type === "SP"){
                fetchedResult[device.type][device.SCDeviceID].type = "WP";
            }   else    {
                fetchedResult[device.type][device.SCDeviceID].type = device.type;
            }

        }
        let result = [];
        for(let commandType in fetchedResult){
            for (let SCDeviceID in fetchedResult[commandType]){
                let object = {
                    action      : fetchedResult[commandType][SCDeviceID].type + (fetchedResult[commandType][SCDeviceID].MDIDs.length > 1 ? "M" : ""),
                    SSDeviceID  : fetchedResult[commandType][SCDeviceID].SSDeviceID,
                    SCDeviceID  : SCDeviceID,
                    MDID        : fetchedResult[commandType][SCDeviceID].MDIDs.join(","),
                    CH          : fetchedResult[commandType][SCDeviceID].CHs.join(","),
                    duration    : duration,
                    TOPOS       : publicMethods.translateTOPOS(publicMethods.translateTOPOS(value), fetchedResult[commandType][SCDeviceID].type)
                };
                if(fetchedResult[commandType][SCDeviceID].CHs.length === 1){
                    object["channel"] = object["CH"];
                }
                result.push(object);
            }
        }
        return result;
    }

}
class Room {
    constructor(roomID, name) {

        this.roomID = "";
        this.status = 0;
        this.name = "";
        this.deviceList = {};
        this.roomSS = "";

        this.SLGroup = new SCDeviceGroup();
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
    addDevice(deviceID, channel){

        let device = Seraph.devices.getDevice(deviceID);
        if(device){
            let deviceType = device.type;
            switch(deviceType){
                case "SL":
                    this.deviceList[deviceID] = parseInt((!channel) ? 3 : channel);
                    break;
                case "SP":
                    this.deviceList[deviceID] = parseInt((!channel) ? 7 : channel);
                    break;
                case "SS":
                    this.deviceList[deviceID] = 0;
                    this.roomSS = deviceID;
                    break;
                default:
                    this.deviceList[deviceID] = 0;
                    break;

            }

        }

    }

    getDeviceList(){
        return this.deviceList;
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
    performQuickAccess(quickAccessID){
        switch(quickAccessID){
            case "QA00000000":
                // let cmd = {
                //     commands: [
                //         {
                //             api: "/groupControl/room",
                //             command: {
                //                 roomID: ""
                //             }
                //         },{
                //             api: "ac",
                //             command: {
                //                 roomID: ""
                //             }
                //         }
                //     ]
                // }
                break;
            case "QA00000001":
                break
            default:
                break
        }
    }
}
class SeraphDevices{
    constructor(){
        this.roomReference = {};
        this.devices = {};
        this.ACDevices = {};
    }
    addReference(deviceID, roomID){
        if(this.roomReference[deviceID]){
            this.roomReference[deviceID].push(roomID);
        }   else    {
            this.roomReference[deviceID] = [roomID]
        }
    }
    getRoomByDevice(deviceID){
        if(this.roomReference.hasOwnProperty(deviceID)){
            return this.roomReference[deviceID]
        }   else    {
            return [];
        }

    }
    addDevice(deviceID, device){
        this.devices[deviceID] = device
    }

    getDevice(deviceID){
        let deviceType = deviceID.substring(0,2);
        return this.devices[deviceID];

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
    getDevicesBySC(SCDeviceID){
        let fetchedData = [];
        for(let key in this.devices) {
            let device = this.devices[key];
            if (device.SCDeviceID === SCDeviceID) {
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
            if(device.type === "SL" || device.type === "SP"){

                if(device.SCDeviceID === SCDeviceID){
                    if(device.MDID ===  MDID){
                        return device
                    }
                }
            }
        }
    }
    addACDevice(deviceID, model, SSDeviceID, brand, SCDeviceID){

        let ACDevices = new ACDevice(deviceID, model, SSDeviceID, brand, SCDeviceID);

        if(SSDeviceID !== "SS000000"){

            let SSDevice = this.getDevice(SSDeviceID);
            SSDevice.ACDevice = deviceID;
            this.addDevice(deviceID, ACDevices);
        }

    }
    checkAllLastUpdate(){
        for (let index in this.devices){
            this.devices[index].deviceStatus.checkLastUpdate();
        }
    }

}

class TCPConnection{

    constructor(){
        this.tempConnection = {}
    }

}
class SoftwareUpdate{
	constructor(){
		this.latestSSVersion = 0;
		this.currentESHVersion = "1.0";
		this.currentESHBuild = 0;
		this.updateQueue = [];
		let self = this;

		this.getLatestUpdate("SS");
		this.checkeSHVersion();
		setInterval(function () {
            self.getLatestUpdate("SS");
            self.checkeSHVersion();
            self.updateSingleDeviceFromQueue();
		}, 30000);
	}
	checkeSHVersion(){
		let self = this;
		fs.readFile('/opt/seraph_esh/version', function read(err, data) {
			if (err) {
				debug(err);
			}
			let content = parseInt(data.toString());
            if(content){
                self.currentESHBuild = content
            }

		});
    }
	updateSingleDeviceFromQueue(){
	    if(this.updateQueue.length > 0){
	        let deviceID = this.updateQueue[0];
		    Seraph.commandSystem.execute("/update/ss", {deviceID: deviceID})
        }
    }
	getVersion(type){
		switch(type.toLowerCase()){
			case "ss":
				return this.latestSSVersion;
			default:
				return 0;
		}
	}
	setVersion(type, value){
		switch(type.toLowerCase()){
			case "ss":
				this.latestSSVersion = value;
				break;
			default:
				return
		}
	}
	getFirmwareFilePath(type, version){
	    if(!version){
	        version = this.getVersion(type);
        }
		let folderName = this.getFirmwarePath(type);
		let expectedExtension = this.getFirmwareExtension(type);
		let prefix = this.getFirmwarePrefix(type);
		return folderName + "/" + prefix + version + "." + expectedExtension;
    }
	getFirmwarePath(type){
		type = type.toLowerCase();
		switch(type){
            case "ss":
                return "/opt/seraph_esh/apps/hardwareUpdates/SS/1";
            default:
                return ""
        }
    }
	getFirmwarePrefix(type){
		type = type.toLowerCase();
		switch(type){
			case "ss":
				return "SS_";
			default:
				return ""
		}
	}
	getFirmwareExtension(type){
		type = type.toLowerCase();
		switch(type){
			case "ss":
				return "bin";
			default:
				return ""
		}
	}
	checkAllSS(){
	    let deviceList = Seraph.devices.getDeviceList(["SS"]);
	    for(let key in deviceList){
            let deviceID = deviceList[key];
            this.checkSS(deviceID);
        }
    }
    checkSS(deviceID){
	    if(deviceID !== "SS000000"){
		    let device = Seraph.devices.getDevice(deviceID);
		    if(device.firmware < this.getVersion("SS")){
			    this.updateQueue.push(deviceID);
		    }
	    }
    }
	getLatestUpdate(type){
	    type = type.toLowerCase();
		let folderName = this.getFirmwarePath(type);
		let expectedExtension = this.getFirmwareExtension(type);
		let prefix = this.getFirmwarePrefix(type);
		let self = this;

		self.getMostRecentVersion(type,function (v) {
			var httpPush = new pushToServer();
			httpPush.webCall("GET", "/requestLatestVersion?type=" + type + "&homeID=" + Seraph.homeID, null, function(res) {
				let cloudVersion = parseInt(res);
				// console.log("The latest version of " + type + " is: "+ cloudVersion);
				if(cloudVersion && cloudVersion > self.latestSSVersion){
					httpPush.downloadFile(
						'http://seraph.applicationclick.com/eshApi/requestUpdateBinary?homeID=' + Seraph.homeID + "&type=" + type + "&version=" + cloudVersion,
						prefix + cloudVersion + "." + expectedExtension,
						folderName + "/",
						function(){
							debugUpdate("Cloud "+ type.toUpperCase()+" Version "+ cloudVersion + " Downloaded");
							self.setVersion(type, cloudVersion);
						}
					);

				}
			});
		})
    }
	getMostRecentVersion(type, callback) {
		type = type.toLowerCase();
		let folderName = this.getFirmwarePath(type);
		let expectedExtension = this.getFirmwareExtension(type);
		let prefix = this.getFirmwarePrefix(type);

		fs.readdir(folderName, (err, files) => {
			let nameArray = [];
			for(let i in files){
				let tempFile = files[i].split(".");
				let fileName = tempFile[0];
				let extension = tempFile[tempFile.length - 1];
				if((fileName.substr(0, prefix.length) === prefix) && (extension === expectedExtension)){
					let version = parseInt(fileName.split("_")[1]);
					if(version){
						nameArray.push(version);
					}
				}
			}
			callback(nameArray.sort()[nameArray.length - 1]);

		})

	}
}
class SeraphHome extends Home {

    constructor(homeID, name){
        super(homeID, name);


        this.threshold = {};
        this.rooms = {};
        this.floors = {};
        this.homeKitIdentifiers = {};
        this.sysConfigs = {};
        this.geographicInfos = {};
        this.SSPBLogs = {};

        this.devices = new SeraphDevices();
        this.notification = {};
        this.modes = new SeraphModes();
        this.quickAccesses = new SeraphQuickAccesses();
        this.TCPConnection = new TCPConnection();
        this.commandSystem = new CommandSystem();
        this.seraphUpdate = new SoftwareUpdate();


    }

    initHome(){
        let self = this;

        self.initSysConfig(function(){
            initDeviceFromCloud(function(){
                initDevices(function(){
                    //TCPClient = require("./TCPClient.js");
                    for(let key in self.devices.getDeviceList(["SS"])){
                        let SSDeviceID = self.devices.getDeviceList(["SS"])[key];
                        let SSDevice = self.devices.getDevice(SSDeviceID);
                        if(!SSDevice.isServer){
                            self.devices.getDevice(SSDeviceID).initTCPClientSocket()
                        }
                    }
                    initRooms(function(){
                        initFloors(function(){
                            self.notification = new Notification();
                            assignInitialSCDeviceValue(function(){
                                assignInitialSensorValue(function(){
                                    initConnectionWithSeraphCloud();
                                    smartConnect = require("./smartConnect.js");
                                    SIAP = require("./SIAP.js");
                                    checkAndBroadcastingSSTCPConfig();
                                    //require("./test.js");
                                    self.initHomeKitIdentifiers(function(){
                                    	HAPLinker = require("./HomeKit_Link.js");
                                        require("../HomeKit/BridgedCore.js");

                                    })
                                })
                            })
                        })
                    });


                });
            });

            webAction.getLocalIP(function(localIP){});
            webAction.refreshAll(function(){});
        })
    }

    addRoom(roomID, room){
        this.rooms[roomID] = room;
    }

    addFloor(floorID, floor){
        this.floors[floorID] = floor;
    }


    getNormalSensorState(code){
        if (this.threshold[code]){
            return this.threshold[code].getNormalLevel()
        }

    }


    getRoom(roomID){
        return this.rooms[roomID];
    }

    getFloor(floorID){
        return this.floors[floorID];
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
        self.sysConfigs = defaultValue;
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

    geteSHInfo(){
        return {
            firmware: this.seraphUpdate.currentESHVersion,
            build: this.seraphUpdate.currentESHBuild
        }
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

    log(content, type){
        let data = {
            "type"      : type,
            "content"   : content,
            "timestamp" : publicMethods.timestamp()
        }
        SQLAction.SQLAdd("seraph_log", data);
    }

}

let Seraph = new SeraphHome(require("../../config").homeID, "Seraph Home");
module.exports = Seraph;


let SQLAction = require("./SQLAction.js");
let TCPClient = require("./TCPClient.js");
let SSPB_APIs = require("./SSP-B.js");
let SSPA_APIs = require("./SSP-A.js");
let webAction = require("./webAction.js");

let pushToServer = require("./pushToServer.js").remotePush;
let { SSPAData } =  require("./SSP-A.js").SSPAData;
let { SSPAAction } = require("./SSP-A.js").SSPAAction;
let { ACCodecs } = require("./IRCodecs.js").ACCodecs;


Seraph.initHome();



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
                Seraph.devices.addReference(roomDeviceInfo.deviceID, roomDeviceInfo.roomID);
                Seraph.getRoom(roomDeviceInfo.roomID).addDevice(roomDeviceInfo.deviceID, roomDeviceInfo.CH)
                switch(roomDeviceInfo.deviceID.seraphType()){
                    case "ST":
                        let ST = Seraph.devices.getDevice(roomDeviceInfo.deviceID);
                        if (ST){
                            ST.setRoomID(roomDeviceInfo.roomID);
                        }
                        break;
                }
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

var initDeviceFromCloud = function(callback){
    var httpPush = new pushToServer();
    httpPush.webCall("APIGET", "/api/config/home?homeID=" + Seraph.homeID, null, function(res){
        let body = JSON.parse(res);
        if(body){

            if(body.devices){

                for(let deviceID in body.devices){
                    let deviceData = body.devices[deviceID];
                    let data = {
                        deviceID    :   deviceID,
                        type        :   deviceID.seraphType(),
                        model       :   deviceData.model ? deviceData.model : 0,
                    };
                    switch(deviceID.seraphType()){
                        case "SC":
                            data["managedSS"] = deviceData.SSDeviceID;
                            break;
                        case "SL":
                        case "SP":
                            data["managedSC"] = deviceData.SCDeviceID;
                            data["managedSS"] = body.devices[data["managedSC"]].SSDeviceID;
                            data["moduleID"] = deviceData.MDID;

                            for(let cName in deviceData.channels){
                                let channelID = cName.substr(1);
                                let channelData = {
                                    type        :   deviceID.seraphType(),
                                    deviceID    :   deviceID,
                                    channel     :   channelID,
                                    status      :   0,
                                    value       :   0,
                                    lastupdate  :   0,
                                    serveAS     :   deviceData.channels[cName].serveAS,
                                    name        :   deviceData.channels[cName].name
                                };
                                SQLAction.SQLUpdateIfExist("seraph_sc_device", channelData, {deviceID : deviceID, channel : channelID, type : channelData.type});
                            }
                            break;
                        case "ST":
                            data["managedSS"] = deviceData.SSDeviceID;
                            for(let keyName in deviceData.config){
                                var keyConfigData = {
                                    deviceID    :   deviceID,
                                    command     :   JSON.stringify(deviceData.config[keyName]),
                                };
                                switch(keyName){
                                    case "key1":
                                    case "key2":
                                    case "key3":
                                        keyConfigData["type"] = 1;
                                        keyConfigData["STKey"] = keyName.charAt(3);
                                        break;
                                    case "gestureNormal":
                                        keyConfigData["type"] = 2;
                                        keyConfigData["STKey"] = 4;
	                                    break;
                                }
                                if(keyConfigData.STKey){
	                                SQLAction.SQLUpdateIfExist("seraph_st", keyConfigData, {deviceID : deviceID, STKey : keyConfigData.STKey});
                                }

                            }
                            var keyConfigData = {
                                deviceID    :   deviceID,
                                type        :   2,
                                STKey       :   5
                            };
	                        if(keyConfigData.STKey){
		                        SQLAction.SQLUpdateIfExist("seraph_st", keyConfigData, {deviceID : deviceID, STKey : keyConfigData.STKey});
	                        }

                            break;
                        case "SS":
                            if(deviceID === "SS000000"){
                                data["isServer"] = 0;
                                data["IPAddress"] = "127.0.0.1";
                            }   else    {
                                data["isServer"] = 1;
                            }
                            if(deviceData.webCam){
                                data["webcamUID"] = deviceData.webCam.webcamUID;
                                data["webcamUsername"] = deviceData.webCam.webcamUsername;
                                data["webcamPassword"] = deviceData.webCam.webcamPassword;
                            }
                            let sensorSet = [
                                {channel : "21", code : "TP"},
                                {channel : "22", code : "HM"},
                                {channel : "23", code : "PT"},
                                {channel : "2E", code : "SM"},
                                {channel : "25", code : "PR"},
                                {channel : "24", code : "MI"},
                                {channel : "28", code : "BT"},
                                {channel : "26", code : "CO"},
                                {channel : "27", code : "CD"},
                                {channel : "2D", code : "VO"},
                            ];
                            for(let i in sensorSet){
                                let sensorRow = sensorSet[i];
                                sensorRow["deviceID"] = deviceID;
                                SQLAction.SQLUpdateIfExist("seraph_sensor", sensorRow, {deviceID : deviceID, code : sensorRow.code});
                            }

                            break;
                        case "SAAC":
                            data["managedSS"] = deviceData.SSDeviceID;
                            data["model"] = deviceData.brand;
                            if(deviceData.SCDeviceID){
                                data["managedSC"] = deviceData.SCDeviceID;
                            }
                            break;
                        default:
                            break;

                    }

                    SQLAction.SQLUpdateIfExist("seraph_device", data, {deviceID : deviceID});
                }
            }
            if(body.rooms){
                for(let roomID in body.rooms){
                    let roomData = body.rooms[roomID];
                    let roomInfo = {
                        roomID  : roomID,
                        name    : roomData.name
                    };
                    SQLAction.SQLUpdateIfExist("seraph_room", roomInfo, {roomID : roomID});
                    for(let roomDeviceID in roomData.devices){
                        let roomDeviceData = {
                            roomID      : roomID,
                            deviceID    : roomDeviceID,
                            CH          : roomData.devices[roomDeviceID]
                        };
                        SQLAction.SQLUpdateIfExist("seraph_room_device", roomDeviceData, {roomID : roomID, deviceID: roomDeviceID});
                    }
                }
            }

            if(body.floors){
                for(let floorID in body.floors){
                    let floorData = body.floors[floorID];
                    let floorInfo = {
                        floorID : floorID,
                        name    : floorData.name,
                        position: floorData.position
                    };
                    SQLAction.SQLUpdateIfExist("seraph_floor", floorInfo, {floorID : floorID});
                    for(let key in floorData.rooms){
                        let floorRoomData = {
                            floorID     : floorID,
                            roomID      : floorData.rooms[key],
                        };
                        SQLAction.SQLUpdateIfExist("seraph_floor_room", floorRoomData, {roomID : floorID, floorID: floorID});
                    }
                }
            }
        }
        callback();
    });

};

var initDevices = function(callback) {

    SQLAction.SQLSelect("seraph_device", "deviceID, type, model, managedSS, managedSC, moduleID, IPAddress, webcamUID, webcamUsername, webcamPassword, serveAs", "", "", function (deviceData) {
        SQLAction.SQLSelect("seraph_sc_device","*", "", "", function(channelData){
            SQLAction.SQLSelect("seraph_st","*","","",function(STConfigData){


                let STRef = {};
                for(let tKey in STConfigData){
                    let STConfig = STConfigData[tKey];
                    let command = {};
                    if (STConfig.command){
                        command = JSON.parse(STConfig.command);
                    }
                    STRef[STConfig.deviceID + "-" + STConfig.STKey] = command;
                }

                let channelREF = {};
                for(let ckey in channelData){
                    let channelD = channelData[ckey];
                    channelREF[channelD.deviceID + "-" + channelD.channel] = channelD;
                }


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

                        switch(deviceType){
                            case "SS":
                                let IPAddress = deviceData[key].IPAddress;
                                let seraphDevice = new SSDevice(deviceID, model, IPAddress);

                                if (webcamUID !== ""){
                                    seraphDevice.addWebCam(webcamUID, webcamUsername, webcamPassword)
                                }

                                Seraph.devices.addDevice(deviceID, seraphDevice);
                                break;
                            case "SP":
                            case "SL":
                                let SCEP = new SCEPDevice(deviceID, model, managedSS, managedSC, moduleID);

                                for(let index in SCEP.channels){
                                    if(deviceData[key].serveAs){
                                        SCEP.channels[index].serveAS = deviceData[key].serveAs;
                                    }   else    {
                                        SCEP.channels[index].serveAS = channelREF[deviceID + "-" + SCEP.channels[index].channelID].serveAS
                                    }
                                    SCEP.channels[index].icon = deviceData[key].icon;
                                }
                                Seraph.devices.addDevice(deviceID, SCEP);
                                break;
                            case "SAAC":
                                Seraph.devices.addACDevice(deviceID, deviceData[key].firmware, managedSS, parseInt(model), managedSC);
                                break;
                            case "ST":
                                let device = new STDevice(deviceID, model, managedSS);
                                for(let i = 0; i < 5; i++){
                                    device.setCommand(i, STRef[deviceID + "-" + i])
                                }
                                Seraph.devices.addDevice(deviceID, device);
                                break;
                            default:
                                Seraph.devices.addDevice(deviceID, new SDevice(deviceID, model, managedSS));
                                break;
                        }


                    }


                }
                callback()
            })


        })


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
                Seraph.devices.getDevice(deviceID).getChannel(channelID).setValue(value, lastUpdate)

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
            // console.log(quickAccess)
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
            let airQualityImpactIndex = parseInt(threshold.airQualityWeight);
            let recommendations = []
            try{
                recommendations = JSON.parse(threshold.recommendations);
            }   catch (err){
                debug(err);
            }

            let description = threshold.description;
            if (!lowerBound){
                lowerBound = null
            }
            let upperBound = threshold.upperBound;
            if (!upperBound){
                upperBound = null
            }
            let warningText = threshold.warningText;

            if (level === 0){
                if (sensorType === "AQ"){
                    Seraph.threshold[sensorType] = new AirQualityThreshold();
                }   else    {
                    Seraph.threshold[sensorType] = new sensorThreshold(sensorType, lowerBound, upperBound);
                }
            }   else    {
                Seraph.threshold[sensorType].addRule(level, lowerBound, upperBound , warningText, airQualityImpactIndex, recommendations, description);
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
            if (Seraph.devices.getDevice(deviceID).checkExistSensor(sensorID)) {
                Seraph.devices.getDevice(deviceID).getSensor(sensorID).setValue(value, lastUpdate);
            }
        }
        callback()
    });
};




var initConnectionWithSeraphCloud = function(){
    var httpPush = new pushToServer();

    var SSPAProtocolData = new SSPAData();
    SSPAProtocolData.isSCSCall = true;
    setInterval(function(){

        var data = SSPAProtocolData.homeData();
        let pendingLastReportedTimestamp = false;
        if(data.notifications.length > 0){
            pendingLastReportedTimestamp = publicMethods.timestampMS();
        }

        httpPush.webCall("POST", "/home/data", data, function(res){
            if(pendingLastReportedTimestamp){
                Seraph.notification.lastReportedTimestamp = pendingLastReportedTimestamp;
            }
            // console.log(res);
            let body = res;
            if( body !== []){
                for (let key in body){

                    let command = body[key];
                    if(command.ApiBase){

                    }   else    {
                        command.ApiBase = "qe";
                    }
                    Seraph.commandSystem.execute(command.ApiBase, command);


                }
            }
        });

    },  Seraph.sysConfigs.serviceInterval.SCloudCommandFetch);

    setInterval(function(){
        let data = SSPAProtocolData.homeConfigs();
        httpPush.webCall("POST", "/config/home", data, function(res){})
    }, Seraph.sysConfigs.serviceInterval.SCloudConfigHomeUpdate);

    setInterval(function(){
        SSPAProtocolData.sensorDataHistory(function(data){
            httpPush.webCall("POST", "/data/history", data, function(res){})
        });
        Seraph.devices.checkAllLastUpdate();
    },  Seraph.sysConfigs.serviceInterval.SCloudDataHistoryUpdate)
};

var checkAndBroadcastingSSTCPConfig = function(){
    setInterval(function(){
        let deviceList = Seraph.devices.getDeviceList(["SS"]);
        let totalSSDevices = deviceList.length - 1;
        for (let i in deviceList){
            let deviceID = deviceList[i];
            let SSDevice = Seraph.devices.getDevice(deviceID);
            if(SSDevice.getTCPConnectionStauts()){
                totalSSDevices -= 1;
            }
        }
        if(totalSSDevices === 0){
            smartConnect.startServerIP();
        }   else    {
            smartConnect.stopServerIP();
        }
    },  Seraph.sysConfigs.serviceInterval.checkSSBrocastingIP);
};


module.exports = Seraph;
