var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var SSPLinker = require('../../Lib/HomeKit_Link.js')
var public = require("../../Lib/public.js");
var debug = require('debug')('AirQualitySensor_HAPAccessory');
var Seraph = require('../../Lib/CoreData.js');

var seraphConfig = {
    "deviceID"      : "SS55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "AQ",
    "manufacturer"  : "Seraph Technologies, Inc.",
    "model"         : "SS Model-1",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph Air Quality Sensor"
};


var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
};


var Seraph_Sensor = {
    getAirQuality: function() {
        let value = 0;
        let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SSDevice){
            value = SSDevice.airQuality.level
        }
        debug("Getting the current Air Quality Level: " + value);
        return value;
    },
    getCarbonMonoxideLevel: function() {
        let value = 0;
        let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SSDevice){
            value =  SSDevice.getSensor("CO").getValue() / 10
        }
        debug("Getting the current Carbon Monoxide Level: " + value);
        return value;
    },
    getCarbonDioxideLevel: function() {
        let value = 0;
        let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SSDevice){
            value =  SSDevice.getSensor("CD").getValue()
        }
        debug("Getting the current Carbon Dioxide Level: " + value);
        return value;
    },
    getPM2_5Density: function(){
        let value = 0;
        let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SSDevice){
            value =  SSDevice.getSensor("PT").getValue()
        }
        debug("Getting the current PM 2.5 Density: " + value);
        return value;
    },
    getVOCDensity: function(){
        let value = 0;
        let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SSDevice){
            value =  SSDevice.getSensor("VO").getValue()
        }
        debug("Getting the current VOC Density: " + value);
        return value;
    },
    identify: function() { //identify the accessory
        debug("Identify the '%s'", seraphConfig.name);
    },
	getFirmwareVersion: function() {
		let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
		if(SSDevice){
			return SSDevice.getFirmwareVersion();
		}
		return "1.0";
	},
	setHKUUID: function(UUID){
		let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
		if(SSDevice){
			SSDevice.airQuality.homeKitUUID = UUID;
		}
	}
};


var SensorService = function() {

    seraphConfig.udid = public.generateMACLikeUDID(seraphConfig.model, seraphConfig.deviceID, seraphConfig.channelID);


    // Generate a consistent UUID for our Temperature Sensor Accessory that will remain the same
    // even when restarting our server. We use the `uuid.generate` helper function to create
    // a deterministic UUID based on an arbitrary "namespace" and the string "temperature-sensor".
    var sensorUUID = uuid.generate('seraph_technology:accessories:' + seraphConfig.model + ":" + seraphConfig.version + ":" + seraphConfig.udid);
	Seraph_Sensor.setHKUUID(sensorUUID);
    // This is the Accessory that we'll return to HAP-NodeJS that represents our fake lock.
    var sensor = exports.accessory = new Accessory(seraphConfig.name, sensorUUID);

    // Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
    sensor.username = seraphConfig.udid;
    sensor.pincode = seraphConfig.homeKitPin;



    // set some basic properties (these values are arbitrary and setting them is optional)
    sensor
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, seraphConfig.manufacturer)
	    .setCharacteristic(Characteristic.FirmwareRevision, Seraph_Sensor.getFirmwareVersion())
        .setCharacteristic(Characteristic.Model, seraphConfig.model + " " + seraphConfig.version)
        .setCharacteristic(Characteristic.SerialNumber, seraphConfig.deviceID + "-" + seraphConfig.channelID);

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

    SSPLinker.HAPEvent.on('sensorUpdate', function(deviceID){

        if(deviceID === seraphConfig.deviceID) {
            debug("Receive Sensor Value Message of " + deviceID);
            let SSDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
            if(SSDevice){
                sensor
                    .getService(Service.AirQualitySensor)
                    .setCharacteristic(Characteristic.AirQuality, SSDevice.airQuality.level)
                    .setCharacteristic(Characteristic.VOCDensity, SSDevice.getSensor("VO").getValue())
                    .setCharacteristic(Characteristic.CarbonMonoxideLevel, (SSDevice.getSensor("CO").getValue() / 10))
                    .setCharacteristic(Characteristic.CarbonDioxideLevel, SSDevice.getSensor("CD").getValue())
                    .setCharacteristic(Characteristic.PM2_5Density, SSDevice.getSensor("PT").getValue())
            }


        }
    });
	SSPLinker.HAPEvent.on("versionUpdate", function(deviceID){
		if(deviceID === seraphConfig.deviceID) {
			sensor
				.setCharacteristic(Characteristic.FirmwareRevision, Seraph_Sensor.getFirmwareVersion());
		}
	});


};

module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSensorService = SensorService;

