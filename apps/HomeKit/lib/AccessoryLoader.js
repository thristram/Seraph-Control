'use strict';

var fs = require('fs');
var path = require('path');
var Accessory = require('./Accessory').Accessory;
var Service = require('./Service').Service;
var Characteristic = require('./Characteristic').Characteristic;
var uuid = require('./util/uuid');
var debug = require('debug')('AccessoryLoader');
var requireUncached = require('require-uncached');
var Seraph = require("../../Lib/CoreData.js");
var publicMethod = require("../../Lib/public.js");


module.exports = {
  loadDirectory: loadDirectory,
  parseAccessoryJSON: parseAccessoryJSON,
  parseServiceJSON: parseServiceJSON,
  parseCharacteristicJSON: parseCharacteristicJSON
};

/**
 * Loads all accessories from the given folder. Handles object-literal-style accessories, "accessory factories",
 * and new-API style modules.
 */

function loadDirectory(dir, callback) {

  // exported accessory objects loaded from this dir
  var accessories = [];


    let SCEPDevices = Seraph.devices.getDeviceList(["SL","SP"]);
    for(let key in SCEPDevices){
        let deviceID = SCEPDevices[key];
        let device = Seraph.devices.getDevice(deviceID);
        let SSDeviceID = device.SSDeviceID;
        let SCDeviceID = device.SCDeviceID;
        let moduleID = device.MDID;
        for(let ckey in device.channels){
            let channel = device.channels[ckey];
            let channelID = "" + channel.channelID;
            let deviceName = channel.getName();
            let deviceValue = {
                "TOPOS"         :   channel.getValue(),
                "lastupdate"    :   channel.lastupdate
            }
            //console.log(deviceID + "/" + SSDeviceID + "/" + SCDeviceID + "/" + moduleID + "/" + channelID + "/" + deviceName + "/" + deviceValue["TOPOS"]);
            switch(channel.channelType){
                case "SP":
                    if (channel.serveAS !== "HVAC"){
                        accessories.push(loadSPC(dir,deviceID, SSDeviceID, SCDeviceID, moduleID, channelID, deviceName, deviceValue));
                    }   else    {
                        // console.log("ignor")
                    }
                    break;
                case "SL":
                    accessories.push(loadSLC(dir,deviceID, SSDeviceID, SCDeviceID, moduleID, channelID, deviceName, deviceValue));
                    break;
                default:
                    break;
            }
        }
    }

    let SSDevices = Seraph.devices.getDeviceList(["SS"]);
    let AirQualityDeviceValue = {};
    for(let key in SSDevices){
        let deviceID = SSDevices[key];
        if (deviceID !== "SS000000"){
            let device = Seraph.devices.getDevice(deviceID);
            for(let sensorID in device.sensors){
                let sensor = device.sensors[sensorID];
                let deviceValue = {};
                deviceValue[sensorID] = "" + sensor.getValue()
                let displayName = sensor.shortName + " Sensor";
                let IDName = sensor.shortName + "Sensor";

                if(["TP","HM","CO","CD","MI","CO","SM"].indexOf(sensorID) > (-1)){
                    accessories.push(loadSensor(dir, deviceID, displayName, sensorID, IDName, deviceValue));
                }
                if(["CO","CD","VO","PT"].indexOf(sensorID) > (-1)){
                    AirQualityDeviceValue[sensorID] = deviceValue[sensorID]
                }

            }
            accessories.push(loadSensor(dir, deviceID, "Air Quality Sensor", "AQ", "AirQualitySensor", AirQualityDeviceValue));
        }

    }

    let ACDevices = Seraph.devices.getDeviceList(["SAAC"]);
    for(let key in ACDevices) {
        let ACDeviceID = ACDevices[key];
        let device = Seraph.devices.getDevice(ACDeviceID);
        accessories.push(loadSAAC(dir, ACDeviceID, device.SSDeviceID, device.SCDeviceID, "Seraph Smart Thermostat"))
    }

    // now we need to coerce all accessory objects into instances of Accessory (some or all of them may
    // be object-literal JSON-style accessories)
    return accessories.map(function(accessory) {
        if(accessory === null || accessory === undefined) { //check if accessory is not empty
            console.log("Invalid accessory!");
            return false;
        } else {
            return (accessory instanceof Accessory) ? accessory : parseAccessoryJSON(accessory);
        }
    }).filter(function(accessory) { return accessory ? true : false; });


}
function loadSAAC(dir, deviceID, SSDeviceID, SCDeviceID, name){
    var file = "HVAC_accessory.js";
    debug('Parsing accessory: %s', file);
    var loadedAccessory = requireUncached(path.join(dir, file));
    loadedAccessory.setSeraphConfig("deviceID", deviceID);
    loadedAccessory.setSeraphConfig("SCdeviceID", SCDeviceID);
    loadedAccessory.setSeraphConfig("SSDeviceID", SSDeviceID);
    loadedAccessory.setSeraphConfig("name", name);
    loadedAccessory.startSAACService();
    return loadedAccessory.accessory;
}
function loadSPC(dir, deviceID, SSDeviceID, SCdeviceID, moduleID, channelID, name, deviceValue){
    var file = "Outlet_accessory.js"
    debug('Parsing accessory: %s', file);
    var loadedAccessory = requireUncached(path.join(dir, file));
    loadedAccessory.setSeraphConfig("deviceID", deviceID);
    loadedAccessory.setSeraphConfig("SCdeviceID", SCdeviceID);
    loadedAccessory.setSeraphConfig("SSDeviceID", SSDeviceID);
    loadedAccessory.setSeraphConfig("channelID", channelID);
    loadedAccessory.setSeraphConfig("moduleID", moduleID);
    loadedAccessory.setSeraphConfig("name", name);
    loadedAccessory.setDeviceValue(deviceValue,true);
    loadedAccessory.startSPCService();
    return loadedAccessory.accessory;
}

