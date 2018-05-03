var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var debug = require('debug')('SPC_HAPAccessory');
var SSPLinker = require('../../Lib/HomeKit_Link.js');
var public = require("../../Lib/public.js");
var Seraph = require('../../Lib/CoreData.js');

var err = null; // in case there were any problems

var seraphConfig = {
    "deviceID"      : "SC55AB56",
    "SCdeviceID"    : "SC55AB56",
    "SSDeviceID"    : "SSE11T26",
    "moduleID"      : "1",
    "channelID"     : "1",
    "manufacturer"  : "Seraph Technologies, Inc.",
    "model"         : "SPC",
    "version"       : "Rev-1",
    "serialNumber"  : "A1S2NASF88EW",
    "udid"          : "1A:2B:3C:4D:5D:FF",
    "homeKitPin"    : "031-45-154",
    "name"          : "Seraph Plug",
    "responseTimeout"  : "30",
}

var reverseFlag = false;
var receiptReserveTime = 0;

// here's a fake hardware device that we'll expose to HomeKit
var SThermostatController = {
    setHeatingThreshold: function(value){
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SAACDevice){
            SAACDevice.setHeatingThreshold(value);
        }
    },
    setCoolingThreshold: function(value){
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SAACDevice){
            SAACDevice.setCoolingThreshold(value);
        }
    },
    getHeatingThreshold: function(){
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SAACDevice){
            return SAACDevice.getHeatingThreshold()
        }
        return 0
    },
    getCoolingThreshold: function(){
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SAACDevice){
            return SAACDevice.getHeatingThreshold()
        }
        return 0
    },
    getMode: function() {
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        let value = 0;
        if(SAACDevice){
            if(!SAACDevice.power){
                return 0
            }

            switch(SAACDevice.currentHardwareMode){
                case 1:
                    value = 2;
                    break;
                case 2:
                    value = 1;
                    break;
                default:
                    value = 0;
                    break;
            }

        }
        return value;
    },
    getTargetMode(){
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        let value = 0;
        if(SAACDevice){
            if(!SAACDevice.power){
                return 0
            }
            if(SAACDevice.autoMode){
                return 3
            }
            switch(SAACDevice.mode){
                case 1:
                    value = 2;
                    break;
                case 2:
                    value = 1;
                    break;
                default:
                    value = 0;
                    break;
            }

        }
        return value;
    },
    setMode: function(value){
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SAACDevice){
            let targetMode = 0;

            switch(value){
                case 1:
                    SAACDevice.autoMode = false;
                    targetMode = 2;
                    break;
                case 2:
                    SAACDevice.autoMode = false;
                    targetMode = 1;
                    break;
                case 3:
                    SAACDevice.autoMode = true;
                    break;
                default:
                    SAACDevice.autoMode = false;
                    targetMode = 0;
                    break;
            }
            if(value !== 3){
                if (targetMode === 0){
                    SAACDevice.setPower(false);
                }   else    {
                    SAACDevice.setPower(true);
                    if(value !== 3){
                        SAACDevice.setMode(targetMode);
                    }

                }

                SAACDevice.executeACCommand();
            }

        }
    },
    setTargetTemperature: function(value){
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SAACDevice){
            SAACDevice.setPower(true);
            SAACDevice.setTemperature(value);
            SAACDevice.executeACCommand();
        }
    },
    getCurrentTemperature: function(){
        let value = 0;
        let SSDevice = Seraph.devices.getDevice(seraphConfig.SSDeviceID);
        if(SSDevice){
            value = SSDevice.getSensor("TP").getRealValue()
        }

        let targetTemperature = this.getTargetTemperature();



        return value
    },
    getCurrentHumidity: function(){
        let value = 0;
        let SSDevice = Seraph.devices.getDevice(seraphConfig.SSDeviceID);
        if(SSDevice){
            value = SSDevice.getSensor("HM").getRealValue()
        }
        return value
    },
    getTargetTemperature: function(){
        let value = 0;
        let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
        if(SAACDevice){
            value = SAACDevice.targetTemperature
        }
        return value;
    },
    identify: function() {
        debug("Identify the Seraph Power Control.");
    },
	getFirmwareVersion: function() {
		let SSDevice = Seraph.devices.getDevice(seraphConfig.SSDeviceID);
		if(SSDevice){
			return SSDevice.getFirmwareVersion();
		}
		return "1.0";
	},
	setHKUUID: function(UUID){
		let SAACDevice = Seraph.devices.getDevice(seraphConfig.deviceID);
		if(SAACDevice){
			SAACDevice.homeKitUUID = UUID;
		}
	}
};

// Generate a consistent UUID for our outlet Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the accessory name.


var setSeraphConfig = function (name, value){
    if(seraphConfig.hasOwnProperty(name)){
        seraphConfig[name] = value;
    }
};

