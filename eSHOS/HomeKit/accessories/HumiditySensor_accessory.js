var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var SSPLinker = require('../../Lib/HomeKit_Link.js');
var public = require("../../Lib/public.js")

var seraphConfig = {
    "deviceID"      : "SS55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "1",
    "manufacturer"  : "Seraph Technology, LLC",
    "model"         : "SS Model-1",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph Humidity Sensor"
}
module.exports.setSeraphConfig = function(name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
}

module.exports.startSPCService = function() {

    seraphConfig.udid = public.generateMACLikeUDID(seraphConfig.model, seraphConfig.deviceID, seraphConfig.channelID);
    // here's a fake temperature sensor device that we'll expose to HomeKit
    var Seraph_Sensor = {
        currentHumidity: 50,
        getTemperature: function() {
            console.log("Getting the current humidity!");
            return Seraph_Sensor.currentHumidity;
        },
        randomizeTemperature: function() {
            // randomize temperature to a value between 0 and 100
            Seraph_Sensor.currentHumidity = Math.round(Math.random() * 100);
        }
    }


// Generate a consistent UUID for our Temperature Sensor Accessory that will remain the same
// even when restarting our server. We use the `uuid.generate` helper function to create
// a deterministic UUID based on an arbitrary "namespace" and the string "temperature-sensor".
    var sensorUUID = uuid.generate('seraph_technology:accessories:' + seraphConfig.model + ":" + seraphConfig.version + ":" + seraphConfig.udid);

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake lock.
    var sensor = exports.accessory = new Accessory(seraphConfig.name, sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
    sensor.username = seraphConfig.udid;
    sensor.pincode = seraphConfig.homeKitPin;

// Add the actual TemperatureSensor Service.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
    sensor
        .addService(Service.HumiditySensor, seraphConfig.name)
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('get', function(callback) {

            // return our current value
            callback(null, Seraph_Sensor.getTemperature());
        });

// randomize our temperature reading every 3 seconds
    setInterval(function() {

        Seraph_Sensor.randomizeTemperature();

        // update the characteristic value so interested iOS devices can get notified
        sensor
            .getService(Service.HumiditySensor)
            .setCharacteristic(Characteristic.CurrentRelativeHumidity, Seraph_Sensor.currentHumidity);

    }, 3000);

}
