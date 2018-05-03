/**
 * Created by fangchenli on 1/28/17.
 */
var dgram = require("dgram");
var AES =  require ("./AES.js");
var public = require("./public.js");
var smartConnect = require("./smartConnect.js");
var config = require("../../config.js");
var debug = require("debug")("SmartConnect");
//////////////////////////////////////
        //CREATE UDP CLIENT//
//////////////////////////////////////



var UDPServer;

module.exports = {

    smartConnect: function(ssid,password,port){

        // debug("Initiating Seraph Smart Config....");
        var message = this.constructSSCMessage(ssid,password);
        var broadcastMsg = this.constructSSCPacket(message);

	    debug("Start broadcasting Seraph Smart Config....");
        this.sendSmartConnectPacket(broadcastMsg,0,message,port);


    },
    smartConnectSecure: function (ssid,password,mac,port){
        // debug("Initiating Seraph Smart Secured Config....");
        // public.eventLog(,"Secured Smart Connect");
        var IDKey = AES.genIDKey(mac);
        var msgKey = AES.genMsgKey(mac);


        // public.eventLog("Generating Secured SSID","Secured Smart Connect");
        var encryptedSSID = AES.encrypt(ssid,msgKey);


        // public.eventLog("Generating Secured Password","Secured Smart Connect");
        var encryptedPassword = AES.encrypt(password,msgKey);


        var message = this.constructSSCMessage(encryptedSSID,encryptedPassword,IDKey);
        var broadcastMsg = this.constructSSCPacket(message);

        debug("Start broadcasting Secured Seraph Smart Config....");
        // public.eventLog("Start broadcasting Secured Seraph Smart Config....","Secured Smart Connect");
        this.sendSmartConnectPacket(broadcastMsg,0,message,port);
    },
    dataToArray: function(data){
        dataArray = []
        if(typeof data === 'string'){
            tempArray = data.split("");
            tempArray.forEach(function(value){
                dataArray.push(value.charCodeAt(0));
            })

        }   else if(typeof data === 'number')    {

            dataArray.push(data);
        }   else    {
            for (let index in data){
                dataArray.push(parseInt(data[index]));
            }

        }
        return dataArray;
    },
    arrayPadding: function(length,arr){
        if(!arr) arr = [];
        for(var i = arr.length; i < length; i++){
            arr.push(0)
        }
        return arr;
    },
    constructSSCMessage: function(ssid,password,idkey){
        var messageArray;
        if(idkey === "undefined" || idkey === null || !idkey){
            messageArray = this.arrayPadding(3).concat(
                this.dataToArray(120),
                this.arrayPadding(32,this.dataToArray(ssid)),
                this.arrayPadding(64,this.dataToArray(password)),
                this.arrayPadding(20,[])
            );
        }   else    {
            messageArray = this.arrayPadding(3).concat(
                this.dataToArray(120),
                this.arrayPadding(32,this.dataToArray(ssid)),
                this.arrayPadding(16,this.dataToArray(idkey)),
                this.arrayPadding(48,this.dataToArray(password)),
                this.arrayPadding(20,[])
            );
        }
        return messageArray;


    },
    constructSSCPacket: function(SSCMessage){
        var i=0,
            packetData = [];
        SSCMessage.forEach(function(value){
            packetData.push("239." + i + "." + value + ".254")
            i++;
        })

        return packetData;
    },

    sendSmartConnectPacket:function(data,index,message,port){

        var _this = this;
        var socket = dgram.createSocket("udp4");
        socket.bind(port,function () {
            socket.setBroadcast(true);
        });
        this.sendSmartConnectUDPBroadcastMessage(socket,message,data[index],port,function(){
            index++;
            if(index<data.length){
                _this.sendSmartConnectPacket(data,index,message,port);
            }   else    {
                debug("Broadcasting Seraph Smart Config Done!");
                // public.eventLog("Broadcasting Seraph Smart Config Done!","Smart Connect");

            }

        })

    },
    sendSmartConnectUDPBroadcastMessage: function(socket,message,ip,port,callback){

        var msg = new Buffer(message);

        socket.send(msg, 0, msg.length, port, ip, function(err, bytes) {
            //public.eventLog("Broadcasting: " + ip,"Smart Connect");
            socket.close();
            setTimeout(function(){

                callback();

            },20)

        });

    },
    sendUDPBroadcastMessage: function(socket,message,ip,port,callback) {

        var msg = new Buffer(message);
        //public.eventLog("Broadcasting: " + public.bufferString(message),"Smart Connect");
        socket.send(msg, 0, msg.length, port, ip, function(err, bytes) {
            // public.eventLog("Broadcasting: " + ip,"Smart Connect");
            debug("Broadcasting: " + ip);
            setTimeout(function(){

                callback();

            },20)

        });

    },
    broadCastingServerAddress: function(socket,ip,port){

        var data = new Buffer([0xAA,0xAA,0x00,0x05,0x02]);
        var broadcastIPArray = ip.split(".");
        broadcastIPArray.forEach(function (value){
            var buf = new Buffer(1);
            buf.writeUInt8(parseInt(value), 0);
            data = Buffer.concat([data, buf]);
        });
        broadcastIPArray.pop();
        broadcastIPArray.push("255");
        var broadcastIP = broadcastIPArray.join(".");


        this.sendUDPBroadcastMessage(socket,data,broadcastIP,port,function(){
            // public.eventLog("Broadcasting Server IP: " + ip + " to Destination " + broadcastIP,"Smart Connect");
            debug("Broadcasting Server IP: " + ip + " to Destination " + broadcastIP);
        })


    },




}