var SPCService = function(){
    seraphConfig.udid = public.generateMACLikeUDID(seraphConfig.model, seraphConfig.deviceID, seraphConfig.channelID)
    // This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
    var thermostatUUID = uuid.generate('seraph_technology:accessories:' + seraphConfig.model + ":" + seraphConfig.version + ":" + seraphConfig.udid);
    SThermostatController.setHKUUID(thermostatUUID);
    var thermostat = exports.accessory = new Accessory('Thermostat', thermostatUUID);
    // Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
    thermostat.username = seraphConfig.udid;
    thermostat.pincode = seraphConfig.homeKitPin;

    // set some basic properties (these values are arbitrary and setting them is optional)
    thermostat
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, seraphConfig.manufacturer)
	    .setCharacteristic(Characteristic.FirmwareRevision, SThermostatController.getFirmwareVersion())
        .setCharacteristic(Characteristic.Model, seraphConfig.model + " " + seraphConfig.version)
        .setCharacteristic(Characteristic.SerialNumber, seraphConfig.deviceID);

    // listen for the "identify" event for this Accessory
    thermostat.on('identify', function(paired, callback) {
        SThermostatController.identify();
        callback(); // success
    });

    // Add the actual outlet Service and listen for change events from iOS.
    // We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
    thermostat
        .addService(Service.Thermostat, seraphConfig.name) // services exposed to the user should have "names" like "Fake Light" for us
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('set', function(value, callback) {
            SThermostatController.setMode(value);
            callback(); // Our fake Outlet is synchronous - this value has been successfully set
        });

    // We want to intercept requests for our current power state so we can query the hardware itself instead of
    // allowing HAP-NodeJS to return the cached Characteristic.value.
    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .on('get', function(callback) {

            // this event is emitted when you ask Siri directly whether your light is on or not. you might query
            // the light hardware itself to find this out, then call the callback. But if you take longer than a
            // few seconds to respond, Siri will give up.

            var err = null; // in case there were any problems
            callback(err, SThermostatController.getMode());

        });

    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('get', function(callback) {
            var err = null; // in case there were any problems
            callback(err, SThermostatController.getTargetMode());
        });

    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.CoolingThresholdTemperature)
        .on('get', function(callback) {
            var err = null; // in case there were any problems
            callback(err, SThermostatController.getCoolingThreshold());
        });
    thermostat
        .getService(Service.Thermostat) // services exposed to the user should have "names" like "Fake Light" for us
        .getCharacteristic(Characteristic.CoolingThresholdTemperature)
        .on('set', function(value, callback) {
            SThermostatController.setCoolingThreshold(value);
            callback(); // Our fake Outlet is synchronous - this value has been successfully set
        });
    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.HeatingThresholdTemperature)
        .on('get', function(callback) {
            var err = null; // in case there were any problems
            callback(err, SThermostatController.getHeatingThreshold());
        });
    thermostat
        .getService(Service.Thermostat) // services exposed to the user should have "names" like "Fake Light" for us
        .getCharacteristic(Characteristic.HeatingThresholdTemperature)
        .on('set', function(value, callback) {
            SThermostatController.setHeatingThreshold(value);
            callback(); // Our fake Outlet is synchronous - this value has been successfully set
        });
    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', function(callback) {

            // this event is emitted when you ask Siri directly whether your light is on or not. you might query
            // the light hardware itself to find this out, then call the callback. But if you take longer than a
            // few seconds to respond, Siri will give up.

            var err = null; // in case there were any problems


            callback(err, SThermostatController.getCurrentTemperature());

        });

    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.TargetTemperature)
        .on('get', function(callback) {

            // this event is emitted when you ask Siri directly whether your light is on or not. you might query
            // the light hardware itself to find this out, then call the callback. But if you take longer than a
            // few seconds to respond, Siri will give up.

            var err = null; // in case there were any problems


            callback(err, SThermostatController.getTargetTemperature());

        });
    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.TargetTemperature)
        .on('set', function(value, callback) {
            SThermostatController.setTargetTemperature(value);
            callback();
        });
    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.TemperatureDisplayUnits)
        .on('get', function(callback) {

            // this event is emitted when you ask Siri directly whether your light is on or not. you might query
            // the light hardware itself to find this out, then call the callback. But if you take longer than a
            // few seconds to respond, Siri will give up.

            var err = null; // in case there were any problems


            callback(err, 0);

        });
    thermostat
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('get', function(callback) {

            // this event is emitted when you ask Siri directly whether your light is on or not. you might query
            // the light hardware itself to find this out, then call the callback. But if you take longer than a
            // few seconds to respond, Siri will give up.

            var err = null; // in case there were any problems


            callback(err, SThermostatController.getCurrentHumidity());

        });

    SSPLinker.HAPEvent.on('ACUpdate', function(deviceID){

        if(deviceID === seraphConfig.deviceID){
            debug("Receive Status Message of " + deviceID);
            thermostat.getService(Service.Thermostat).setCharacteristic(Characteristic.CurrentHeatingCoolingState, SThermostatController.getMode())
                .setCharacteristic(Characteristic.TargetHeatingCoolingState, SThermostatController.getTargetMode())
                .setCharacteristic(Characteristic.TargetTemperature, SThermostatController.getTargetTemperature());



        }
    });
    SSPLinker.HAPEvent.on('sensorUpdate', function(deviceID, channel, value){
        if((deviceID === seraphConfig.SSDeviceID) && (channel === "HM" || channel === "TP")) {
            thermostat.getService(Service.Thermostat)
                .setCharacteristic(Characteristic.CurrentRelativeHumidity, SThermostatController.getCurrentHumidity())
                .setCharacteristic(Characteristic.CurrentTemperature, SThermostatController.getCurrentTemperature());
        }


    });
	SSPLinker.HAPEvent.on("versionUpdate", function(deviceID){
		if(deviceID === seraphConfig.deviceID) {
			thermostat
				.setCharacteristic(Characteristic.FirmwareRevision, SThermostatController.getFirmwareVersion());
		}
	});


};

setInterval(function(){
    if(receiptReserveTime > 0){
        receiptReserveTime--;
    }
},100);



module.exports.setSeraphConfig = setSeraphConfig;
module.exports.startSAACService = SPCService;



