/************************************/

		   //Parse Reply//

/************************************/

var public = require("./public.js");

module.exports = {
  

//////////////////////////////////////
		 //CONTENT START//
//////////////////////////////////////


parseMessage: function (messageBuffer,ifSend){

	var endToken = public.bufferString(messageBuffer.slice(messageBuffer.length - 2,messageBuffer.length));
	if(endToken == "0A 0A "){
        messageBuffer = messageBuffer.slice(0,messageBuffer.length-2);
	}

	var data = {
		protocol			: "SSP-B",
		RLLength			: 0,
		versionNo 			: 1,
		ifConnect 			: false,
		ifTopic 			: true,
		TopicLength 		: 0,
		topic				: "",
		messageID 			: 0,
		messageIDextended 	: 0,
		payload 			: ""
	}
	var startPos = {
		topic 				: 0,
		messageID 			: 0,
		messageIDextended 	: 0,
		payload 			: 0,
	}
	if (ifSend){
        public.eventTitle("MESSAGE CONTENT",3,"Parse Message Full");




	}	else	{

        public.eventTitle("MESSAGE RECEIVE",1,"Parse Message Status");


		public.log(public.bufferString(messageBuffer)+ "\n","Parse Message Full");


    }

	var headerStatus = this.parseFixedHeaderStatus(messageBuffer[0]);
    public.dataLog(headerStatus,"Parse Message Detail");

	var headerRL = this.parseFixedHeaderRL(messageBuffer);

    public.dataLog(headerRL,"Parse Message Detail");
	var topic;

	data.RLLength = headerRL.message;

	startPos.topic = headerRL.byte + 2;


	//Check Topic
	if (headerStatus.isRequest && (headerStatus.typeInt == 1)){

		data.ifConnect = true;

	}
	
	if(data.ifConnect || (!headerStatus.isRequest)){

        public.eventTitle("PROCEED WITHOUT TOPIC",3,"Parse Message Detail");

		data.ifTopic = false;

		startPos.messageID = startPos.topic;

	}	else	{
        public.eventTitle("PROCEED WITH TOPIC",3,"Parse Message Detail");

		data.ifTopic = true;

		topic = this.parseTopic(messageBuffer, startPos.topic);

		data.TopicLength = topic.length;

		data.topic = topic.name;

		startPos.messageID = startPos.topic + 2 + topic.length;

	}

	//Check Message ID
	data.messageID = this.parseMessageID(messageBuffer, startPos.messageID);
	startPos.messageIDextended = startPos.messageID + 2;


	//Check Extended Message ID
	if(!headerStatus.ifRequest && headerStatus.typeInt == 6 && headerStatus.typeInt == 1){

		data.messageIDextended = this.parseMessageID(messageBuffer, startPos.messageIDextended);

		startPos.payload = startPos.messageIDextended + 2;

	}	else	{

		startPos.payload = startPos.messageIDextended;

	}


	//Check Payload
	if(messageBuffer[startPos.payload]){

		data.payload = this.parsePayload(messageBuffer, startPos.payload);

        public.dataLog(data,"Parse Message Detail");

		//public.log(data,"Parse Message Detail");

        public.eventTitle("PAYLOAD",2,"Parse Message Detail");

        try{
            public.dataLog(JSON.parse(data.payload),"Parse Message Detail");
        }	catch(err) {
        	public.eventError("Parse Message Error")
		}


	}	else	{

        public.dataLog(data,"Parse Message Detail");

	}
    public.eventTitle("START POSITION",2,"Parse Message Detail");
	public.dataLog(startPos,"Parse Message Detail");
    if (!ifSend) {
        public.eventTitle("MESSAGE ENDS",2,"Parse Message Full");
    }

	return data;

},

parseFixedHeaderStatus: function (fixedHeader){

	var header = public.Dec2Hex(fixedHeader, 8);
	var headerStatus = {
		isRequest		: false,
		ifQoS			: 0,
		ifDup 			: false,
		typeInt			: public.Hex2Dec([header[4],header[5],header[6],header[7]]),
		type 			: "",
		typeDesp 		: "",

	}





    public.eventTitle("FIXED HEADER",2,"Parse Message Detail");

    public.log("Raw Header: 			" + fixedHeader.toString(16),"Parse Message Detail");


	var header = public.Dec2Hex(fixedHeader,8);
    public.log("Parsed Hex: 			" + header,"Parse Message Detail");


    public.eventTitle("PARSED",2,"Parse Message Detail");



	if (header[0] == 0){
		headerStatus.isRequest = true;
        public.log("Message Source: 		Request","Parse Message Detail");
	}	else	{
        public.log("Message Source: 		Reply","Parse Message Detail");
	}

	headerStatus.ifQoS = public.Hex2Dec([header[1],header[2]]);
    public.log("QoS Level is: 			" + headerStatus.ifQoS,"Parse Message Detail");

	if (header[3] == 1){
		headerStatus.ifDup = true;
        public.log("if DUP: 				YES","Parse Message Detail");
	}	else	{
        public.log("if DUP: 				NO","Parse Message Detail");
	}


	
	if(headerStatus.isRequest == true){
		switch (headerStatus.typeInt){
			case 1: headerStatus.type = "CONNECT";break;
			case 2: headerStatus.type = "GET";break;
			case 3: headerStatus.type = "POST";break;
			case 4: headerStatus.type = "PUT";break;
			case 5: headerStatus.type = "DELETE";break;
			case 6: headerStatus.type = "OTA";break;
			default: headerStatus.type = "NOT SUPPORTED METHOD";break;
		}
	}	else	{
		switch (headerStatus.typeInt){
			case 1: headerStatus.type = "100";headerStatus.typeDesp="Continue";break;
			case 2: headerStatus.type = "101";headerStatus.typeDesp="Switching Protocols";break;
			case 3: headerStatus.type = "200";headerStatus.typeDesp="OK";break;
			case 4: headerStatus.type = "201";headerStatus.typeDesp="Created";break;
			case 5: headerStatus.type = "202";headerStatus.typeDesp="Accepted";break;
			case 6: headerStatus.type = "206";headerStatus.typeDesp="Partial Content";break;
			case 7: headerStatus.type = "400";headerStatus.typeDesp="Bad Request";break;
			case 8: headerStatus.type = "401";headerStatus.typeDesp="Unauthorized";break;
			case 9: headerStatus.type = "403";headerStatus.typeDesp="Forbidden";break;
			case 10: headerStatus.type = "404";headerStatus.typeDesp="Not Found";break;
			case 11: headerStatus.type = "408";headerStatus.typeDesp="Request Time-out";break;
			case 12: headerStatus.type = "500";headerStatus.typeDesp="Internal Server Error";break;
			case 13: headerStatus.type = "503";headerStatus.typeDesp="Service Unavailable";break;
			case 14: headerStatus.type = "505";headerStatus.typeDesp="Version Not Supported";break;

			default: headerStatus.type = "NOT SUPPORTED METHOD";break;
		}

	}
	public.log("Message Type: 			" + headerStatus.typeInt + " - " + headerStatus.type + ": " + headerStatus.typeDesp + "\n","Parse Message Detail");
	

	return headerStatus;
	

},

parseFixedHeaderRL: function (messageBuffer){

	var RMLength = {
		"byte" 		: 1,
		"message" 	: 0,
	} 

	if(messageBuffer[1] > 127){

		RMLength.byte = 2;

		if(messageBuffer[2] > 127){

			RMLength.byte = 3;

			if(messageBuffer[3] > 127){

				RMLength.byte = 4;

				RMLength.message = (messageBuffer[1]-128) + (messageBuffer[2]-128) * 128 + (messageBuffer[3]-128) * Math.pow(128,2) + messageBuffer[4] * Math.pow(128,3);

			}	else	{

				RMLength.message = (messageBuffer[1]-128) + (messageBuffer[2]-128) * 128 + messageBuffer[3] * Math.pow(128,2);

			}

		}	else	{

			RMLength.message = (messageBuffer[1]-128)+ messageBuffer[2] * 128 ;

		}

	}	else	{

		RMLength.message = messageBuffer[1];

	}


	return RMLength;


},

parseTopic: function (messageBuffer,startPos){
	
	var topic = {
		"length"	: messageBuffer[startPos + 1] + messageBuffer[startPos] * 256,
		"name"		: "",
	}

	topic.name = messageBuffer.toString('utf8', startPos + 2, topic.length + startPos + 2);
	
	return topic;

},

parseMessageID: function (messageBuffer,startPos){
	//console.log("<" + messageBuffer[startPos].toString(16) + ", " + messageBuffer[startPos+1].toString(16) + ">");
	var messageID = messageBuffer[startPos + 1]  + messageBuffer[startPos]* 256;

	return messageID;

},

parsePayload: function (messageBuffer,startPos){

	var payload = messageBuffer.toString('utf8', startPos, messageBuffer.length);

	return payload;

},

};
