var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var SSPLinker = require('../../Lib/HomeKit_Link.js')
var public = require("../../Lib/public.js");
var debug = require('debug')('CDSensor_HAPAccessory');

var seraphConfig = {
    "deviceID"      : "SS55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "CD",
    "manufacturer"  : "Seraph Technology, LLC",
    "model"         : "SS Model-1",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph CO2 Sensor"
}

var deviceValue = {
    CarbonMonoxideDetected: false,
    CarbonMonoxideLevel: 0,
    CarbonMonoxidePeakLevel : 0,
    CarbonMonoxidePeakTime : 0,
};

var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
};

var updateSeraphConfigStatus = function(value){

    var currentTime = public.timestamp();

    if(value.CO != "undefined"){
        deviceValue.CarbonMonoxideLevel = parseInt(value.CO) / 100;

        if((deviceValue.CarbonMonoxideLevel > deviceValue.CarbonMonoxidePeakLevel) || ((currentTime - deviceValue.CarbonMonoxidePeakTime) > 3600)){
            deviceValue.CarbonMonoxidePeakLevel = deviceValue.CarbonMonoxideLevel;
            deviceValue.CarbonMonoxidePeakTime = currentTime;
        }
        if(deviceValue.CarbonMonoxideLevel > 10){
            deviceValue.CarbonMonoxideDetected = true;
        }   else    {
            deviceValue.CarbonMonoxideDetected = false;
        }
    }

}


var Seraph_Sensor = {
    getCarbonMonoxideLevel: function() {
        debug("Getting the current Carbon Monoxide Level: " + deviceValue.CarbonMonoxideLevel);
        return deviceValue.CarbonMonoxideLevel;
    },
    getCarbonMonoxidePeakLevel: function() {
        debug("Getting the current Carbon Monoxide Peak Level: " + deviceValue.CarbonMonoxidePeakLevel);
        return deviceValue.CarbonMonoxidePeakLevel;
    },
    getCarbonMonoxideDetected: function() {
        debug("Getting if current Carbon Monoxide is Detected: " + deviceValue.CarbonMonoxideDetected);
        return deviceValue.CarbonMonoxideDetected;
    },
    identify: function() { //identify the accessory
        debug("Identify the '%s'", seraphConfig.name);
    }
}
var SensorController = {

};


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
        .addService(Service.CarbonMonoxideSensor, seraphConfig.name)
        .getCharacteristic(Characteristic.CarbonMonoxideDetected)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getCarbonMonoxideDetected());
        });

    sensor
        .getService(Service.CarbonMonoxideSensor)
        .addCharacteristic(Characteristic.CarbonMonoxideLevel)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getCarbonMonoxideLevel());
        });

    sensor
        .getService(Service.CarbonMonoxideSensor)
        .addCharacteristic(Characteristic.CarbonMonoxidePeakLevel)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getCarbonMonoxidePeakLevel());
        });

    SSPLinker.HAPEvent.on('sensorUpdate', function(deviceID, channel, value){

        if((deviceID == seraphConfig.deviceID) && (channel == seraphConfig.channelID)) {
            debug("Receive Sensor Value Message of " + deviceID + " Channel " + channel + " : " + value);
            updateSeraphConfigStatus({"CO":value});
            sensor
                .getService(Service.CarbonMonoxideSensor)
                .setCharacteristic(Characteristic.CarbonMonoxideLevel, Seraph_Sensor.getCarbonMonoxideLevel())
                .setCharacteristic(Characteristic.CarbonMonoxideDetected, Seraph_Sensor.getCarbonMonoxideDetected())
                .setCharacteristic(Characteristic.CarbonMonoxidePeakLevel, Seraph_Sensor.getCarbonMonoxidePeakLevel());

        }
    });


}


module.exports.setDeviceValue = updateSeraphConfigStatus;
module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSensorService = SensorService;

