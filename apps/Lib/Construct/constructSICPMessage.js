/************************************/

		   //Construct//

/************************************/

var config = require("../../../config.js");
var public = require("../public.js");
var constructMessage = require("./constructHardwareMessage")


module.exports = {
  

//////////////////////////////////////
		 //CONTENT START//
//////////////////////////////////////


    constructSICPHeartBeats: function(signal, status, phones, meshID, gatewayMeshID) {

        if (!signal) signal = 100;
        if (!status) status = 1;
        if (!phones) phones = 0;
        if (!meshID) meshID = new Buffer([0x80, 0x01]);
        if (!gatewayMeshID) gatewayMeshID = new Buffer([0x80, 0x00]);

        var messageParts = {
            frameHeader: new Buffer([0xDD, 0xDD]),
            messageLength: public.int2Buffer(100, 2),
            command: new Buffer([0x01]),
            signal: public.int2Buffer(signal, 1),
            status: public.int2Buffer(status, 1),
            phones: public.int2Buffer(phones, 1),
            meshID: meshID,
            gatewayMeshID: gatewayMeshID,

        };


        var message = Buffer.concat([
            messageParts.frameHeader,
            messageParts.messageLength,
            messageParts.command,
            messageParts.signal,
            messageParts.status,
            messageParts.phones,
            messageParts.meshID,
            messageParts.gatewayMeshID
        ], 12)


        //console.log(message);

        //console.log(public.Bin2Dec("1000011"))
        return message;

    }



};
/*
module.exports.constructSICPHeartBeats();
*/