/**
 * Created by fangchenli on 7/9/17.
 */
var public = require("./public.js");
var SQLAction =  require ("./SQLAction.js");
var SSPB_APIs = require("./SSP-B.js");
var HAPLinker = require("./HomeKit_Link.js");
var debug = require('debug')('SSP-B');
var CoreData = require("./CoreData.js");
var debugReceive = require("debug")("ReceivedMessage");

var processSSPBIncomming = function (data, remoteAddress) {
    if(!data.ifTopic){
        processSSPBReturn(data, remoteAddress);
    }   else    {
        processSSPBRequest(data, remoteAddress);
    }
};

var processSSPBReturn = function(data, remoteAddress){
    debug("[%s] Processing SSP-B Return Messages....", public.getDateTime());
    CoreData.Seraph.getSSPBCommands(data.messageID, function(commandData){

       if(commandData){
           CoreData.Seraph.recordSSPBReturn(data.messageID, data);

           if(data.payload){
               try {
                   data["parsedPayload"] = JSON.parse(data.payload);
               }   catch(err){
                   debug("[*******ERROR*******] Payload JSON Error....");
               }
           }
           data.Topic = commandData.messageID + ": " + commandData.action;
           debugReceive(data.Topic);
           if(data["parsedPayload"]){
               debugReceive(data["parsedPayload"])
           }
           switch (commandData.action){
               case "/qe":
                   processQEReceipt(data);break;
               case "/data/sync":
               case "/data/recent":
                   processSensorReceipt(data);break;
               case "/device/status":
                   processDeviceStatusReceipt(data);break;
               case "/device/info/sub":
                   processDeviceInfo(data, remoteAddress);break;
               case "/device/info/ss":
                   processDeviceInfo(data, remoteAddress);break;

               default:
                   break;
           }
       }
    });

};

var processSSPBRequest = function(data, remoteAddress){
    debug("[%s] Processing Request from SS....", public.getDateTime());

    if(data.payload){
        try {
            data["parsedPayload"] = JSON.parse(data.payload);
        }   catch(err){
            debug("[*******ERROR*******] Payload JSON Error....");
        }
    }
    debugReceive(data.topic);
    if(data["parsedPayload"]){
        debugReceive(data["parsedPayload"])
    }

    switch (data.topic){
        case "/device/info/sub":
            processDeviceInfo(data, remoteAddress);break;
        case "/device/info/ss":
            processDeviceInfo(data, remoteAddress);break;
        case "/rt":
            processRealTimeData(data, remoteAddress);break;
        case "/device/status":
            processDeviceStatusReceipt(data, remoteAddress);break;
        default:
            break;
    }
};

var processQEReceipt = function (data){
    debug("[%s] Processing QE Receipt....", public.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (let deviceID in payload.status){
            if((deviceType == "SL") || (deviceType == "SP")){
                for (var channel in payload.status[key]){

                    var temp = {
                        "value"     : payload.status[key][channel],
                        "channel"   : public.translateCChannel(channel),
                        "deviceID"  : deviceID,
                        "deviceType": deviceType,
                    };
                    CoreData.Seraph.getDevice(temp.deviceID).getChannel(channel).setValue(temp.value)
                    HAPLinker.HAPEvent.emit("statusUpdate", temp.deviceID, temp.channel, temp.value, true);
                }
            }

        }

    }   catch(err) {
        debug("[*******ERROR*******] [%s]", err);
    }
};

var approvedSensor = ["HM", "TP", "PT", "SM", "CO" , "CD", "VO"]
    /*
    {"SSE11T26":{"HM":53,"TP":269,"PT":0,"SM":0,"PR":1,"MI":0,"BT":0,"CO":107,"CD":0,"VO":1}}
     */
var processSensorReceipt = function (data){
    debug("[%s] Processing Sensor Receipt....", public.getDateTime());
    var payload = data.parsedPayload;
    //try{
        for (var deviceID in payload){
            for (var channel in payload[deviceID]){

                if(approvedSensor.indexOf(channel) > (-1)){
                    var temp = {
                        "value"     : payload[deviceID][channel],
                        "channel"   : channel,
                        "deviceID"  : deviceID
                    };
                    CoreData.Seraph.getDevice(temp.deviceID).getSensor(temp.channel).setValue(temp.value);
                    HAPLinker.HAPEvent.emit("sensorUpdate", temp.deviceID, temp.channel, temp.value, false);
                }

            }
        }

    //}   catch(err) {

        //debug("[*******ERROR*******] [%s]", err);
    //}
};

