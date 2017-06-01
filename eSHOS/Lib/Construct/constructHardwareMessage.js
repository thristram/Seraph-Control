/************************************/

		   //Construct//

/************************************/

var config = require("../../../config.js");
var public = require(".././public.js");
//var parseHardwareMessage = require ("../parse/parseHardwareMessage.js")




module.exports = {


//////////////////////////////////////
    	//CONTENT START//
//////////////////////////////////////


    constructMessage: function (data) {

        var messageParts = {};
        var effectiveMessage;

        if (data.isRequest) {
            messageParts.messageID = public.generateSIDPMessageID();
        } else {
            messageParts.messageID = new Buffer(data.messageID);
        }
		messageParts.payload = data.payload;

        if (data.protocolType == "SICP") {
            messageParts.frameHeader = new Buffer([0xEE, 0xEE]);
            messageParts.meshID = data.meshID;
            messageParts.messageLength = public.int2Buffer(4 + data.payload.length,1);



            effectiveMessage = Buffer.concat([messageParts.messageID, messageParts.meshID, messageParts.messageLength, data.payload], 4 + data.payload.length);

        } else if (data.protocolType == "SIDP") {
            messageParts.frameHeader = new Buffer([0x7E]);
            messageParts.messageLength = public.int2Buffer(2 + data.payload.length,1);


            effectiveMessage = Buffer.concat([messageParts.messageID, messageParts.messageLength, messageParts.payload], 2 + data.payload.length);


        }

		messageParts.checksum = public.int2Buffer(public.checksum(effectiveMessage),1);

        var messageBuffer = Buffer.concat([messageParts.frameHeader, effectiveMessage, messageParts.checksum],messageParts.frameHeader.length + effectiveMessage.length + 1);

		public.eventLog(public.bufferString(messageBuffer), data.protocolType + " Construct");

        return messageBuffer;


    },
	constructChannel: function(moduleID,channels){
    	channel = [];
    	for (channelChar in channels){
    		channel.push(parseInt(channels[channelChar]));
		}
		//console.log(channel);
    	var channelHex = public.int2Buffer(public.Hex2Dec(channel),1).toString('hex').charAt(1);
        var moduleIDHex = public.int2Buffer(moduleID,1).toString('hex').charAt(1);
    	var channelOutput = new Buffer(moduleIDHex + channelHex, "hex")
        return channelOutput;
	},
	constructGesture: function(gesture){
		gestureList = {
			0: "0000",
			1: "1100",
			2: "1101",
			3: "1110",
			4: "1111"
		};

		for(var i = 0; i < (4 - gesture.length); i++){
            gesture += "0";
		}

		var gestureString = "";
		for (gestureChar in gesture){
			gestureString += gestureList[gesture[gestureChar]];
		}
		var gesutreBuffer = public.Bin2Hex(gestureString);
		return gesutreBuffer;
	},


};

/*
var requireData = {
	protocolType: "SICP",
	isRequest	: true,
	messageID	: 0,
	meshID		: new Buffer([0x82, 0x0D]),
	payload		: new Buffer([0x03, 0x03, 0x09])
}
module.exports.constructMessage(requireData);

*/