var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var debug = require('debug')('SPC_HAPAccessory');
var SSPLinker = require('../../Lib/HomeKit_Link.js');
var public = require("../../Lib/public.js");
var loadData = require("../../Lib/preloadData.js");


var err = null; // in case there were any problems

var seraphConfig = {
    "deviceID"      : "SC55AB56",
    "SCdeviceID"    : "SC55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "1",
    "manufacturer"  : "Seraph Technology, LLC",
    "model"         : "SPC",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph Plug"
}
var deviceValue = {
    power: false,
}
var reverseFlag = false;

// here's a fake hardware device that we'll expose to HomeKit
var SPowerControl = {
    setPowerOn: function(on) {
        debug("Turning the " + seraphConfig.name + " %s!...", on ? "on" : "off");
        if (on) {
          deviceValue.power = true;
          if(err) { return console.log(err); }
          debug("Seraph Power Control is now ON.");
          SSPLinker.SPCControl(seraphConfig.SSDeviceID, seraphConfig.SCdeviceID, seraphConfig.moduleID, seraphConfig.channelID, true)
        } else {
          deviceValue.power = false;
          if(err) { return console.log(err); }
          debug("Seraph Power Control is now OFF.");
          SSPLinker.SPCControl(seraphConfig.SSDeviceID, seraphConfig.SCdeviceID, seraphConfig.moduleID, seraphConfig.channelID, false)
        }
    },
    identify: function() {
        debug("Identify the Seraph Power Control.");
    }
}

// Generate a consistent UUID for our outlet Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the accessory name.


var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
}
var setDeviceValue = function (incommingValue){
    deviceValue.power = incommingValue.power;
}

var updateDeviceStatus = function(time, device){
    if(!time) time = 1;
    setTimeout(function() {
        reverseFlag = true;
        checkDeviceStatus(function(){
            device
                .getService(Service.Outlet)
                .setCharacteristic(Characteristic.On, deviceValue.power);
            reverseFlag = false;
        })
    }, time);
};
var checkDeviceStatus = function(callback){
    loadData.loadHomeKitData(function(){
        updateSeraphConfigStatus(loadData.deviceStatus[seraphConfig.deviceID][seraphConfig.channelID].value)
        callback()
    })
}

var updateSeraphConfigStatus = function(value){
    if(parseInt(value) > 0){
        debug("Checking Status of " + seraphConfig.deviceID + " Channel " + seraphConfig.channelID + " : ON")
        deviceValue.power = true;
    }   else    {
        debug("Checking Status of " + seraphConfig.deviceID + " Channel " + seraphConfig.channelID + " : OFF")
        deviceValue.power = false;
    }
}

var SPCService = function(){
    seraphConfig.udid = public.generateMACLikeUDID(seraphConfig.model, seraphConfig.deviceID, seraphConfig.channelID)
    // This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
    var outletUUID = uuid.generate('seraph_technology:accessories:' + seraphConfig.model + ":" + seraphConfig.version + ":" + seraphConfig.udid);
    var outlet = exports.accessory = new Accessory('Outlet', outletUUID);
    // Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
    outlet.username = seraphConfig.udid;
    outlet.pincode = seraphConfig.homeKitPin;

    // set some basic properties (these values are arbitrary and setting them is optional)
    outlet
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, seraphConfig.manufacturer)
        .setCharacteristic(Characteristic.Model, seraphConfig.model + " " + seraphConfig.version)
        .setCharacteristic(Characteristic.SerialNumber, seraphConfig.deviceID)

    // listen for the "identify" event for this Accessory
    outlet.on('identify', function(paired, callback) {
        SPowerControl.identify();
        callback(); // success
    });

    // Add the actual outlet Service and listen for change events from iOS.
    // We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
    outlet
        .addService(Service.Outlet, seraphConfig.name) // services exposed to the user should have "names" like "Fake Light" for us
        .getCharacteristic(Characteristic.On)
        .on('set', function(value, callback) {
            if(!reverseFlag){
                SPowerControl.setPowerOn(value);
                updateDeviceStatus(5000, outlet);
            }
            callback(); // Our fake Outlet is synchronous - this value has been successfully set
        });

    // We want to intercept requests for our current power state so we can query the hardware itself instead of
    // allowing HAP-NodeJS to return the cached Characteristic.value.
    outlet
        .getService(Service.Outlet)
        .getCharacteristic(Characteristic.On)
        .on('get', function(callback) {

            // this event is emitted when you ask Siri directly whether your light is on or not. you might query
            // the light hardware itself to find this out, then call the callback. But if you take longer than a
            // few seconds to respond, Siri will give up.

            var err = null; // in case there were any problems

            checkDeviceStatus(function(){

                if (deviceValue.power) {
                    callback(err, true);
                }
                else {
                    callback(err, false);
                }
            })


        });

    SSPLinker.HAPEvent.on('statusUpdate', function(deviceID, channel, value){

        if((deviceID == seraphConfig.deviceID) && (channel == seraphConfig.channelID)){
            debug("Receive Status Message of " + deviceID + " Channel " + channel + " : " + value)
            reverseFlag = true;
            updateSeraphConfigStatus(value);
            outlet
                .getService(Service.Outlet)
                .setCharacteristic(Characteristic.On, deviceValue.power);
            reverseFlag = false;
        }

    });
    updateDeviceStatus(3000,outlet)


};



module.exports.setDeviceValue = setDeviceValue;
module.exports.setSeraphConfig = setSeraphConfig;
module.exports.updateDeviceStatus = updateDeviceStatus;
module.exports.startSPCService = SPCService;



