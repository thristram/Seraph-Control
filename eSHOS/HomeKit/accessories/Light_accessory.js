var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var SSPLinker = require('../../Lib/HomeKit_Link.js')
var public = require("../../Lib/public.js")

var seraphConfig = {
    "deviceID"      : "SC55AB56",
    "SCdeviceID"    : "SC55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "1",
    "manufacturer"  : "Seraph Technology, LLC",
    "model"         : "SLC",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph Light"
};
var deviceValue = {
    power: false,
    brightness: 100,
    hue: 0, //current hue
    saturation: 0,
}
var LightController = {}

var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
}
var setDeviceValue = function (incommingValue){
    deviceValue.power = incommingValue.power;
    deviceValue.brightness = incommingValue.value;
}

module.exports.setDeviceValue = setDeviceValue;
module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSPCService = function() {
    seraphConfig.udid = public.generateMACLikeUDID(seraphConfig.model, seraphConfig.deviceID, seraphConfig.channelID);
    LightController = {
        name: seraphConfig.name, //name of accessory
        pincode: seraphConfig.homeKitPin,
        username: seraphConfig.udid, // MAC like address used by HomeKit to differentiate accessories.
        manufacturer: seraphConfig.manufacturer, //manufacturer (optional)
        model: seraphConfig.model, //model (optional)
        serialNumber: seraphConfig.moduleID, //serial number (optional)

        power: deviceValue.power, //curent power status
        brightness: deviceValue.brightness, //current brightness
        hue: deviceValue.hue, //current hue
        saturation: deviceValue.saturation, //current saturation

        outputLogs: true, //output logs

        setPower: function (status) { //set power of accessory
            if (this.outputLogs) console.log("Turning the '%s' %s", this.name, status ? "on" : "off");
            this.power = status;
            var targetBrightness = this.brightness
            if(status){
                targetBrightness = this.brightness
            } else  {
              targetBrightness = 0
            }
            SSPLinker.SLCControl(seraphConfig.SSDeviceID, seraphConfig.SCdeviceID, seraphConfig.moduleID, seraphConfig.channelID, targetBrightness)
        },

        getPower: function () { //get power of accessory
            if (this.outputLogs) console.log("'%s' is %s.", this.name, this.power ? "on" : "off");
            return this.power;
        },

        setBrightness: function (brightness) { //set brightness
            if (this.outputLogs) console.log("Setting '%s' brightness to %s", this.name, brightness);
            this.brightness = brightness;
            SSPLinker.SLCControl(seraphConfig.SSDeviceID, seraphConfig.SCdeviceID, seraphConfig.moduleID, seraphConfig.channelID, brightness)
        },

        getBrightness: function () { //get brightness
            if (this.outputLogs) console.log("'%s' brightness is %s", this.name, this.brightness);
            return this.brightness;
        },

        setSaturation: function (saturation) { //set brightness
            if (this.outputLogs) console.log("Setting '%s' saturation to %s", this.name, saturation);
            this.saturation = saturation;
        },

        getSaturation: function () { //get brightness
            if (this.outputLogs) console.log("'%s' saturation is %s", this.name, this.saturation);
            return this.saturation;
        },

        setHue: function (hue) { //set brightness
            if (this.outputLogs) console.log("Setting '%s' hue to %s", this.name, hue);
            this.hue = hue;
        },

        getHue: function () { //get hue
            if (this.outputLogs) console.log("'%s' hue is %s", this.name, this.hue);
            return this.hue;
        },

        identify: function () { //identify the accessory
            if (this.outputLogs) console.log("Identify the '%s'", this.name);
        }
    }

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
    var lightUUID = uuid.generate('seraph_technology:accessories:' + seraphConfig.model + ":" + seraphConfig.version + ":" + seraphConfig.udid);

// This is the Accessory that we'll return to HAP-NodeJS that represents our light.
    var lightAccessory = exports.accessory = new Accessory(seraphConfig.name, lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
    lightAccessory.username = LightController.username;
    lightAccessory.pincode = LightController.pincode;

// set some basic properties (these values are arbitrary and setting them is optional)
    lightAccessory
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, seraphConfig.manufacturer)
        .setCharacteristic(Characteristic.Model, seraphConfig.model + " " + seraphConfig.version)
        .setCharacteristic(Characteristic.SerialNumber, seraphConfig.deviceID);

// listen for the "identify" event for this Accessory
    lightAccessory.on('identify', function (paired, callback) {
        LightController.identify();
        callback();
    });

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
    lightAccessory
        .addService(Service.Lightbulb, seraphConfig.name) // services exposed to the user should have "names" like "Light" for this case
        .getCharacteristic(Characteristic.On)
        .on('set', function (value, callback) {
            LightController.setPower(value);

            // Our light is synchronous - this value has been successfully set
            // Invoke the callback when you finished processing the request
            // If it's going to take more than 1s to finish the request, try to invoke the callback
            // after getting the request instead of after finishing it. This avoids blocking other
            // requests from HomeKit.
            callback();
        })
        // We want to intercept requests for our current power state so we can query the hardware itself instead of
        // allowing HAP-NodeJS to return the cached Characteristic.value.
        .on('get', function (callback) {
            callback(null, LightController.getPower());
        });

// To inform HomeKit about changes occurred outside of HomeKit (like user physically turn on the light)
// Please use Characteristic.updateValue
// 
// lightAccessory
//   .getService(Service.Lightbulb)
//   .getCharacteristic(Characteristic.On)
//   .updateValue(true);

// also add an "optional" Characteristic for Brightness
    lightAccessory
        .getService(Service.Lightbulb)
        .addCharacteristic(Characteristic.Brightness)
        .on('set', function (value, callback) {
            LightController.setBrightness(value);
            callback();
        })
        .on('get', function (callback) {
            callback(null, LightController.getBrightness());
        });

// also add an "optional" Characteristic for Saturation
    lightAccessory
        .getService(Service.Lightbulb)
        .addCharacteristic(Characteristic.Saturation)
        .on('set', function (value, callback) {
            LightController.setSaturation(value);
            callback();
        })
        .on('get', function (callback) {
            callback(null, LightController.getSaturation());
        });

// also add an "optional" Characteristic for Hue
    lightAccessory
        .getService(Service.Lightbulb)
        .addCharacteristic(Characteristic.Hue)
        .on('set', function (value, callback) {
            LightController.setHue(value);
            callback();
        })
        .on('get', function (callback) {
            callback(null, LightController.getHue());
        });
}
