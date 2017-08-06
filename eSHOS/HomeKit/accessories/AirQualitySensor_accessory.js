var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var SSPLinker = require('../../Lib/HomeKit_Link.js')
var public = require("../../Lib/public.js");
var debug = require('debug')('AirQualitySensor_HAPAccessory');

var seraphConfig = {
    "deviceID"      : "SS55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "AQ",
    "manufacturer"  : "Seraph Technology, LLC",
    "model"         : "SS Model-1",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph Air Quality Sensor"
}

var deviceValue = {
    AirQuality: 1,
    CarbonDioxideLevel: 0,
    CarbonMonoxideLevel: 0,
    PM2_5Density: 9,
    VOCDensity: 11,
};

var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
};

var updateSeraphConfigStatus = function(value, initialUpdate){

    //Carbon Monoxide
    if(value.CO){
        deviceValue.CarbonMonoxideLevel = parseInt(parseInt(value.CO) / 10);
    }
    //Carbon Dioxide
    if(value.CD) {
        deviceValue.CarbonDioxideLevel = parseInt(value.CD);
    }
    //VOC Level
    if(value.VO){
        deviceValue.VOCDensity = (parseInt(value.VO) - 1) * 240 + 11;
    }
    //PM2.5 Level
    if(value.PT){
        deviceValue.PM2_5Density = parseInt(value.PT) + 9;
    }

}


var Seraph_Sensor = {
    getAirQuality: function() {
        debug("Getting the current Air Quality Level: " + deviceValue.AirQuality);
        return deviceValue.AirQuality;
    },
    getCarbonMonoxideLevel: function() {
        debug("Getting the current Carbon Monoxide Level: " + deviceValue.CarbonMonoxideLevel);
        return deviceValue.CarbonMonoxideLevel;
    },
    getCarbonDioxideLevel: function() {
        debug("Getting the current Carbon Dioxide Level: " + deviceValue.CarbonDioxideLevel);
        return deviceValue.CarbonDioxideLevel;
    },
    getPM2_5Density: function(){
        debug("Getting the current PM 2.5 Density: " + deviceValue.PM2_5Density);
        return deviceValue.PM2_5Density;
    },
    getVOCDensity: function(){
        debug("Getting the current VOC Density: " + deviceValue.VOCDensity);
        return deviceValue.VOCDensity;
    },
    identify: function() { //identify the accessory
        debug("Identify the '%s'", seraphConfig.name);
    }
}


var SensorService = function() {

    seraphConfig.udid = public.generateMACLikeUDID(seraphConfig.model, seraphConfig.deviceID, seraphConfig.channelID);


    // Generate a consistent UUID for our Temperature Sensor Accessory that will remain the same
    // even when restarting our server. We use the `uuid.generate` helper function to create
    // a deterministic UUID based on an arbitrary "namespace" and the string "temperature-sensor".
    var sensorUUID = uuid.generate('seraph_technology:accessories:' + seraphConfig.model + ":" + seraphConfig.version + ":" + seraphConfig.udid);

    // This is the Accessory that we'll return to HAP-NodeJS that represents our fake lock.
    var sensor = exports.accessory = new Accessory(seraphConfig.name, sensorUUID);

    // Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
    sensor.username = seraphConfig.udid;
    sensor.pincode = seraphConfig.homeKitPin;



    // set some basic properties (these values are arbitrary and setting them is optional)
    sensor
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, seraphConfig.manufacturer)
        .setCharacteristic(Characteristic.Model, seraphConfig.model + " " + seraphConfig.version)
        .setCharacteristic(Characteristic.SerialNumber, seraphConfig.deviceID);

    // listen for the "identify" event for this Accessory
    sensor.on('identify', function (paired, callback) {
        Seraph_Sensor.identify();
        callback();
    });
    // Add the actual TemperatureSensor Service.
    // We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
    sensor
        .addService(Service.AirQualitySensor, seraphConfig.name)
        .getCharacteristic(Characteristic.AirQuality)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getAirQuality());
        });

    sensor
        .getService(Service.AirQualitySensor)
        .addCharacteristic(Characteristic.CarbonMonoxideLevel)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getCarbonMonoxideLevel());
        });

    sensor
        .getService(Service.AirQualitySensor)
        .addCharacteristic(Characteristic.CarbonDioxideLevel)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getCarbonDioxideLevel());
        });

    sensor
        .getService(Service.AirQualitySensor)
        .addCharacteristic(Characteristic.PM2_5Density)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getPM2_5Density());
        });

    sensor
        .getService(Service.AirQualitySensor)
        .addCharacteristic(Characteristic.VOCDensity)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getVOCDensity());
        });

    SSPLinker.HAPEvent.on('sensorUpdate', function(deviceID, channel, value){

        if((deviceID == seraphConfig.deviceID) && (channel == "CO" || channel == "CD" || channel == "VO"|| channel == "PT")) {
            debug("Receive Sensor Value Message of " + deviceID + " Channel " + channel);
            var updateObject = {};
            updateObject[channel] = value;
            updateSeraphConfigStatus(updateObject);
            sensor
                .getService(Service.AirQualitySensor)
                .setCharacteristic(Characteristic.AirQuality, Seraph_Sensor.getAirQuality())
                .setCharacteristic(Characteristic.VOCDensity, Seraph_Sensor.getVOCDensity())
                .setCharacteristic(Characteristic.CarbonMonoxideLevel, Seraph_Sensor.getCarbonMonoxideLevel())
                .setCharacteristic(Characteristic.CarbonDioxideLevel, Seraph_Sensor.getCarbonDioxideLevel())
                .setCharacteristic(Characteristic.PM2_5Density, Seraph_Sensor.getPM2_5Density())

        }
    });


}


module.exports.setDeviceValue = updateSeraphConfigStatus;
module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSensorService = SensorService;

