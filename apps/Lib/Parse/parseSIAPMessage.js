var publicMethods = require("../public.js");
var SIAPHeader = "FFFF";
let CRC = require("../CRC.js");
var debug = require("debug")("SIAP");
debug.color = require("debug").colors[2];
module.exports = {
	parseMessage: function(msg){
		let data = {
			protocol			: "SIAP",
			length			    : this.getMessageLength(msg),
			command				: this.getCommand(msg),
			messageID 			: this.getMessageID(msg),
			payload 			: this.getPayload(msg)
		}
		return data;

	},
	getMessageID: function(message){
		return parseInt(publicMethods.getByteFromStr(message, 3, 1), 16);
	},
	getMessageLength: function(message){
		return parseInt(publicMethods.getByteFromStr(message, 4, 2), 16);
	},
	getCommand: function(message){
		return parseInt(publicMethods.getByteFromStr(message, 6, 1), 16);
	},
	getPayload: function(message){
		return publicMethods.getByteFromStr(message, 7);
	},
	checkChecksum(message){
		let effectiveMessage = new Buffer(publicMethods.getByteFromStr(message, 3), "hex");
		let checksum = parseInt(message.substring(message.length - 2), 16);
		// let impliedChecksum = CRC(effectiveMessage);
		let impliedChecksum = publicMethods.checksum(effectiveMessage);
		if(checksum === impliedChecksum){
			return true
		}   else    {
			debug("SIAP Message Checksum Failed");
			return false
		}
	},
	checkHeader(message){
		if(publicMethods.getByteFromStr(message, 1, 2).toUpperCase() === SIAPHeader){
			return true
		}   else    {
			debug("SIAP Message Check Header Failed");
			return false
		}
	},
	checkLength(message){
		if(this.getMessageLength(message) === (message.length / 2 - 3)){
			return true
		}   else    {
			debug("SIAP Message Check Length Failed");
			return false
		}
	},
	checkValid(message){
		if (this.checkHeader(message) && this.checkLength(message) && this.checkChecksum(message)){
			return true
		}
		return false
	}
};
