var fs = require('fs');
var path = require('path');
var storage = require('node-persist');
var uuid = require('./').uuid;
var Bridge = require('./').Bridge;
var Accessory = require('./').Accessory;
var accessoryLoader = require('./lib/AccessoryLoader');
var Characteristic = require('./').Characteristic;

console.log("Seraph Hub HomeKit Server Starting...");

// Initialize our storage system
storage.initSync();

// Start by creating our Bridge which will host all loaded Accessories
var bridge = new Bridge('Seraph Hub', uuid.generate("Seraph Hub"));

// Listen for bridge identification event
bridge.on('identify', function(paired, callback) {
  console.log("Seraph Hub HAP Bridge identify");
  callback(); // success
});

// Load up all accessories in the /accessories folder
var dir = path.join(__dirname, "accessories");
var accessories = accessoryLoader.loadDirectory(dir);

// Add them all to the bridge
accessories.forEach(function(accessory) {
  bridge.addBridgedAccessory(accessory);
});
//bridge.setCharacteristic(Characteristic.manufacturer,"Seraph Technology, LLC")
// Publish the Bridge on the local network.
bridge.publish({
  username: "CC:22:3D:E3:CE:F6",
  port: 51826,
  pincode: "031-45-154",
  category: Accessory.Categories.BRIDGE,
    Manufacturer: "Seraph Technology, LLC"
});