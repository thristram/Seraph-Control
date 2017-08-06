'use strict';

var fs = require('fs');
var path = require('path');
var Accessory = require('./Accessory').Accessory;
var Service = require('./Service').Service;
var Characteristic = require('./Characteristic').Characteristic;
var uuid = require('./util/uuid');
var debug = require('debug')('AccessoryLoader');
var requireUncached = require('require-uncached');
var SQLAction = require("../../Lib/SQLAction.js");
var preloadData = require("../../Lib/preloadData.js");
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

    var channelData = preloadData.channelData;
    var sensorData = preloadData.sensorData;
    var deviceREF = preloadData.deviceREF;

    //console.log(channelData)
    //console.log(sensorData)

    for (var SEPKey in channelData){

        var defaultName = channelData[SEPKey].type + " " + deviceREF[channelData[SEPKey].deviceID].moduleID + "-" + channelData[SEPKey].channel;
        var deviceID = channelData[SEPKey].deviceID;
        var managedSS = deviceREF[channelData[SEPKey].deviceID].managedSS;
        var managedSC = "SC" + deviceREF[channelData[SEPKey].deviceID].managedSC;
        var moduleID = deviceREF[channelData[SEPKey].deviceID].moduleID;
        var channel = channelData[SEPKey].channel;
        var deviceValue = {
            "TOPOS"         :   channelData[SEPKey].value,
            "lastupdate"    :   channelData[SEPKey].lastupdate
        }

        switch (channelData[SEPKey].type) {
            case "SP":
                accessories.push(loadSPC(dir,deviceID, managedSS, managedSC, moduleID, channel, defaultName, deviceValue));
                break;
            case "SL":
                accessories.push(loadSLC(dir,deviceID, managedSS, managedSC, moduleID, channel, defaultName, deviceValue));
                break;
            default:
                break;
        }

    }

    var sensorInSSDevice = {}

    for (var sensorKey in sensorData){


        var deviceID = sensorData[sensorKey].deviceID;

        var deviceValue = {};

        if(!sensorInSSDevice[deviceID]){
            sensorInSSDevice[deviceID] = {};
        }
        sensorInSSDevice[deviceID][sensorData[sensorKey].code] = deviceValue;
        deviceValue[sensorData[sensorKey].code] = sensorData[sensorKey].value;

        switch(sensorData[sensorKey].code){
            case "TP":
                accessories.push(loadSensor(dir, deviceID, "Temperature Sensor", "TP", "TemperatureSensor", deviceValue));
                break;
            case "HM":
                accessories.push(loadSensor(dir, deviceID, "Humidity Sensor", "HM", "HumiditySensor", deviceValue));
                break;
            case "CD":
                accessories.push(loadSensor(dir, deviceID, "CO2 Sensor", "CD", "CO2Sensor", deviceValue));
                break;
            case "PR":
                accessories.push(loadSensor(dir, deviceID, "Motion Sensor", "PR", "MotionSensor", deviceValue));
                break;
            case "CO":
                accessories.push(loadSensor(dir, deviceID, "CO Sensor", "CO", "COSensor", deviceValue));
                break;
            case "SM":
                accessories.push(loadSensor(dir, deviceID, "Smoke Sensor", "SM", "SmokeSensor", deviceValue));
                break;
            default:
                break;
        }
    }

    for(var AQkey in sensorInSSDevice){
        deviceValue = {
            "CO"    : sensorInSSDevice[AQkey]["CO"].value,
            "CD"    : sensorInSSDevice[AQkey]["CD"].value,
            "VO"    : sensorInSSDevice[AQkey]["VO"].value,
            "PT"    : sensorInSSDevice[AQkey]["PT"].value,
        }
        accessories.push(loadSensor(dir, deviceID, "Air Quality Sensor", "AQ", "AirQualitySensor", deviceValue));
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
    loadedAccessory.setDeviceValue(deviceValue, true);
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