/************************************/

            //UDP Server//

/************************************/




var createUDPServer = function(){
    var port = config.UDPPort;
    UDPServer = dgram.createSocket("udp4");
    UDPServer.bind(port,function () {
        UDPServer.setBroadcast(true);
    });
    UDPServer.on('listening', function () {
        var address = UDPServer.address();
        debug('UDP Server listening on ' + address.address + ":" + address.port);
        // public.eventLog('UDP Server listening on ' + address.address + ":" + address.port,"UDP Server");
    });

    UDPServer.on('message', function (message, remote) {
	    debug("Receiving Message from " + remote.address + ':' + remote.port +' - ' + public.bufferString(new Buffer(message)));
        // public.eventLog("Receiving Message from " + remote.address + ':' + remote.port +' - ' + public.bufferString(new Buffer(message)),"UDP Server");
        if(checkSICP(message,remote)){
            parseSCIP(message,remote);
        }
    });
    return UDPServer;

}

var parseSCIP = function(message,remote){
    var type = message.readInt8(4);
    var content = message.slice(5,message.length);
    switch(type){
        case 3:
            sicpSmartConnectUDPReply(content,remote);
            break;
        default:
            break;
    }
}
var checkSICP = function(message,remote){
    var SICPIdentifier = new Buffer("aa", 'hex');

    if(message[0] === 170 && message[1] === 170){
        var messageLength = message.readInt8(2) * 128 + message.readInt8(3) + 4;

        if(message.length === messageLength){
            return true;
        }   else    {
            debug("SICP Message Length Error");
            // public.eventError("SICP Message Length Error","UDP Server");
            return false;
        }
    }   else    {
	    debug("SICP Not Supported");
        // public.eventError("SICP Not Supported","UDP Server");
        return false
    }
}
var sicpSmartConnectUDPReply = function(message,remote){
    var idKey = message.slice(1,message.length).toString('hex');
    debug("Parsed ID Key: " + idKey);
    // public.eventLog("Parsed ID Key: " + idKey,"Smart Connect Status");
    // if(typeof approvedSS[remote.address] === "undefined"){
    //     public.eventLog("New TCP Client Connection is Approved, IDKey: " + idKey + ", IP Address: " + remote.address ,"Smart Connect Status");
    // }
    //
    // approvedSS[remote.address] = idKey;


    if(message){
        var code = message.readInt8(0);
        switch (code){
            case 0:
                debug("New TCP Server Connected");
                break;
                // public.eventLog("New TCP Server Connected","Smart Connect Status");break;
            case 1:
	            debug("Dropped from Current TCP Server, New TCP Server Connected");
	            break;
                // public.eventLog("Dropped from Current TCP Server, New TCP Server Connected","Smart Connect Status");break;
            case 2:
                debug("Keep Current Connection");
                break;
                // public.eventLog("Keep Current Connection","Smart Connect Status");break;
            case 3:
	            debug("Cannot Connect to TCP Server");
	            break;
                // public.eventError("Cannot Connect to TCP Server","Smart Connect Status");break;
            default:
                break;
        }
    }
}

module.exports.createUDPServer = createUDPServer;
module.exports.parseSCIP = parseSCIP;
module.exports.checkSICP = checkSICP;
module.exports.sicpSmartConnectUDPReply = sicpSmartConnectUDPReply;





