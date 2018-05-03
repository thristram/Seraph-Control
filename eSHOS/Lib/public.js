

/************************************/

		    //Public//

/************************************/
var currentMessageID = 0;
module.exports = {
  

//////////////////////////////////////
		 //CONTENT START//
//////////////////////////////////////

    generateTimeBasedUID(){
        let time = parseInt(Date.now());
        return time.toString(16).toUpperCase();
    },

	generateMessageID: function (){
		//return Math.floor((Math.random() * 16383) + 1);
        currentMessageID += 1;
		let messageID = currentMessageID;
		if(messageID > 65530){
			messageID = 0;
            currentMessageID = 0;
		}
		return messageID;
	},
	generateSIDPMessageID: function(){
        return this.int2Buffer(Math.floor((Math.random() * 255) + 1),1);
	},
	TopicLength: function (msg){
		var length = Buffer.byteLength(msg);
		return this.int2Buffer(length,2);
	},

	StingtoBuffer: function (msg){
		var message = msg,
			buffer = new Buffer(Buffer.byteLength(message));
		buffer.write(message, 0);
		return buffer;

	},

	int2Buffer: function (msgInt,bufferLength){

		var bufTrueLength =  Math.floor(Math.log2(msgInt) / 8) + 1;

		if(!bufferLength){
            bufferLength = bufTrueLength;
		}

		var buf = Buffer.allocUnsafe(Math.pow(2,bufferLength-1));

		if(bufferLength == 1){
			buf.writeUInt8(msgInt, 0);
		}	else if(bufferLength == 2){
			buf.writeUInt16BE(msgInt, 0);

		}	else if(bufferLength == 3){
			buf.writeUInt32BE(msgInt, 0);

		}	else if(bufferLength < 7) {
            buf = Buffer.allocUnsafe(6);
			buf.writeUIntBE(msgInt, 0, 6);
		}	else	{
			this.eventError("Input Exceed Maxium", "Method Error")
		}
		//console.log(buf)
		return buf.slice(buf.length - bufferLength);
	},


	Bin2Hex: function (bin){
    	return new Buffer(parseInt(bin, 2).toString(16),'hex');
	},

	Hex2Dec: function (hex){
		var dec = 0;
		for(i=0;i<hex.length;i++){
			if(hex[i] == 1){
				dec = dec + Math.pow(2,hex.length-i-1);
			}
		}
		return dec;
	},

	Dec2Hex: function (dec,max){
		var hex= new Array();
		for(i=0;i<max;i++){
			hex[max-1-i] = dec%2;
			dec = Math.floor(dec/2);
		}
		return hex;

	},
	timestamp: function (){

		return Math.floor(Date.now() / 1000);


	},

	getDateTime: function(timestamp) {

		if(timestamp){
            var date = new Date(timestamp * 1000);
		}	else	{
            var date = new Date()
		}


		var hour = date.getHours();
		hour = (hour < 10 ? "0" : "") + hour;

		var min  = date.getMinutes();
		min = (min < 10 ? "0" : "") + min;

		var sec  = date.getSeconds();
		sec = (sec < 10 ? "0" : "") + sec;

		var year = date.getFullYear();

		var month = date.getMonth() + 1;
		month = (month < 10 ? "0" : "") + month;

		var day  = date.getDate();
		day = (day < 10 ? "0" : "") + day;

		return month + "/" + day + "/" + year + " " + hour + ":" + min + ":" + sec;

	},
	log:function(data,type,err){
		if(["Construct Message Full", "Construct Message", "Parse Message Full","Parse Message Status","Parse Message Detail" ,"Construct Message Detail" ,"SSP-A Request"].indexOf(type) > (-1)){

		}	else	{
            if(err){
                console.warn(data);
            }	else	{
                console.log(data);
            }
		}

	},

	eventLog:  function(data,type){
		if(type){
			this.log('[' + this.getDateTime() + '] ' + '|---'+type+'---| ' + data,type)
		}	else	{
			this.log('[' + this.getDateTime() + '] ' + data,type)
		}

	},
	eventError:  function(data,type){
		if(type){
			this.log('[' + this.getDateTime() + '] ' + '|---'+type+'---| ' + data,type,true)
		}	else	{
			this.log('[' + this.getDateTime() + '] ' + data,type,true)
		}
	},
	dataLog: function(data,type){
		var result = "\n";
		for(key in data){
			var temp;
			if(Array.isArray(data[key]) || typeof data[key] === 'object'){
				temp = JSON.stringify(data[key])
			}	else	{
				temp = data[key];
			}
			result += this.paddingHeading(key) + temp + "\n";
		}

		this.log(result,type);
		return result
	},
	paddingHeading: function(str){
		var full = 24;
		while(str.length<24){
			str += " ";
		}
		return str;
	},
	eventTitle: function (data,titleType,type,err){
		var result = "";
		var _this = this;
		if(titleType ==1){
			result = "\n" + _this.singleTitle("",1);
			if(Array.isArray(data)){

				data.forEach(function(singleLine){
					result += "\n" + _this.singleTitle(singleLine,2);
				})

			}	else	{
				result += "\n" + _this.singleTitle(data,2);
			}
			result += "\n" +_this.singleTitle("",1) + "\n";
		}	else	{
			result = "\n" + _this.singleTitle(data,titleType) + "\n";
		}
        this.log(result,type,err);

		return result;


	},
	singleTitle: function (data,titleType){
		if(data!="") data = " " + data + " ";
		var totalLength = 80,
			dataLength = data.length;
			singlePadding = Math.floor( (80 - dataLength)/2);
			filling = "*",
			resultStr = "",
			lastChar = "";

		switch(titleType){
			case 1: filling = "/";break;
			case 2: filling = "*";break;
			case 3: filling = "/";break;
			default: break;
		}
		if(dataLength%2 == 1){
			lastChar = filling;
		}

		resultStr = fillPadding(singlePadding,filling) + data + fillPadding(singlePadding,filling) + lastChar;


		function fillPadding(total,filling){
			var res  = "";
			for(var i = 0; i < total; i++){
				res += filling;
			}
			return res;
		}

		return resultStr;
	},

	bufferString: function (buf, ifSeperate){
		var bufStr = buf.toString('hex');
		var str = "";
		var seperator = " ";
		if(ifSeperate){
			seperator = " ";
		}	else	{
			seperator = "";
		}
		for (var i = 0, len = bufStr.length; i < len; i=i+2) {
			str += bufStr[i] + bufStr[i+1] + " ";
		}
		return str.toUpperCase();
	},
	checksum: function(s){

		var len = s.length;
		var XOR = 0;
		for (var i = 0; i < len; i++) {
            XOR ^=  s[i];
		}

		return XOR;
	},
	mergeObject: function(obj1,obj2){
		for (key in obj2){
			obj1[key] = obj2[key];
		}
		return obj1;
	},
	formateHex: function(hex){

		var formattedHex = hex.replace(/ /g,'').toUpperCase();
        if(formattedHex.length == 1){
            formattedHex = "0" + formattedHex;
        }
        return formattedHex
    },
    generateMACLikeUDID: function(type,deviceID,channel){
        var udid = "";

        if(deviceID[0] == "S"){
            type = deviceID.substring(0,2);
        	deviceID = deviceID.substring(2);

		}
		switch(type){
			case "SPC": udid = "SP:"; break;
			case "SLC": udid = "SL"; break;
			default: udid = type + ":";break;
		}
		var orgLength = deviceID.length
		if(orgLength < 8){
			for(var j = 0; j < ( 8 - orgLength);j++){
				deviceID = deviceID + "0";
			}
		}
		for(var i in deviceID){
            udid += deviceID[i];
			if((i%2) == 1){
                udid += ":"
            }
		}
		if(channel.length == 1){
			channel = "0" + channel;
		}
		udid += channel;
		return udid;
	},
	translateChannel: function(c){
    	var channel = parseInt(c);
    	switch(channel){
			case 1: return 1;
			case 2: return 2;
			case 3: return 4;
			case 4: return 8;
			default: return false;
		}
	},
    arrayUnique: function (arr){
    	var tmp = new Array();

    	for(var m in arr){
        	tmp[arr[m]]=1;
    	}

    	var tmparr = new Array();

    	for(var n in tmp){
        	tmparr.push(n);
    	}
    	return tmparr;
	},
	translateCChannel: function(c){
    	if(c.charAt(0) == "C"){
    		return parseInt(c.substring(1));
		}
	}




};