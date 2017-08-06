var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var SSPLinker = require('../../Lib/HomeKit_Link.js')
var public = require("../../Lib/public.js");
var debug = require('debug')('MISensor_HAPAccessory');

var seraphConfig = {
    "deviceID"      : "SS55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "PR",
    "manufacturer"  : "Seraph Technology, LLC",
    "model"         : "SS Model-1",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph Motion Sensor"
}

var deviceValue = {
    MotionDetected: false,
};

var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
};

var updateSeraphConfigStatus = function(value){

    if(value.PR != "undefined"){
        if(parseInt(value.PR) == 1){
            deviceValue.MotionDetected = true;
        }   else    {
            deviceValue.MotionDetected = false;
        }
    }

}


var Seraph_Sensor = {

    getMotionDetected: function() {
        debug("Getting if Motion is Detected: " + deviceValue.MotionDetected ? "Yes" : "No" );
        return deviceValue.MotionDetected;
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
        .addService(Service.MotionSensor, seraphConfig.name)
        .getCharacteristic(Characteristic.MotionDetected)
        .on('get', function(callback) {
            // return our current value
            callback(null, Seraph_Sensor.getMotionDetected());
        });


    SSPLinker.HAPEvent.on('sensorUpdate', function(deviceID, channel, value){

        if((deviceID == seraphConfig.deviceID) && (channel == seraphConfig.channelID)) {
            debug("Receive Sensor Value Message of " + deviceID + " Channel " + channel + " : " + value);
            updateSeraphConfigStatus({"PR":value});
            sensor
                .getService(Service.MotionSensor)
                .setCharacteristic(Characteristic.MotionDetected, Seraph_Sensor.getMotionDetected());
        }
    });


}


module.exports.setDeviceValue = updateSeraphConfigStatus;
module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSensorService = SensorService;

