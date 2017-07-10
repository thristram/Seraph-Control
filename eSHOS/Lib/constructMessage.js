/************************************/

		   //Construct//

/************************************/

var config = require("../../config.js");
var public = require("./public.js");
var parseMessage = require ("./parseMessage.js")

module.exports = {
  

//////////////////////////////////////
		 //CONTENT START//
//////////////////////////////////////


constructMessage: function (isRequest,Qos,dup,MessageType,Topic,MessageID,MessageIDextended,payload,SSDevice){

	public.eventTitle(["MESSAGE SENT: "+SSDevice.deviceID,"IP ADDRESS: "+SSDevice.IPAddress],1,"Construct Message Status");
    public.eventTitle("ENCORDING...",2,"Construct Message Detail");



	var header = this.constructHeader(isRequest,Qos,dup,MessageType,Topic,MessageID,MessageIDextended,payload);
	var message = public.StingtoBuffer(payload);

	var rawMessageBuffer = Buffer.concat([header, message]);
    var messageBuffer = Buffer.concat([rawMessageBuffer, new Buffer('0A0A','hex')]);

	//Displaying Full Message
    public.eventTitle("FULL MESSAGE",2,"Construct Message Full");
	public.log(public.bufferString(messageBuffer),"Construct Message Full");
	//parseMessage.parseMessage(messageBuffer,true);
    public.eventTitle("MESSAGE ENDS",2,"Construct Message");

	return messageBuffer;
},

constructHeader: function (isRequest,Qos,dup,MessageType,Topic,MessageID,MessageIDextended,payload){

	var variableHeader = this.constructVariableHeader(Topic,MessageID);
	var fixedHeader = this.constructFixedHeader(isRequest,Qos,dup,MessageType,variableHeader,payload);
	var HeaderBuffer = Buffer.concat([fixedHeader, variableHeader]);
    public.log("Header:					" + public.bufferString(HeaderBuffer) + "\n","Construct Message Detail");
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
	

    public.log("Variable Header:		" + public.bufferString(variableHeaderBuffer) + "\n","Construct Message Detail");
	return variableHeaderBuffer;

},


constructFixedHeader: function (isRequest,Qos,dup,MessageType,variableHeader,payload){
	var fixedHeaderStatus = this.constructFixedHeaderStatus(isRequest,Qos,dup,MessageType);
	var fixedHeaderLength = this.constructFixedHeaderRL(variableHeader,payload);
	var fixedHeaderBuffer = Buffer.concat([fixedHeaderStatus,fixedHeaderLength]);

    public.log("Fixed Header:		 	" + public.bufferString(fixedHeaderBuffer) + "\n","Construct Message Detail");

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

	fh = fh.concat(public.Dec2Hex(MessageType,4));
	fhDec = public.Hex2Dec(fh);

	var fixedHeaderStatusBuffer = public.int2Buffer(fhDec,1);

    public.log("Fixed Header Line 1: 	" + public.bufferString(fixedHeaderStatusBuffer) + "\n","Construct Message Detail");

	return fixedHeaderStatusBuffer;


},


constructFixedHeaderRL: function (variableHeader,payload){
	var variableHeaderLength = variableHeader.length,
		payloadLength = Buffer.byteLength(payload);

    public.log("Variable Header Length:	" + variableHeaderLength + " Bit","Construct Message Detail");
    public.log("Payload Length:			" + payloadLength + " Bit","Construct Message Detail");
	var remainingLength = variableHeaderLength + payloadLength;
    public.log("Remaining Length:		" + remainingLength + " Bit","Construct Message Detail");



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

    public.log("Remaining Length Hex:	" + public.bufferString(remainingLengthBuffer) + "\n","Construct Message Detail");

	return remainingLengthBuffer;


},

constructVersionNumber: function (){
	var versionNumber = config.versionNumber;
	var versionBuffer = public.int2Buffer(versionNumber,1);
    public.log("Version Number: 		" + public.bufferString(versionBuffer) + "\n","Construct Message Detail");
	return versionBuffer;
},


//Construct Topic Object
constructTopic: function (topic){

	//Topic Name
	var topicNameBuffer = public.StingtoBuffer(topic);
	public.log("Topic:					" + public.bufferString(topicNameBuffer),"Construct Message Detail");


	//Topic Length
	var TopicLengthBuffer = public.TopicLength(topic);
    public.log("Topic Length:			" + public.bufferString(TopicLengthBuffer),"Construct Message Detail");


	var topicBuffer = Buffer.concat([TopicLengthBuffer, topicNameBuffer]);


    public.log("Topic Object: 			" + public.bufferString(topicBuffer) + "\n","Construct Message Detail");
	return topicBuffer;
	
},

constructMessageID: function (MessageID){
	var MessageIDBuffer = public.int2Buffer(MessageID,2);
    public.log("MessageID: 				" + "No." +MessageID,"Construct Message Detail");
    public.log("MessageID Bufffer: 		" + public.bufferString(MessageIDBuffer) + "\n","Construct Message Detail");
	return MessageIDBuffer;
}

};
