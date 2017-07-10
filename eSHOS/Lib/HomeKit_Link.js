/**
 * Created by fangchenli on 6/24/17.
 */
var public = require("./public.js");
var constructMessage = require ("./constructMessage.js")
var TCPClient = require ("./TCPClient.js");

module.exports = {

    SPCControl: function(SSDeviceID, deviceID, moduleID, channelID, on){

        var SSDevice = TCPClient.TCPClients[SSDeviceID]
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/qe/sepid/" + deviceID + "/MD/" + moduleID + "/CH/" + channelID + "/action/WP/topos/",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        };



        if(on){
            data.Topic += "99"
        }   else    {
            data.Topic += "00"
        }

        public.eventTitle("TOPIC",2,"Construct Topic");
        console.log(data.Topic)

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
    },
    SLCControl: function(SSDeviceID, deviceID, moduleID, channelID, value){

        if(value == 100){
            value = "99"
        }
        if((parseInt(value) < 10) && (parseInt(value)) > -1){
            value = "0" + value;
        }
        var SSDevice = TCPClient.TCPClients[SSDeviceID]
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/qe/sepid/" + deviceID + "/MD/" + moduleID + "/CH/" + channelID + "/action/DM/topos/" + value,
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        };


        public.eventTitle("TOPIC",2,"Construct Topic");
        console.log(data.Topic )


        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
    }


}