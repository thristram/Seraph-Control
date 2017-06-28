'use strict';

var fs = require('fs');
var path = require('path');
var Accessory = require('./Accessory').Accessory;
var Service = require('./Service').Service;
var Characteristic = require('./Characteristic').Characteristic;
var uuid = require('./util/uuid');
var debug = require('debug')('AccessoryLoader');
var requireUncached = require('require-uncached');

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

function loadDirectory(dir) {

  // exported accessory objects loaded from this dir
  var accessories = [];
  /*
  fs.readdirSync(dir).forEach(function(file) {

    // "Accessories" are modules that export a single accessory.
    if (file.split('_').pop() === 'accessory.js') {
      debug('Parsing accessory: %s', file);
      var loadedAccessory = require(path.join(dir, file)).accessory;
      accessories.push(loadedAccessory);
    }
    // "Accessory Factories" are modules that export an array of accessories.
    else if (file.split('_').pop() === 'accfactory.js') {
      debug('Parsing accessory factory: %s', file);

      // should return an array of objects { accessory: accessory-json }
      var loadedAccessories = require(path.join(dir, file));
      accessories = accessories.concat(loadedAccessories);
    }




  });
   */
    var SCID = "SC55AB56";

    accessories.push(loadSPC(dir, SCID, "1", "1", "SP 1-1", "1A:2B:3C:4D:5D:11", "A1S2NASF88EW11"));

    accessories.push(loadSPC(dir, SCID, "1", "2", "SP 1-2", "1A:2B:3C:4D:5D:12", "A1S2NASF88EW12"));
    accessories.push(loadSPC(dir, SCID, "2", "1", "SP 2-1", "1A:2B:3C:4D:5D:21", "A1S2NASF88EW21"));
    accessories.push(loadSPC(dir, SCID, "2", "2", "SP 2-2", "1A:2B:3C:4D:5D:22", "A1S2NASF88EW22"));
    accessories.push(loadSLC(dir, SCID, "3", "1", "SL 3-1", "1A:2B:3C:4D:5D:31", "A1S2NASF88EW31"));
    accessories.push(loadSLC(dir, SCID, "3", "2", "SL 3-2", "1A:2B:3C:4D:5D:32", "A1S2NASF88EW32"));

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

function loadSPC(dir, deviceID, moduleID, channelID, name, udid, serialNumber){
    var file = "Outlet_accessory.js"
    debug('Parsing accessory: %s', file);
    var loadedAccessory = requireUncached(path.join(dir, file));
    loadedAccessory.setSeraphConfig("deviceID", deviceID);
    loadedAccessory.setSeraphConfig("channelID", channelID);
    loadedAccessory.setSeraphConfig("moduleID", moduleID);
    loadedAccessory.setSeraphConfig("name", name);
    loadedAccessory.setSeraphConfig("udid", udid);
    loadedAccessory.setSeraphConfig("serialNumber", serialNumber);
    loadedAccessory.startSPCService();
    return loadedAccessory.accessory;
}
function loadSLC(dir, deviceID, moduleID, channelID, name, udid, serialNumber){
    var file = "Light_accessory.js"
    debug('Parsing accessory: %s', file);
    var loadedAccessory = requireUncached(path.join(dir, file));
    loadedAccessory.setSeraphConfig("deviceID", deviceID);
    loadedAccessory.setSeraphConfig("channelID", channelID);
    loadedAccessory.setSeraphConfig("moduleID", moduleID);
    loadedAccessory.setSeraphConfig("name", name);
    loadedAccessory.setSeraphConfig("udid", udid);
    loadedAccessory.setSeraphConfig("serialNumber", serialNumber);
    loadedAccessory.startSPCService();
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
