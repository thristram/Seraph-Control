/************************************/

			//Parse Reply//

/************************************/

var publicMethods = require("../public.js");


//////////////////////////////////////
		//TEST VARIABLE//
//////////////////////////////////////

//const buf = new Buffer([0x7E, 0x8E, 0x05 ,0x03, 0x03, 0x09, 0x82]);
const buf = new Buffer([0xEE, 0xEE, 0x8E, 0x82, 0x0D, 0x08, 0x05 ,0x03, 0x03, 0x09, 0x05]);

//////////////////////////////////////
		//INIT VARIABLE//
//////////////////////////////////////

var errorFlag = false;
var messageLength = 0;
var procotolType = 2;
var SICPframeHeader = new Buffer([0xEE, 0xEE]);
var SIDPframeHeader = new Buffer([0x7E]);

var position = {
    headerLength: [1,2],
    messageLength: [2, 5],
    payloadLength: [3, 7]
};
var protocolName = ["SIDP","SICP"];


//////////////////////////////////////
//INIT VARIABLE//
//////////////////////////////////////

var commands = {

    //Receive From Node

	0xAA : "Receipt",
	0x06 : "Status",
	0x08 : "Action Notify",
	0x0A : "Malfunction",

	0xB1 : "Device Info - SC",
    0xB2 : "Device Info - SLC",
    0xB3 : "Device Info - SPC",
    0xB4 : "Device Info - ST",

    0x2A : "Data - Energy",
    0x29 : "Data - Gesture",
    0x35 : "Data - Touch Pad",

	//Send From Gateway

    0x03 : "CMD",
    0x04 : "Config",
    0x05 : "Alarm",
    0x07 : "OTA",
    0x09 : "LED",
    0xC0 : "BLE Module Control",

    0x51 : "Action - Dimmer (Linear)",
    0x52 : "Action - Dimmer (Erase In)",
    0x53 : "Action - Dimmer (Erase Out)",
    0x54 : "Action - Dimmer (Swing)",
    0x55 : "Action - Plug Switch",
    0x56 : "Action - Control Pad",
    0x57 : "Action - Dimmer (Multiple)",
}



