// Hello
var fs = require('fs');
var path = require('path');
//var storage = require('node-persist');
var uuid = require('./').uuid;
var Bridge = require('./').Bridge;
var Accessory = require('./').Accessory;
var Service = require('./').Service;
var Characteristic = require('./').Characteristic;
var accessoryLoader = require('./lib/AccessoryLoader');
var config = require("../../config.js");
var Seraph = require("../Lib/CoreData.js");
var debug = require("debug")("SeraphCore");

debug("Seraph Hub HomeKit Server Starting...");

// Initialize our storage system
//storage.initSync();

// Start by creating our Bridge which will host all loaded Accessories
var bridge = new Bridge('Seraph Hub', uuid.generate("Seraph Hub"));
bridge
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Seraph Technologies, Inc.")
	.setCharacteristic(Characteristic.FirmwareRevision, Seraph.geteSHInfo().firmware + "." + Seraph.geteSHInfo().build)
    .setCharacteristic(Characteristic.HardwareRevision, "v1.0")
    .setCharacteristic(Characteristic.Model, "Seraph Hub Rev. 1")
    .setCharacteristic(Characteristic.SerialNumber, config.homeKitUsername.split(":").join(""));


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


// Publish the Bridge on the local network.
bridge.publish({
    username: config.homeKitUsername,
    port: 51826,
    pincode: "031-45-154",
    category: Accessory.Categories.BRIDGE
});
