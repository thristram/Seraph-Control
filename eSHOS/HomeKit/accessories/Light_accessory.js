var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var debug = require('debug')('SLC_HAPAccessory');
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
    "name"          : "Seraph Light",
    "responseTimeout"  : "60",
};
var deviceValue = {
    power: false,
    brightness: 100,
    hue: 0, //current hue
    saturation: 0,
}
var reverseFlag = false;
var receiptReserveTime = 0;

var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
}

var SLightController = {
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
        callback(deviceValue.power)
    },

    setBrightness: function (brightness) { //set brightness
        debug("Setting '%s' brightness to %s", this.name, brightness);
        deviceValue.brightness = brightness;
        SSPLinker.SLCControl(seraphConfig.SSDeviceID, seraphConfig.SCdeviceID, seraphConfig.moduleID, seraphConfig.channelID, brightness)
    },

    getBrightness: function (callback) { //get brightness
        callback(deviceValue.brightness);
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

var updateSeraphConfigStatus = function(value){

    if(value.TOPOS != "undefined"){
        var brightness = parseInt(value.TOPOS);
        if (brightness == 100) {
            deviceValue.brightness = 100;
            deviceValue.power = true;
        } else if (brightness == 0) {

            deviceValue.power = false;
        } else {
            deviceValue.brightness = brightness;
            deviceValue.power = true;
        }
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
        SLightController.identify();
        callback();
    });

    // Add the actual Lightbulb Service and listen for change events from iOS.
    // We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
    lightAccessory
        .addService(Service.Lightbulb, seraphConfig.name) // services exposed to the user should have "names" like "Light" for this case
        .getCharacteristic(Characteristic.On)
        .on('set', function (value, callback) {
            if(!reverseFlag) {
                SLightController.setPower(value);
                receiptReserveTime += parseInt(seraphConfig.responseTimeout);
            }

            callback();
        })
        // We want to intercept requests for our current power state so we can query the hardware itself instead of
        // allowing HAP-NodeJS to return the cached Characteristic.value.
        .on('get', function (callback) {
            SLightController.getPower(function(){
                callback(null, deviceValue.power);
            })

        });

    // also add an "optional" Characteristic for Brightness
    lightAccessory
        .getService(Service.Lightbulb)
        .addCharacteristic(Characteristic.Brightness)
        .on('set', function (value, callback) {

            if(!reverseFlag) {
                SLightController.setBrightness(value)
                receiptReserveTime += parseInt(seraphConfig.responseTimeout);
            }
            callback();
        })
        .on('get', function (callback) {
            SLightController.getBrightness(function(){
                callback(null, deviceValue.brightness);
            })

        });

    // also add an "optional" Characteristic for Saturation
    lightAccessory
        .getService(Service.Lightbulb)
        .addCharacteristic(Characteristic.Saturation)
        .on('set', function (value, callback) {
            SLightController.setSaturation(value);

            callback();
        })
        .on('get', function (callback) {
            callback(null, SLightController.getSaturation());
        });

    // also add an "optional" Characteristic for Hue
    lightAccessory
        .getService(Service.Lightbulb)
        .addCharacteristic(Characteristic.Hue)
        .on('set', function (value, callback) {
            SLightController.setHue(value);
            callback();
        })
        .on('get', function (callback) {
            callback(null, SLightController.getHue());
        });

    SSPLinker.HAPEvent.on('statusUpdate', function(deviceID, channel, value, ifReceipt){

        if(((receiptReserveTime > 0) && (ifReceipt)) || (receiptReserveTime <= 0)){

            if((deviceID == seraphConfig.deviceID) && (channel == seraphConfig.channelID)) {
                debug("Receive Status Message of " + deviceID + " Channel " + channel + " : " + value);
                reverseFlag = true;
                updateSeraphConfigStatus({"TOPOS":value});
                lightAccessory
                    .getService(Service.Lightbulb)
                    .setCharacteristic(Characteristic.On, deviceValue.power)
                    .setCharacteristic(Characteristic.Brightness, deviceValue.brightness);
                setTimeout(function () {
                    reverseFlag = false;
                }, 1000)
            }
        }



    });

};

setInterval(function(){
    if(receiptReserveTime > 0){
        receiptReserveTime--;
    }
},100);


module.exports.setDeviceValue = updateSeraphConfigStatus;
module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSLCService = SLCService;



