/**
 * Created by fangchenli on 7/9/17.
 */
var public = require("./public.js");
var SQLAction =  require ("./SQLAction.js");
var SSPB_APIs = require("./SSP-B.js");
var HAPLinker = require("./HomeKit_Link.js");
var debug = require('debug')('SSP-B');
var CoreData = require("./CoreData.js");


var processSSPBIncomming = function (data, remoteAddress) {
    if(!data.ifTopic){
        processSSPBReturn(data, remoteAddress);
    }   else    {
        processSSPBRequest(data, remoteAddress);
    }
};

var processSSPBReturn = function(data, remoteAddress){
    debug("[%s] Processing SSP-B Return Messages....", public.getDateTime());

    CoreData.getSSPBCommands(data.messageID, function(commandData){
       if(commandData){
           CoreData.recordSSPBReturn(data.messageID, data);

           if(data.payload){
               try {
                   data["parsedPayload"] = JSON.parse(data.payload);
               }   catch(err){
                   debug("[*******ERROR*******] Payload JSON Error....");
               }
           }

           switch (commandData.action){
               case "/qe":
                   processQEReceipt(data);break;
               case "/data/sync":
               case "/data/recent":
                   processSensorReceipt(data);break;
               case "/device/status":
                   processDeviceStatusReceipt(data);break;
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

    switch (data.topic){
        case "/device/info/sub":
            processDeviceInfo(data, remoteAddress);break;
        case "/device/info/ss":
            processDeviceInfo(data, remoteAddress);break;
        case "/rt":
            processRealTimeData(data, remoteAddress);break;
        default:
            break;
    }
};

var processQEReceipt = function (data){
    debug("[%s] Processing QE Receipt....", public.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (var key in payload.status){
            var deviceType = key.substring(0,2);
            var deviceID = key.substring(2);
            if((deviceType == "SL") || (deviceType == "SP")){
                for (var channel in payload.status[key]){

                    var temp = {
                        "value"     : payload.status[key][channel],
                        "channel"   : public.translateCChannel(channel),
                        "deviceID"  : deviceID,
                        "deviceType": deviceType,
                    };

                    CoreData.updateDeviceStatus(temp.value, temp.channel, temp.deviceID, temp.deviceType);
                    HAPLinker.HAPEvent.emit("statusUpdate", temp.deviceID, temp.channel, temp.value, true);
                }
            }

        }

    }   catch(err) {
        debug("[*******ERROR*******] [%s]", err);
    }
};


    /*
    {"SSE11T26":{"HM":53,"TP":269,"PT":0,"SM":0,"PR":1,"MI":0,"BT":0,"CO":107,"CD":0,"VO":1}}
     */
var processSensorReceipt = function (data){
    debug("[%s] Processing Sensor Receipt....", public.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (var deviceID in payload){
            for (var channel in payload[deviceID]){

                var temp = {
                    "value"     : payload[deviceID][channel],
                    "channel"   : channel,
                    "deviceID"  : deviceID
                };

                CoreData.updateSensorValue(temp.value, temp.channel, temp.deviceID);
                HAPLinker.HAPEvent.emit("sensorUpdate", temp.deviceID, temp.channel, temp.value, false);
            }
        }

    }   catch(err) {
        debug("[*******ERROR*******] [%s]", err);
    }
};

var processDeviceStatusReceipt = function(data){
    debug("[%s] Processing Device Status Receipt....", public.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (var key in payload){
            for (var channel in payload[key]){
                var deviceType = key.substring(0,2);
                var deviceID = key.substring(2);
                if((deviceType == "SL") || (deviceType == "SP")){

                    var temp = {
                        "value"     : payload[key][channel],
                        "channel"   : public.translateCChannel(channel),
                        "deviceID"  : deviceID,
                        "deviceType": deviceType
                    };

                    CoreData.updateDeviceStatus(temp.value, temp.channel, temp.deviceID, temp.deviceType);
                    HAPLinker.HAPEvent.emit("statusUpdate", key, public.translateCChannel(channel), payload[key][channel], false);
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
        payload["type"] = payload.deviceID.substring(0,1);
        payload.deviceID = payload.deviceID.substring(2);
        var updatedData = {
            "model": payload.model,
            "firmware": payload.firmware,
            "HWtest": payload.HWtest,
            "meshID": payload.meshID.toString(16).toUpperCase(),
        }
        if(data.topic == "/device/info/sub"){
            switch(payload.type){
                case "SC":
                    updatedData.managedSEP = payload.NDevice;
                    break;
                case "SP":
                case "SL":
                    //updatedData.managedSC = payload.managedSC;
                    updatedData.moduleID = payload.MDID
                    break;
                default:
                    break;
            }
        }   else if(data.topic == "/device/info/ss"){

            var deviceID = payload.type + payload.deviceID;

            SQLAction.SQLFind("seraph_device", "id, deviceID, type, IPAddress", {"deviceID": payload.deviceID, "type" : payload.type}, function(SQLData){
                if(SQLData != [] && (deviceID != (SQLData.type + SQLData.deviceID))){
                    updatedData.IPAddress = remoteAddress;


                    SQLAction.SQLFind("seraph_device", "id, deviceID, type, IPAddress", {"IPAddress": remoteAddress}, function(sData){

                        SQLAction.SQLSetField("seraph_device",{"IPAddress": remoteAddress},{"deviceID":payload.deviceID});

                        var deviceBak = sData.type + sData.deviceID;

                        if(sData != []){
                            SQLAction.SQLDelete("seraph_device",{"id":sData.id});
                            CoreData.TCPClients[deviceID].reConnecting = false;
                            CoreData.TCPClients[deviceID].isClient = false;
                            CoreData.TCPClients[deviceID].TCPClient = CoreData.TCPClients[deviceBak].TCPClient;
                            CoreData.TCPClients[deviceID].cStatus = 1;
                            delete(CoreData.TCPClients[deviceBak]);

                        }
                    });
                }

                setTimeout(function(){
                    debug("[%s] Sending Device List Configuration to SS...", public.getDateTime());
                    SSPB_APIs.sspbDeviceListPost(CoreData.TCPClients[deviceID]);
                },1000);
                setTimeout(function(){
                    debug("[%s] Sending ST Configuration to SS...", public.getDateTime());
                    SSPB_APIs.sspbConfigST(CoreData.TCPClients[deviceID]);
                },2000)

            })


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
        switch(payload.report.type){
            case "MI":
                var SSDeviceID = payload.report.sepid;
                if(parseInt(payload.report.value) > 0){
                    CoreData.updateSensorValue(1, "MI", SSDeviceID);
                    HAPLinker.HAPEvent.emit("sensorUpdate", SSDeviceID, "MI", 1, false);
                }   else    {
                    CoreData.updateSensorValue(0, "MI", SSDeviceID);
                    HAPLinker.HAPEvent.emit("sensorUpdate", SSDeviceID, "MI", 0, false);
                }
                break;
            case "EG":
                CoreData.updateSensorValue(parseInt(payload.report.value), "EG", payload.report.SEPID);
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
        debug("[*******ERROR*******] Payload Format Error....");
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