var processDeviceStatusReceipt = function(data){
    debug("[%s] Processing Device Status Receipt....", public.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (var SCDeviceID in payload){
            for (var module in payload[SCDeviceID]){

                var SEPdevice = {
                    deviceType      : SCDeviceID.substring(0,2),
                    SCdeviceID      : SCDeviceID.substring(2),
                    SCdeviceIDFull  : SCDeviceID,
                    deviceMDID      : parseInt(payload[SCDeviceID][module].MDID),
                    deviceSubType   : (parseInt(payload[SCDeviceID][module].type)-1)?"SP":"SL",
                };

                SEPdevice["deviceID"] = CoreData.Seraph.getDeviceByMDID(SEPdevice.SCdeviceIDFull, SEPdevice.deviceMDID).deviceID;
                SEPdevice["deviceIDFull"] = SEPdevice.deviceID;



                for(var channel in payload[SCDeviceID][module]){
                    if(channel.charAt(0) == "C" && (channel.length == 2)){

                        var temp = {
                            "value"     : parseInt(payload[SCDeviceID][module][channel]),
                            "channel"   : public.translateCChannel(channel),
                            "deviceID"  : SEPdevice.deviceID,
                            "deviceType": SEPdevice.deviceSubType,
                        };
                        CoreData.Seraph.getDevice(temp.deviceID).getChannel(temp.channel).setValue(temp.value);
                        HAPLinker.HAPEvent.emit("statusUpdate", SEPdevice.deviceIDFull, temp.channel, temp.value, false);

                    }
                }

            }

        }

    }   catch(err) {
        debug("[*******ERROR*******] [%s]", err);
    }
};

var processDeviceInfo = function(data, remoteAddress){
    debug("[%s] Processing Device Info....", public.getDateTime());
    var payload = data.parsedPayload;
    try {
        payload["type"] = payload.deviceID.substring(0,2);
        var updatedData = {
            "model": payload.model,
            "firmware": payload.firmware,
            "HWtest": payload.HWtest,
            "meshID": payload.meshID.toString(16).toUpperCase(),
        }
        if(data.topic == "/device/info/sub"){
            switch(payload.type){
                case "SC":
                    //updatedData.SLC= payload.SLC;
                    break;
                case "ST":

                    break;
                default:
                    break;
            }
        }   else if(data.topic == "/device/info/ss"){

            let SSDeviceID = payload.deviceID;
            let device = CoreData.Seraph.getDevice(SSDeviceID);

            if(device){
                //device.initTCPSocket(CoreData.tempTCPConnection[remoteAddress]);
                device.setTCPConnectionStatus(true);
                delete(CoreData.tempTCPConnection[remoteAddress]);

                //SQLAction.SQLSetField("seraph_device",{"IPAddress": remoteAddress},{"deviceID":payload.deviceID});
                public.eventLog('Connection From: '+ con.remoteAddress + " is Registered","TCP Server");
                setTimeout(function(){
                    debug("[%s] Sending Device List Configuration to SS...", public.getDateTime());
                    SSPB_APIs.sspbDeviceListPost(SSDeviceID);
                },1000);
                setTimeout(function(){
                    debug("[%s] Sending ST Configuration to SS...", public.getDateTime());
                    SSPB_APIs.sspbConfigST(SSDeviceID);
                },2000)
            }

        }
        SQLAction.SQLSetField("seraph_device",updatedData,{"deviceID":payload.deviceID});

    }   catch(err){
        debug("[*******ERROR*******] Payload Format Error....");
    }

};

var processRealTimeData = function(data, remoteAddress){
    debug("[%s] Processing RT Data....", public.getDateTime());
    var payload = data.parsedPayload;
    try{
        var deviceID = payload.report.SEPID;
        var sensorValue = parseInt(payload.report.value);
        switch(payload.report.type){
            case "MI":
                CoreData.Seraph.getDevice(deviceID).getSensor("MI").setValue(sensorValue);
                if(sensorValue > 0){
                    HAPLinker.HAPEvent.emit("sensorUpdate", deviceID, "MI", 1, false);
                }   else    {
                    HAPLinker.HAPEvent.emit("sensorUpdate", deviceID, "MI", 0, false);
                }
                break;
            case "EG":
                CoreData.Seraph.getDeviceByMDID(deviceID, payload.report.MDID).getSensor("EG").setValue(sensorValue);
                break;
            case "CP":
                break;
            case "GT":
                break;
            case "PX":
                break;
            default:
                break;
        }
    }   catch(err){
        debug("[*******ERROR*******] %s",err);
    }
}

module.exports = {
    processSSPBIncomming: processSSPBIncomming,
    processSSPBReturn: processSSPBReturn,
    processSSPBRequest: processSSPBRequest,
    processQEReceipt: processQEReceipt,
    processSensorReceipt: processSensorReceipt,
    processDeviceStatusReceipt: processDeviceStatusReceipt,
    processDeviceInfo: processDeviceInfo,

}
