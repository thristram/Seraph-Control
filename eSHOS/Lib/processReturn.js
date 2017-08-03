/**
 * Created by fangchenli on 7/9/17.
 */
var public = require("./public.js");
var SQLAction =  require ("./SQLAction.js");
var SSPB_APIs = require("./SSP-B.js");
var TCPClient = require("./TCPClient.js");
var HAPLinker = require("./HomeKit_Link.js");
var debug = require('debug')('SSP-B');


var processSSPBIncomming = function (data) {
    if(!data.ifTopic){
        processSSPBReturn(data);
    }   else    {
        processSSPBRequest(data);
    }
};

var processSSPBReturn = function(data){
    debug("[%s] Processing SSP-B Return Messages....", public.getDateTime());
    var messageID = data.messageID;
    var query = "messageID = '" + messageID + "' AND (finished = 0 OR finished IS NULL)";
    SQLAction.SQLFind("seraph_sspb_command_logs","*", query,function(SQLData){
        if(SQLData.length != 0){
            SQLAction.SQLSetField("seraph_sspb_command_logs",{"finished" : 1},query);

            if(data.payload){
                try {
                    data["parsedPayload"] = JSON.parse(data.payload);
                }   catch(err){
                    debug("[*******ERROR*******] Payload JSON Error....");
                }
            }

            switch (SQLData.action){
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
            delete(SQLData);
        }

    })



};

var processSSPBRequest = function(data){
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
            processDeviceInfo(data);break;
        case "/device/info/ss":
            processDeviceInfo(data);break;
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
                    SQLAction.SQLSetField("seraph_sc_device",{"value" : payload.status[key][channel], "lastupdate": public.timestamp()},"channel = " + public.translateCChannel(channel) +" AND deviceID = '" + deviceID + "' AND type = '" + deviceType + "'");
                    HAPLinker.HAPEvent.emit("statusUpdate", key, public.translateCChannel(channel), payload.status[key][channel])
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
                SQLAction.SQLSetField("seraph_sensor",{"value" : payload[deviceID][channel], "lastupdate": public.timestamp()},"code = '" + channel + "' AND deviceID = '" + deviceID + "'");
                HAPLinker.HAPEvent.emit("sensorUpdate", deviceID, channel, payload[deviceID][channel])
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
                    SQLAction.SQLSetField("seraph_sc_device",{"value" : payload[key][channel], "lastupdate": public.timestamp()},"channel = " + public.translateCChannel(channel) +" AND deviceID = '" + deviceID + "' AND type = '" + deviceType + "'");
                    HAPLinker.HAPEvent.emit("statusUpdate", key, public.translateCChannel(channel), payload[key][channel]);
                }
            }
        }

    }   catch(err) {
        ddebug("[*******ERROR*******] [%s]", err);
    }
};

var processDeviceInfo = function(data){
    debug("[%s] Processing Device Info....", public.getDateTime());
    var payload = data.parsedPayload;
    try {
        payload["type"] = payload.deviceID.substring(0,1);
        payload.deviceID = payload.deviceID.substring(2);
        var updatedData = {
            "model": payload.model,
            "firmware": payload.firmware,
            "HWtest": payload.HWtest,
            "meshID": payload.meshID,
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
            setTimeout(function(){
                debug("[%s] Sending Device List Configuration to SS...", public.getDateTime());
                SSPB_APIs.sspbDeviceListPost(TCPClient.TCPClients["SSE11T26"]);
            },1000);
            setTimeout(function(){
                debug("[%s] Sending ST Configuration to SS...", public.getDateTime());
                SSPB_APIs.sspbConfigST(TCPClient.TCPClients["SSE11T26"]);
            },2000)
        }
        SQLAction.SQLSetField("seraph_device",updatedData,"deviceID = '" + payload.deviceID + "'");

    }   catch(err){
        debug("[*******ERROR*******] Payload Format Error....");
    }

};

module.exports = {
    processSSPBIncomming: processSSPBIncomming,
    processSSPBReturn: processSSPBReturn,
    processSSPBRequest: processSSPBRequest,
    processQEReceipt: processQEReceipt,
    processSensorReceipt: processSensorReceipt,
    processDeviceStatusReceipt: processDeviceStatusReceipt,
    processDeviceInfo: processDeviceInfo,

}
