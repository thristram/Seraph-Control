var public = require("./public.js");
var CoreDatas = {
    "mdid2DeviceID":{
        "AA55AB08": {
            "M1": "AA55AB70",
            "M2": "AA55AB71"
        }
    }

}
var CoreData = require ("./CoreData.js");


var json = '{"SCAA55AB08":[{"MDID":1,"type":1,"C1":1,"C2":0},{"MDID":2,"type":2,"C1":1,"C2":0,"C3":0}]}'
var payload = JSON.parse(json);

    for (var key in payload){

        for (var mkey in payload[key]){

            var SEPdevice = {
                deviceType      : key.substring(0,2),
                SCdeviceID      : key.substring(2),
                SCdeviceIDFull  : key,
                deviceMDID      : parseInt(payload[key][mkey].MDID),
                deviceSubType   : (parseInt(payload[key][mkey].type)-1)?"SP":"SL",
            };
            SEPdevice["deviceID"] = CoreData.mdid2DeviceID[SEPdevice.SCdeviceID]["M" + SEPdevice.deviceMDID];
            SEPdevice["deviceIDFull"] = SEPdevice.deviceSubType + SEPdevice.deviceID;


            console.log(SEPdevice);



            for(var channel in payload[key][mkey]){
                if(channel.charAt(0) == "C" && (channel.length == 2)){

                    var temp = {
                        "value"     : parseInt(payload[key][mkey][channel]),
                        "channel"   : public.translateCChannel(channel),
                        "deviceID"  : SEPdevice.deviceID,
                        "deviceType": SEPdevice.deviceSubType,
                    };

                    console.log(temp)

                }
            }
            /*
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
            */
        }

    }
