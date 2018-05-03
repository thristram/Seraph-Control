'use_strict'

var publicMethod = require("./public.js");
var constructMessage = require ("./Construct/constructHardwareMessage.js");
var TCPClient = require ("./TCPClient.js");
var AES = require("./AES.js");
var debug = require('debug')('SIAP');
debug.color = require("debug").colors[2];
var fs = require("fs");
var Seraph = require("./CoreData.js");


module.exports = {
	siapSendUpdateInfo: function(SSDeviceID, version){

		fs.readFile(Seraph.seraphUpdate.getFirmwareFilePath("SS", version),  function(err, data){
			let requireData = {
				protocolType: "SIAP",
				topicType   : "/hardwareIAPUpdate",
				commandSEQ  : "02",
				isRequest	: true,
				messageID	: publicMethod.generateSIDPMessageID(),
			};
			//Assembly
			let payload = requireData.commandSEQ + publicMethod.int2Buffer(version, 2).toString('hex') + publicMethod.int2Buffer(data.length, 4).toString('hex') + AES.md5(data);

			requireData.payload = new Buffer(payload, "hex");
			let message = constructMessage.constructMessage(requireData);
			debug("Sending SIAP Device Update Info: " + payload.toUpperCase());
			let SSDevice = Seraph.devices.getDevice(SSDeviceID);
			if (SSDevice){
				SSDevice.deviceStatus.updatePeriod = 3;
			}
			TCPClient.TCPSocketWrite(SSDeviceID, message, requireData.topicType, requireData);
		});
	},
	siapSendUpdatePacket: function(SSDeviceID, version){
		fs.readFile(Seraph.seraphUpdate.getFirmwareFilePath("SS", version),  function(err, data){
			debug("Sending SIAP Device Update Packet v." + version);
			debug(data);
			TCPClient.TCPWrite(SSDeviceID, data);

		});
	},
	siapDeviceInfo: function(){

		let requireData = {
			protocolType: "SIAP",
			topicType   : "/hardwareIAPUpdate",
			commandSEQ  : "01",
			isRequest	: true,
			messageID	: publicMethod.generateSIDPMessageID(),
		};
		//Assembly
		let payload = requireData.commandSEQ + publicMethod.int2Buffer(1, 2).toString('hex') + publicMethod.int2Buffer(1, 2).toString('hex') + publicMethod.int2Buffer(1, 2).toString('hex');

		requireData.payload = new Buffer(payload, "hex");
		let message = constructMessage.constructMessage(requireData);
		console.log(message)
	},
};

// module.exports.siapSendUpdateInfo("SS88888888",1);
// module.exports.siapDeviceInfo();