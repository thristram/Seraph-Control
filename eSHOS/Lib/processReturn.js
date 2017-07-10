/**
 * Created by fangchenli on 7/9/17.
 */
var public = require("./public.js");
var SQLAction =  require ("./SQLAction.js");
/*
var testData = {
    "seq": 1,
    "success": 1,
    "result": {
        "seqid": 1,
        "code": "0x0200000",
        "msg": "Success"
    },
    "status": {
        "AA55AB58": {
            "C1": 99,
            "C2": 0
        }
    }
}
*/

console.log(public.generateMACLikeUDID("SC","AA55AB56","1"));



module.exports = {
    processSSPBIncomming: function (data) {
        if(data.ifTopic){
            this.processSSPBReturn(data);
        }   else    {
            this.processSSPBRequest(data);
        }
    },
    processSSPBReturn: function(data){
        this.processReceipt(data);
    },
    processSSPBRequest: function(data){
        switch (data.topuc){
            case "/device/info/sub":
                this.processDeviceInfo(data);break;
            case "/device/info/ss":
                this.processDeviceInfo(data);break;
            default:
                break;
        }
    },
    processReceipt: function (data){
        try {
            var payload = JSON.parse(data.payload)
        }   catch(err){
            public.eventError("Payload JSON Error");
        }
        try{
            for (var key in payload.status){
                for (var channelL in payload.status[key]){
                    var channel = parseInt(channelL.substring(1));

                    SQLAction.SQLSetField("seraph_sc_device",{"value" : payload.status[key][channelL], "lastupdate": public.timestamp()},"channel = " + channel +" AND deviceID = '" + key + "'");
                }
            }
        }   catch(err) {
            public.eventError("Payload Format Error");
        }
    },

    processDeviceInfo: function(data){
        try {
            var payload = JSON.parse(data.payload)
        }   catch(err){
            public.eventError("Payload JSON Error");
        }
        try {
            payload["type"] = payload.deviceID.substring(0,1);
            payload.deviceID = payload.deviceID.substring(2);
            var updatedData = {
                "model": payload.model,
                "firmware": payload.firmware,
                "HWTtest": payload.HWTtest,
                "meshID": payload.meshID,
            }
            if(data.topic == "/device/info/sub"){
                switch(payload.type){
                    case "SC":
                        updatedData.managedSEP = payload.NBDEVICE;
                        break;
                    case "SP":
                    case "SL":
                        //updatedData.managedSC = payload.managedSC;
                        updatedData.moduleID = payload.MDID
                        break;
                    default:
                        break;
                }
            }
            SQLAction.SQLSetField("seraph_device",updatedData,"deviceID = '" + payload.deviceID + "'");
        }   catch(err){
            public.eventError("Payload Format Error");
        }

    }

}
