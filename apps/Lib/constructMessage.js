/************************************/

		   //Construct//

/************************************/

var config = require("../../config.js");
var publicMethods = require("./public.js");
var parseMessage = require ("./parseMessage.js");
var Seraph = require("./CoreData.js");
var debug = require("debug")("ConstructMessage");
debug.color = require("debug").colors[5];
module.exports = {
  

//////////////////////////////////////
		 //CONTENT START//
//////////////////////////////////////


constructMessage: function (isRequest,Qos,dup,MessageType,Topic,MessageID,MessageIDextended,payload,SSDevice){

	var msgType = 0;
	if(typeof(MessageType) != "number"){
		switch(MessageType){
			case "GET": msgType = 2; break;
			case "POST": msgType = 3; break;
			default: msgType = 2; break;

		}
	}	else	{
        msgType = MessageType;
	}
	let deviceID = "";
	let IPAddress = "";


	if(typeof(SSDevice) === "string"){
		deviceID = SSDevice;
		let device = Seraph.devices.getDevice(SSDevice);
		if(device){
			IPAddress = device.IPAddress;
		}

	}	else if(SSDevice)	{
        deviceID = "Device ID Pending";
        IPAddress = SSDevice.remoteAddress
	}

	publicMethods.eventTitle(["MESSAGE SENT: "+ deviceID + ", IP ADDRESS: "+ IPAddress],1,"Construct Message Status");
    publicMethods.eventTitle("ENCORDING...",2,"Construct Message Detail");



	var header = this.constructHeader(isRequest,Qos,dup,msgType,Topic,MessageID,MessageIDextended,payload);
	var message = publicMethods.StingtoBuffer(payload);

	var rawMessageBuffer = Buffer.concat([header, message]);
    // var messageBuffer = Buffer.concat([new Buffer('BBBBBB','hex'), rawMessageBuffer, new Buffer('0A0A0A','hex')]);
    // var messageBuffer = Buffer.concat([rawMessageBuffer, new Buffer('0A0A','hex')]);
	//Displaying Full Message
    publicMethods.eventTitle("FULL MESSAGE",2,"Construct Message Full");
	publicMethods.log(publicMethods.bufferString(rawMessageBuffer),"Construct Message Full");
	//parseMessage.parseMessage(messageBuffer,true);
    publicMethods.eventTitle("MESSAGE ENDS",2,"Construct Message");

    debug("【" + MessageID + "】 "+ Topic);
    if(payload){
        debug(payload)
    }

	return rawMessageBuffer;
},

constructHeader: function (isRequest,Qos,dup,MessageType,Topic,MessageID,MessageIDextended,payload){

	var variableHeader = this.constructVariableHeader(Topic,MessageID);
	var fixedHeader = this.constructFixedHeader(isRequest,Qos,dup,MessageType,variableHeader,payload);
	var HeaderBuffer = Buffer.concat([fixedHeader, variableHeader]);
    publicMethods.log("Header:				" + publicMethods.bufferString(HeaderBuffer) + "\n","Construct Message Detail");
	return HeaderBuffer;
},

constructVariableHeader: function (topic,mid){
	var versionNumber = this.constructVersionNumber(),
		topicBuffer = this.constructTopic(topic),
		messageID = this.constructMessageID(mid);

	if(topic == ""){
		var variableHeaderBuffer = Buffer.concat([versionNumber, messageID]);
	}	else	{
		var variableHeaderBuffer = Buffer.concat([versionNumber, topicBuffer, messageID]);
	}
	

    publicMethods.log("Variable Header:		" + publicMethods.bufferString(variableHeaderBuffer) + "\n","Construct Message Detail");
	return variableHeaderBuffer;

},


constructFixedHeader: function (isRequest,Qos,dup,MessageType,variableHeader,payload){
	var fixedHeaderStatus = this.constructFixedHeaderStatus(isRequest,Qos,dup,MessageType);
	var fixedHeaderLength = this.constructFixedHeaderRL(variableHeader,payload);
	var fixedHeaderBuffer = Buffer.concat([fixedHeaderStatus,fixedHeaderLength]);

    publicMethods.log("Fixed Header:		 	" + publicMethods.bufferString(fixedHeaderBuffer) + "\n","Construct Message Detail");

	return fixedHeaderBuffer;

},

constructFixedHeaderStatus: function (isRequest,Qos,dup,MessageType){
	var fh= new Array();
	var fhDec;
	if(isRequest){
		fh[0] = 0;
	}	else	{
		fh[0] = 1;
	}
	switch(Qos){
		case 0: fh[1] = 0; fh[2] = 0;break;
		case 1: fh[1] = 0; fh[2] = 1;break;
		case 2: fh[1] = 1; fh[2] = 0;break;
		default: fh[1] = 0; fh[2] = 0;break;
	}
	if(dup){
		fh[3] = 1;
	}	else	{
		fh[3] = 0;
	}

	fh = fh.concat(publicMethods.Dec2Hex(MessageType,4));
	fhDec = publicMethods.Hex2Dec(fh);

	var fixedHeaderStatusBuffer = publicMethods.int2Buffer(fhDec,1);

    publicMethods.log("Fixed Header Line 1: 		" + publicMethods.bufferString(fixedHeaderStatusBuffer) + "\n","Construct Message Detail");

	return fixedHeaderStatusBuffer;


},


constructFixedHeaderRL: function (variableHeader,payload){
	var variableHeaderLength = variableHeader.length,
		payloadLength = Buffer.byteLength(payload);

    publicMethods.log("Variable Header Length:		" + variableHeaderLength + " Bit","Construct Message Detail");
    publicMethods.log("Payload Length:			" + payloadLength + " Bit","Construct Message Detail");
	var remainingLength = variableHeaderLength + payloadLength;
    publicMethods.log("Remaining Length:		" + remainingLength + " Bit","Construct Message Detail");



	var Binarylength = 0;

	var remainingLengthBuffer;


	if(remainingLength < 128){

		remainingLengthBuffer = new Buffer(1);
		remainingLengthBuffer[0] = remainingLength;

	}	else if (remainingLength < 16384){

		remainingLengthBuffer = new Buffer(2);
		remainingLengthBuffer[1] = Math.floor(remainingLength / 128);
		remainingLengthBuffer[0] = remainingLength % 128;

		remainingLengthBuffer[0] += 128

	}	else if (remainingLength < 2097152){

		remainingLengthBuffer = new Buffer(3);
		remainingLengthBuffer[2] = Math.floor(remainingLength / 16384);
		remainingLengthBuffer[1] = Math.floor((remainingLength % 16384) / 128);
		remainingLengthBuffer[0] = (remainingLength % 16384) % 128;

        remainingLengthBuffer[0] += 128
        remainingLengthBuffer[1] += 128

	}	else if (remainingLength < 268435456){
		Binarylength = 4;

	}

    publicMethods.log("Remaining Length Hex:		" + publicMethods.bufferString(remainingLengthBuffer) + "\n","Construct Message Detail");

	return remainingLengthBuffer;


},

constructVersionNumber: function (){
	var versionNumber = config.versionNumber;
	var versionBuffer = publicMethods.int2Buffer(versionNumber,1);
    publicMethods.log("Version Number: 		" + publicMethods.bufferString(versionBuffer) + "\n","Construct Message Detail");
	return versionBuffer;
},


//Construct Topic Object
constructTopic: function (topic){

	//Topic Name
	var topicNameBuffer = publicMethods.StingtoBuffer(topic);
    publicMethods.log("Topic:				" + topic,"Construct Message Detail");
	publicMethods.log("Topic:				" + publicMethods.bufferString(topicNameBuffer),"Construct Message Detail");


	//Topic Length
	var TopicLengthBuffer = publicMethods.TopicLength(topic);
    publicMethods.log("Topic Length:			" + publicMethods.bufferString(TopicLengthBuffer),"Construct Message Detail");


	var topicBuffer = Buffer.concat([TopicLengthBuffer, topicNameBuffer]);


    publicMethods.log("Topic Object: 			" + publicMethods.bufferString(topicBuffer) + "\n","Construct Message Detail");
	return topicBuffer;
	
},

constructMessageID: function (MessageID){
	var MessageIDBuffer = publicMethods.int2Buffer(MessageID,2);
    publicMethods.log("MessageID: 			" + "No." + MessageID,"Construct Message Detail");
    publicMethods.log("MessageID Bufffer: 		" + publicMethods.bufferString(MessageIDBuffer) + "\n","Construct Message Detail");
	return MessageIDBuffer;
}

};