module.exports = {


//////////////////////////////////////
    	//CONTENT START//
//////////////////////////////////////

    checkFrame: function (messageBuffer){
        if (publicMethods.bufferString(messageBuffer.slice(0,2)) == publicMethods.bufferString(SICPframeHeader)){
            procotolType = 1;
            publicMethods.eventLog("Protocol Type: 			" + protocolName[procotolType] ,protocolName[procotolType] + " ParseCheck");
        	publicMethods.eventLog("Frame Header Check:		Passed",protocolName[procotolType] + " ParseCheck");
        }	else if (publicMethods.bufferString(messageBuffer.slice(0,1)) == publicMethods.bufferString(SIDPframeHeader)){
            procotolType = 0;
            publicMethods.eventLog("Protocol Type: " + protocolName[procotolType] ,protocolName[procotolType] + " ParseCheck");
            publicMethods.eventLog("Frame Header Check: 	Passed",protocolName[procotolType] + " ParseCheck");
        }	else	{
            procotolType = 2;
            publicMethods.eventError("Protocol Error: Unrecognized Frame Header",protocolName[procotolType] + " ParseCheck");
            errorFlag = true;
        }
        return procotolType;
    },
    checkMessageLength: function(messageBuffer){
        var writtenLength = messageBuffer[position.messageLength[procotolType]];
        var actualLength = messageLength - position.headerLength[procotolType] - 1;
        if(writtenLength == actualLength){
            publicMethods.eventLog("Message Length: 			" + writtenLength,protocolName[procotolType] + " ParseCheck");
            publicMethods.eventLog("Message Length Check: 	Passed",protocolName[procotolType] + " ParseCheck");
            return writtenLength;
        }	else	{
            publicMethods.eventError("Protocol Error: Message Length Not Match",protocolName[procotolType] + " ParseCheck");
            errorFlag = true;
            return false;
        }
    },
    checksumMessage: function(messageBuffer){

        var effectiveBuffer = messageBuffer.slice(position.headerLength[procotolType],messageLength - 1);
        var impliedChecksum = publicMethods.checksum(effectiveBuffer);
        publicMethods.eventLog("Implied Checksum8 XOR: 	" + impliedChecksum.toString(16),protocolName[procotolType] + " ParseCheck");
        if(impliedChecksum == messageBuffer[messageLength-1]){
            publicMethods.eventLog("Checksum: 				Passed",protocolName[procotolType] + " ParseCheck");
            return true;
        }	else	{
            publicMethods.eventError("Protocol Error: Checksum Failed",protocolName[procotolType] + " ParseCheck");
            errorFlag = true;
            return false;
        }
    },

	checkCommand: function (payload){
    	if(commands['' + payload[0]] != "undefined"){
            publicMethods.eventLog("Command: 					" + commands['' + payload[0]],protocolName[procotolType] + " ParseCheck");
    		return payload[0];
		}	else	{
            publicMethods.eventError("Protocol Error: So Such Command",protocolName[procotolType] + " ParseCheck");
		}

	},


    parseMessage: function (messageBuffer) {
        publicMethods.eventTitle("Data Received",1,1,false);

        var messageContent = {};

        var payloadBuffer;
        publicMethods.eventLog("Data Received: " + publicMethods.bufferString(messageBuffer),"RAW Data");
        publicMethods.eventTitle("Checking Protocol Syntax",2);


        errorFlag = false;


        messageContent.protocol = protocolName[this.checkFrame(messageBuffer)];


        messageLength = messageBuffer.length;
        var data = {
            messageID: messageBuffer[1],
            messageLength: this.checkMessageLength(messageBuffer),
            command: this.checksumMessage(messageBuffer)
        }

        if(errorFlag){

            publicMethods.eventTitle("Protocol Error",1,1,true)
        }	else	{
            payloadBuffer = messageBuffer.slice(position.payloadLength[procotolType] - 1,messageLength - 1);
            publicMethods.eventTitle("Parsing " + protocolName[procotolType],1,1,false);
			publicMethods.eventLog(publicMethods.bufferString(payloadBuffer),protocolName[procotolType] + " Parsing");
            Object.assign(messageContent, this.parsePayload(payloadBuffer));

        }

        return messageContent;

    },

	parsePayload: function(payload){
        var messageContent = {
            command     :   "",
            type        :   commands['' + payload[0]],
            rawPayload     :   publicMethods.bufferString(payload)
        };
        var payloadContent;
		var parsedCommand = this.checkCommand(payload);
        messageContent.command = "0x" + parseInt(parsedCommand).toString(16).toUpperCase();



		switch (parseInt(parsedCommand)){
			case 170	: payloadContent = this.parseSIDPReceipt(payload);break;
			case 6		: payloadContent = this.parseSIDPStatus(payload);break;
			case 8		: payloadContent = this.parseSIDPActionNotify(payload);break;
			case 10		: payloadContent = this.parseSIDPMalfunction(payload);break;
			case 177	: payloadContent = this.parseSIDPDeviceInfo(payload,"SC");break;
            case 178	: payloadContent = this.parseSIDPDeviceInfo(payload,"SLC");break;
            case 179	: payloadContent = this.parseSIDPDeviceInfo(payload,"SPC");break;
            case 180	: payloadContent = this.parseSIDPDeviceInfo(payload,"ST");break;
            case 42		: payloadContent = this.parseSIDPData(payload,"2A");break;
            case 41		: payloadContent = this.parseSIDPData(payload,"29");break;
            case 53		: payloadContent = this.parseSIDPData(payload,"35");break;
		}

		messageContent = publicMethods.mergeObject(messageContent,payloadContent);
		return messageContent;
	},

    parseSIDPReceipt: function(payload){
	    data = {

        }
        return data;

	},
    parseSIDPStatus: function(payload){
        data = {
            moduleID: payload[1],
            Channel_1: payload[2],
            Channel_2: payload[3],
            Channel_3: payload[4],
            Channel_4: payload[5],
        }
        return data;

    },
    parseSIDPActionNotify: function(payload){
        data = {

        }
        return data;
    },
    parseSIDPMalfunction: function(payload){
        data = {

        }
        return data;
    },
    parseSIDPDeviceInfo: function(payload,type){
        data = {

        }
        return data;
    },
    parseSIDPData: function(payload,type){
        var data = {};
        switch(type){
            case "2A":
                break;
            case "29":
                break;
            case "35":
                data.TouchPad = payload[1];
                data.Value = payload[2];
                break;
        }

        return data;
    },


};

//module.exports.parseMessage(buf);
