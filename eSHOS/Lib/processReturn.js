/**
 * Created by fangchenli on 7/9/17.
 */
var public = require("./public.js");
var SQLAction =  require ("./SQLAction.js");
var SSPB_APIs = require("./SSP-B.js");
var TCPClient = require("./TCPClient.js");

module.exports = {
    processSSPBIncomming: function (data) {
        if(!data.ifTopic){
            this.processSSPBReturn(data);
        }   else    {
            this.processSSPBRequest(data);
        }
    },
    processSSPBReturn: function(data){
        public.eventLog("Processing SSP-B Return Messages....","SSP-B")
        this.processReceipt(data);
    },
    processSSPBRequest: function(data){
        public.eventLog("Processing Request from SS....","SSP-B")
        switch (data.topic){
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
            var payload = JSON.parse(data.payload);
            console.log(payload)
        }   catch(err){
            public.eventError("Payload JSON Error");
        }
        try{
            for (var key in payload.status){
                for (var channelL in payload.status[key]){
                    var channel = parseInt(channelL.substring(1));
                    var deviceType = key.substring(0,2);
                    var deviceID = key.substring(2);
                    SQLAction.SQLSetField("seraph_sc_device",{"value" : payload.status[key][channelL], "lastupdate": public.timestamp()},"channel = " + channel +" AND deviceID = '" + deviceID + "' AND type = '" + deviceType + "'");
                }
            }
        }   catch(err) {
            public.eventError("Payload Format Error");
        }
    },

    processDeviceInfo: function(data){
        public.eventLog("Processing Device Info....","SSP-B")
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
                    public.eventLog("Sending Device List Configuration to SS....","SSP-B")
                    SSPB_APIs.sspbDeviceListPost(TCPClient.TCPClients["SSE11T26"]);
                },1000);
                setTimeout(function(){
                    public.eventLog("Sending ST Configuration to SS....","SSP-B")
                    SSPB_APIs.sspbConfigST(TCPClient.TCPClients["SSE11T26"]);
                },2000)
            }
            SQLAction.SQLSetField("seraph_device",updatedData,"deviceID = '" + payload.deviceID + "'");

        }   catch(err){
            public.eventError("Payload Format Error");
        }

    }

}