function loadSLC(dir, deviceID, SSDeviceID, SCdeviceID, moduleID, channelID, name, deviceValue){
    var file = "Light_accessory.js"
    debug('Parsing accessory: %s', file);
    var loadedAccessory = requireUncached(path.join(dir, file));
    loadedAccessory.setSeraphConfig("deviceID", deviceID);
    loadedAccessory.setSeraphConfig("SCdeviceID", SCdeviceID);
    loadedAccessory.setSeraphConfig("SSDeviceID", SSDeviceID);
    loadedAccessory.setSeraphConfig("channelID", channelID);
    loadedAccessory.setSeraphConfig("moduleID", moduleID);
    loadedAccessory.setSeraphConfig("name", name);
    loadedAccessory.setDeviceValue(deviceValue,true);
    loadedAccessory.startSLCService();
    return loadedAccessory.accessory;
}
function loadSensor(dir, SSDeviceID, name, channelID, sensorClassName, deviceValue){
    var file = sensorClassName + "_accessory.js"
    debug('Parsing accessory: %s', file);
    var loadedAccessory = requireUncached(path.join(dir, file));
    loadedAccessory.setSeraphConfig("deviceID", SSDeviceID);
    loadedAccessory.setSeraphConfig("SSdeviceID", SSDeviceID);
    loadedAccessory.setSeraphConfig("channelID", channelID);
    loadedAccessory.setSeraphConfig("name", name);
    loadedAccessory.startSensorService();
    return loadedAccessory.accessory;
}

/**
 * Accepts object-literal JSON structures from previous versions of HAP-NodeJS and parses them into
 * newer-style structures of Accessory/Service/Characteristic objects.
 */

function parseAccessoryJSON(json) {

  // parse services first so we can extract the accessory name
  var services = [];

  json.services.forEach(function(serviceJSON) {
    var service = parseServiceJSON(serviceJSON);
    services.push(service);
  });

  var displayName = json.displayName;

  services.forEach(function(service) {
    if (service.UUID === '0000003E-0000-1000-8000-0026BB765291') { // Service.AccessoryInformation.UUID
      service.characteristics.forEach(function(characteristic) {
        if (characteristic.UUID === '00000023-0000-1000-8000-0026BB765291') {// Characteristic.Name.UUID
          displayName = characteristic.value;
        }
      });
    }
  });

  var accessory = new Accessory(displayName, uuid.generate(displayName));

  // create custom properties for "username" and "pincode" for Core.js to find later (if using Core.js)
  accessory.username = json.username;
  accessory.pincode = json.pincode;

  // clear out the default services
  accessory.services.length = 0;

  // add services
  services.forEach(function(service) {
    accessory.addService(service);
  });

  return accessory;
}

function parseServiceJSON(json) {
  var serviceUUID = json.sType;

  // build characteristics first so we can extract the Name (if present)
  var characteristics = [];

  json.characteristics.forEach(function(characteristicJSON) {
    var characteristic = parseCharacteristicJSON(characteristicJSON);
    characteristics.push(characteristic);
  });

  var displayName = null;

  // extract the "Name" characteristic to use for 'type' discrimination if necessary
  characteristics.forEach(function(characteristic) {
    if (characteristic.UUID == '00000023-0000-1000-8000-0026BB765291') // Characteristic.Name.UUID
      displayName = characteristic.value;
  });

  // Use UUID for "displayName" if necessary, as the JSON structures don't have a value for this
  var service = new Service(displayName || serviceUUID, serviceUUID, displayName);

  characteristics.forEach(function(characteristic) {
    if (characteristic.UUID != '00000023-0000-1000-8000-0026BB765291') // Characteristic.Name.UUID, already present in all Services
      service.addCharacteristic(characteristic);
  });

  return service;
}

function parseCharacteristicJSON(json) {
  var characteristicUUID = json.cType;

  var characteristic = new Characteristic(json.manfDescription || characteristicUUID, characteristicUUID);

  // copy simple properties
  characteristic.value = json.initialValue;
  characteristic.setProps({
    format: json.format, // example: "int"
    minValue: json.designedMinValue,
    maxValue: json.designedMaxValue,
    minStep: json.designedMinStep,
    unit: json.unit,
    perms: json.perms // example: ["pw","pr","ev"]
  });

  // monkey-patch this characteristic to add the legacy method `updateValue` which used to exist,
  // and that accessory modules had access to via the `onRegister` function. This was the old mechanism
  // for communicating state changes about accessories that happened "outside" HomeKit.
  characteristic.updateValue = function(value, peer) {
    characteristic.setValue(value);
  };

  // monkey-patch legacy "locals" property which used to exist.
  characteristic.locals = json.locals;

  var updateFunc = json.onUpdate; // optional function(value)
  var readFunc = json.onRead; // optional function(callback(value))
  var registerFunc = json.onRegister; // optional function

  if (updateFunc) {
    characteristic.on('set', function(value, callback) {
      updateFunc(value);
      callback();
    });
  }

  if (readFunc) {
    characteristic.on('get', function(callback) {
      readFunc(function(value) {
        callback(null, value); // old onRead callbacks don't use Error as first param
      });
    });
  }

  if (registerFunc) {
    registerFunc(characteristic);
  }

  return characteristic;
}
