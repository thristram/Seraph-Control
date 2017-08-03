var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var debug = require('debug')('SLC_HAPAccessory');
var SSPLinker = require('../../Lib/HomeKit_Link.js')
var public = require("../../Lib/public.js")
var loadData = require("../../Lib/preloadData.js");


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
var reverseFlag = false;

var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
}
var setDeviceValue = function (incommingValue){
    deviceValue.power = incommingValue.power;
    deviceValue.brightness = incommingValue.value;
}

var LightController = {
    name: seraphConfig.model + " " + seraphConfig.version,
    setPower: function (status) { //set power of accessory
        debug("Turning the '%s' %s", this.name, status ? "on" : "off");

        deviceValue.power = status;
        var targetBrightness = deviceValue.brightness
        if(status){
            targetBrightness = deviceValue.brightness
        } else  {
            targetBrightness = 0
        }
        SSPLinker.SLCControl(seraphConfig.SSDeviceID, seraphConfig.SCdeviceID, seraphConfig.moduleID, seraphConfig.channelID, targetBrightness)
    },

    getPower: function (callback) { //get power of accessory
        checkDeviceStatus(function(){
            callback(deviceValue.power)
        })
    },

    setBrightness: function (brightness) { //set brightness
        debug("Setting '%s' brightness to %s", this.name, brightness);
        deviceValue.brightness = brightness;
        SSPLinker.SLCControl(seraphConfig.SSDeviceID, seraphConfig.SCdeviceID, seraphConfig.moduleID, seraphConfig.channelID, brightness)
    },

    getBrightness: function (callback) { //get brightness
        checkDeviceStatus(function(){
            callback()
        })

        //return deviceValue.brightness;
    },

    setSaturation: function (saturation) { //set brightness
        debug("Setting '%s' saturation to %s", this.name, saturation);
        deviceValue.saturation = saturation;
    },

    getSaturation: function () { //get brightness
        debug("'%s' saturation is %s", this.name, deviceValue.saturation);
        return deviceValue.saturation;
    },

    setHue: function (hue) { //set brightness
        debug("Setting '%s' hue to %s", this.name, hue);
        deviceValue.hue = hue;
    },

    getHue: function () { //get hue
        debug("'%s' hue is %s", this.name, deviceValue.hue);
        return deviceValue.hue;
    },

    identify: function () { //identify the accessory
        debug("Identify the '%s'", this.name);
    }
}

var updateDeviceStatus = function(time, device){
    if(!time) time = 1;
    setTimeout(function() {
        reverseFlag = true;
        checkDeviceStatus(function(){
            device
                .getService(Service.Lightbulb)
                .setCharacteristic(Characteristic.On, deviceValue.power)
                .setCharacteristic(Characteristic.Brightness, deviceValue.brightness);
            setTimeout(function(){
                reverseFlag = false;
            },1000)

        })
    }, time);
};
var checkDeviceStatus = function(callback){
    loadData.loadHomeKitData(function(){
        updateSeraphConfigStatus(loadData.deviceStatus[seraphConfig.deviceID][seraphConfig.channelID].value)
        callback()
    })
};
var updateSeraphConfigStatus = function(value){
    var brightness = parseInt(value);
    if (brightness == 100) {
        deviceValue.brightness = 100;
        deviceValue.power = true;
    } else if (brightness == 0) {

        deviceValue.power = false;
    } else {
        deviceValue.brightness = brightness + 1;
        deviceValue.power = true;
    }
}


var SLCService = function() {
    seraphConfig.udid = public.generateMACLikeUDID(seraphConfig.model, seraphConfig.deviceID, seraphConfig.channelID);


    // Generate a consistent UUID for our light Accessory that will remain the same even when
    // restarting our server. We use the `uuid.generate` helper function to create a deterministic
    // UUID based on an arbitrary "namespace" and the word "light".
    var lightUUID = uuid.generate('seraph_technology:accessories:' + seraphConfig.model + ":" + seraphConfig.version + ":" + seraphConfig.udid);

    // This is the Accessory that we'll return to HAP-NodeJS that represents our light.
    var lightAccessory = exports.accessory = new Accessory(seraphConfig.name, lightUUID);

    // Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
    lightAccessory.username = seraphConfig.udid;
    lightAccessory.pincode = seraphConfig.homeKitPin;

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
            if(!reverseFlag) {
                LightController.setPower(value);
                updateDeviceStatus(5000, lightAccessory);
            }
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
            LightController.getPower(function(){
                callback(null, deviceValue.power);
            })

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

            if(!reverseFlag) {
                LightController.setBrightness(value)
                updateDeviceStatus(10000, lightAccessory);
            }
            callback();
        })
        .on('get', function (callback) {
            LightController.getBrightness(function(){
                callback(null, deviceValue.brightness);
            })

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

    SSPLinker.HAPEvent.on('statusUpdate', function(deviceID, channel, value){
        if((deviceID == seraphConfig.deviceID) && (channel == seraphConfig.channelID)) {
            debug("Receive Status Message of " + deviceID + " Channel " + channel + " : " + value);
            reverseFlag = true;
            updateSeraphConfigStatus(value);
            lightAccessory
                .getService(Service.Lightbulb)
                .setCharacteristic(Characteristic.On, deviceValue.power)
                .setCharacteristic(Characteristic.Brightness, deviceValue.brightness);
            setTimeout(function () {
                reverseFlag = false;
            }, 1000)
        }
    });
    updateDeviceStatus(3000,lightAccessory);
};



module.exports.updateDeviceStatus = updateDeviceStatus;
module.exports.setDeviceValue = setDeviceValue;
module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSLCService = SLCService;



