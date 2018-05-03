/**
 * Created by fangchenli on 7/9/17.
 */
var publicMethods = require("./public.js");
var SQLAction =  require ("./SQLAction.js");
var SSPB_APIs = require("./SSP-B.js");
var HAPLinker = require("./HomeKit_Link.js");
var debug = require('debug')('SSP-B');
var Seraph = require("./CoreData.js");
var debugReceive = require("debug")("ReceivedMessage");

var processSIAPIncomming = function (data, remoteAddress){
	let SSDevice = Seraph.devices.getDeviceByIP(remoteAddress);
	if (SSDevice){
		processSIAP(data,SSDevice.deviceID, remoteAddress);
		SSDevice.deviceStatus.updateLastUpdate();
	}


};
var processSIAP = function(data, SSDeviceID, remoteAddress){
	debug("[%s] Processing SIAP Messages....", publicMethods.getDateTime());
	switch (data.command){
		case 1:
            processSIAPUpdateInfo(SSDeviceID, data);
			break;
		case 4:
			processSIAPUpdateResult(SSDeviceID, data);
		    break;
		default:
			break;
	}

};
var processSIAPUpdateInfo = function(SSDeviceID, data){
    let SSDevice = Seraph.devices.getDevice(SSDeviceID);
    if(SSDevice){
        let model = parseInt(publicMethods.getByteFromStr(data.payload, 1, 2), 16);
	    let hardware = parseInt(publicMethods.getByteFromStr(data.payload, 3, 2), 16);
	    let firmware = parseInt(publicMethods.getByteFromStr(data.payload, 5, 2), 16);
        SSDevice.receivePreUpdateInfo(model, firmware, hardware);
    }
};
var processSIAPUpdateResult = function(SSDeviceID, data){
	let SSDevice = Seraph.devices.getDevice(SSDeviceID);
	if(SSDevice){
		let status = parseInt(publicMethods.getByteFromStr(data.payload, 1, 2), 16);
		let firmware = parseInt(publicMethods.getByteFromStr(data.payload, 3, 2), 16);
		SSDevice.receiveUpdateResult(status, firmware);
	}
};
var processSSPBIncomming = function (data, remoteAddress, con) {
    if(!data.ifTopic){
        processSSPBReturn(data, remoteAddress);
    }   else    {
        processSSPBRequest(data, remoteAddress);
    }
    let SSDevice = Seraph.devices.getDeviceByIP(remoteAddress);
    if (SSDevice){
        SSDevice.deviceStatus.updateLastUpdate();
    }   else if(con)    {
        SSPB_APIs.sspbDeviceInfoSSGet(con);
    }
};

var processSSPBReturn = function(data, remoteAddress){
    debug("[%s] Processing SSP-B Return Messages....", publicMethods.getDateTime());
    Seraph.getSSPBCommands(data.messageID, function(commandData){

       if(commandData){
           Seraph.recordSSPBReturn(data.messageID, data);

           if(data.payload){
               try {
                   data["parsedPayload"] = JSON.parse(data.payload);
               }   catch(err){
                   debug("[*******ERROR*******] Payload JSON Error....");
               }
           }
           debugReceive("【" + commandData.messageID + "】 " + commandData.action);
           if(data["parsedPayload"]){
               debugReceive(data["parsedPayload"])
           }
           data.topic = commandData.action;
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
               case "/device/malfunction":
                   processDeviceMalfunction(data, remoteAddress);break;
	           case "/config/mfichallenge":
		           processMFiChallengeData(data, remoteAddress);break;
               default:
                   break;
           }
       }
    });

};

var processSSPBRequest = function(data, remoteAddress){
    debug("[%s] Processing Request from SS....", publicMethods.getDateTime());

    if(data.payload){
        try {
            data["parsedPayload"] = JSON.parse(data.payload);
        }   catch(err){
            debug(err);
        }
    }
    debugReceive("【" + data.messageID + "】 " + data.topic);
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
        case "/config/st":
            processConfigSTRequest(data, remoteAddress);break;
        case "/device/malfunction":
            processDeviceMalfunction(data, remoteAddress);break;
        default:
            break;
    }
};
var processMFiChallengeData = function(data, remoteAddress){
	debug("[%s] Processing MFi Challenge Data....", publicMethods.getDateTime());
	var payload = data.parsedPayload;
	debug(payload);
	Seraph.log(payload,"MFi Challenge Data");
	payload["messageID"] = data.messageID;
	HAPLinker.HAPEvent.emit("MFiProof", payload);
}
var processDeviceMalfunction = function(data, remoteAddress){
    debug("[%s] Processing Device Malfunction....", publicMethods.getDateTime());
    var payload = data.parsedPayload;
    debug(payload);
    try{
        for(let deviceID in payload){

            let seraphDevice = Seraph.devices.getDevice(deviceID);
            let deviceError = payload[deviceID];
            if (seraphDevice){

                switch (seraphDevice.type){
                    case "SC":
                        for(let index in deviceError){
                            let SEPDeviceError = deviceError[index];
                            if(SEPDeviceError.MDID === 0){
	                            seraphDevice.setFirmware(SEPDeviceError.fw);
                                seraphDevice.deviceStatus.setStatus(SEPDeviceError.sts);
                            }   else    {
                                let SEPDevice = Seraph.devices.getDeviceByMDID(deviceID, SEPDeviceError.MDID);
                                if(SEPDevice){
                                    SEPDevice.deviceStatus.setStatus(SEPDeviceError.sts);
                                }
                            }
                        }
	                    HAPLinker.HAPEvent.emit("versionUpdate", deviceID);
                        break;
                    default:
	                    seraphDevice.deviceStatus.setStatus(deviceError.sts);
	                    seraphDevice.setFirmware(deviceError.fw);
	                    HAPLinker.HAPEvent.emit("versionUpdate", deviceID);
                        break;
                }
            }
        }

    }   catch(err){
        debug(err);
    }
    let SSDevice = Seraph.devices.getDeviceByIP(remoteAddress);
    if (SSDevice){
        Seraph.seraphUpdate.checkSS(SSDevice.deviceID);
    }
};
var processConfigSTRequest = function(data, remoteAddress){
    debug("[%s] Processing Config ST Request....", publicMethods.getDateTime());
    try {
        let SSDevice = Seraph.devices.getDeviceByIP(remoteAddress);
        SSPB_APIs.sspbConfigST(SSDevice.deviceID);
    }   catch(err) {
        debug(err);

    }
};
var processQEReceipt = function (data){
    debug("[%s] Processing QE Receipt....", publicMethods.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (let deviceID in payload.status){
            if((deviceType === "SL") || (deviceType === "SP")){
                for (var channel in payload.status[key]){

                    var temp = {
                        "value"     : payload.status[key][channel],
                        "channel"   : publicMethods.translateCChannel(channel),
                        "deviceID"  : deviceID,
                        "deviceType": deviceType,
                    };
                    Seraph.devices.getDevice(temp.deviceID).getChannel(channel).setValue(temp.value)
                    HAPLinker.HAPEvent.emit("statusUpdate", temp.deviceID, temp.channel, temp.value, true);
                }
            }

        }

    }   catch(err) {
        debug("[*******ERROR*******] [%s]", err);
    }
};

var approvedSensor = ["HM", "TP", "PT", "SM", "CO" , "CD", "VO"];
    /*
    {"SSE11T26":{"HM":53,"TP":269,"PT":0,"SM":0,"PR":1,"MI":0,"BT":0,"CO":107,"CD":0,"VO":1}}
     */
var processSensorReceipt = function (data){
    debug("[%s] Processing Sensor Receipt....", publicMethods.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (var deviceID in payload){
            for (var channel in payload[deviceID]){
                if(deviceID.seraphType() === "SS"){
                    let device = Seraph.devices.getDevice(deviceID);
                    if(device){
                        if(device.checkExistSensor(channel)){
                            device.getSensor(channel).setValue(payload[deviceID][channel])
                        }
                    }
                }
                if(deviceID.seraphType() === "ST"){
                    let device = Seraph.devices.getDevice(deviceID);
                    if(device){
                        if(device.checkExistSensor(channel)){
                            device.getSensor(channel).setValue(payload[deviceID][channel])
                        }
                    }
                    device.deviceStatus.updateLastUpdate();
                }

            }
            if(deviceID.seraphType() === "SS") {
                Seraph.devices.getDevice(deviceID).computeAirQuality();
                HAPLinker.HAPEvent.emit("sensorUpdate", deviceID);
            }
        }

    }   catch(err) {

        debug(err);
    }
};

var processDeviceStatusReceipt = function(data){
    debug("[%s] Processing Device Status Receipt....", publicMethods.getDateTime());
    var payload = data.parsedPayload;
    try{
        for (var SCDeviceID in payload){
            let SCDevice = Seraph.devices.getDevice(SCDeviceID);
            SCDevice.deviceStatus.updateLastUpdate();
            for (var module in payload[SCDeviceID]){

                let SEPdevice = {
                    deviceType      : SCDeviceID.substring(0,2),
                    SCdeviceID      : SCDeviceID,
                    deviceMDID      : parseInt(payload[SCDeviceID][module].MDID),
                    deviceSubType   : (parseInt(payload[SCDeviceID][module].type)-1)?"SP":"SL",
                };
                let device = Seraph.devices.getDeviceByMDID(SEPdevice.SCdeviceID, SEPdevice.deviceMDID)
                SEPdevice["deviceID"] = device.deviceID;
                device.deviceStatus.updateLastUpdate();

                for(let channel in payload[SCDeviceID][module]){
                    if(channel.charAt(0) === "C" && (channel.length === 2)){

                        let temp = {
                            "value"     : parseInt(payload[SCDeviceID][module][channel]),
                            "channel"   : publicMethods.translateCChannel(channel),
                            "deviceID"  : SEPdevice.deviceID,
                            "deviceType": SEPdevice.deviceSubType,
                        };
                        Seraph.devices.getDevice(temp.deviceID).getChannel(temp.channel).setValue(temp.value);
                        HAPLinker.HAPEvent.emit("statusUpdate", SEPdevice.deviceID, temp.channel, temp.value, false);

                    }
                }

            }
            // let ACDevice = Seraph.devices.getACBySSDeviceID(SCDevice.SSDeviceID);
            // ACDevice.HVACUpdateHardwareMode()

        }
        //If SS Finish a QE Command and Return, Update all STs
        if(data.ifTopic){
        	let SSDevices = Seraph.devices.getDeviceList(["SS"]);
        	for(let key in SSDevices){
        		let deviceID = SSDevices[key];
        		if(deviceID !== "SS000000"){
			        SSPB_APIs.sspbDataSTPost(deviceID);
		        }
	        }

        }

    }   catch(err) {
        debug("[*******ERROR*******] [%s]", err);
    }
};

var processDeviceInfo = function(data, remoteAddress){
    debug("[%s] Processing Device Info....", publicMethods.getDateTime());
    let payload = data.parsedPayload;
    try {
        payload["type"] = payload.deviceID.substring(0,2);
        let updatedData = {
            "model": payload.model,
            "firmware": payload.firmware,
            "HWtest": payload.HWtest,
            "meshID": payload.meshID.toString(16).toUpperCase(),
        };
        if(data.topic === "/device/info/sub"){

	        let device = Seraph.devices.getDevice(payload.deviceID);
            if(device){
	            device.model = updatedData.model;
	            device.firmware = updatedData.firmware;
	            device.meshID = updatedData.meshID;
	            device.writePropertyToDB({
		            model   : updatedData.model,
		            firmware: updatedData.firmware,
		            meshID  : updatedData.meshID,
		            HWtest  : updatedData.HWtest
	            });
	            switch(device.type){
		            case "SC":
			            //updatedData.SLC= payload.SLC;
			            break;
		            case "ST":

			            break;
		            default:
			            break;
	            }
            }


        }   else if(data.topic === "/device/info/ss"){

            let SSDeviceID = payload.deviceID;
            let device = Seraph.devices.getDevice(SSDeviceID);
            if(device){
                device.model = updatedData.model;
                device.firmware = updatedData.firmware;
	            device.meshID = updatedData.meshID;
                device.writePropertyToDB({
                    model   : updatedData.model,
                    firmware: updatedData.firmware,
	                meshID  : updatedData.meshID,
	                HWtest  : updatedData.HWtest
                });
                device.setTCPConnectionStatus(true);
                if (device.IPAddress !== remoteAddress){
                    device.initTCPSocket(Seraph.TCPConnection.tempConnection[remoteAddress]);
                    device.IPAddress = remoteAddress;
                    SQLAction.SQLSetField("seraph_device",{"IPAddress": remoteAddress},{"deviceID":payload.deviceID});
                }
                if (Seraph.TCPConnection.tempConnection.hasOwnProperty(remoteAddress)){
                    delete(Seraph.TCPConnection.tempConnection[remoteAddress]);
                }
                // public.eventLog('Connection From: '+ remoteAddress + " is Registered","TCP Server");
                setTimeout(function(){
                    debug("[%s] Sending Device List Configuration to SS...", publicMethods.getDateTime());
                    SSPB_APIs.sspbDeviceListPost(SSDeviceID);
                },1000);
                // setTimeout(function(){
                //     debug("[%s] Sending ST Configuration to SS...", publicMethods.getDateTime());
                //     SSPB_APIs.sspbConfigST(SSDeviceID);
                // },2000)
            }

        }
        SQLAction.SQLSetField("seraph_device",updatedData,{"deviceID":payload.deviceID});

    }   catch(err){
        debug(err);
    }

};

var processRealTimeData = function(data, remoteAddress){
    debug("[%s] Processing RT Data....", publicMethods.getDateTime());
    var payload = data.parsedPayload;
    try{
        var deviceID = payload.report.SEPID;
        var sensorValue = parseInt(payload.report.value);
        switch(payload.report.type){
            case "MI":

                if(sensorValue > 0){
                    Seraph.devices.getDevice(deviceID).getSensor("MI").setValue(1);
                    HAPLinker.HAPEvent.emit("motionUpdate", deviceID, "MI", 1, false);
                }   else    {
                    Seraph.devices.getDevice(deviceID).getSensor("MI").setValue(0);
                    HAPLinker.HAPEvent.emit("motionUpdate", deviceID, "MI", 0, false);
                }
                break;
	        case "SM":

		        if(sensorValue > 0){
			        Seraph.devices.getDevice(deviceID).getSensor("MI").setValue(1);
			        HAPLinker.HAPEvent.emit("smokeUpdate", deviceID);
		        }   else    {
			        Seraph.devices.getDevice(deviceID).getSensor("MI").setValue(0);
			        HAPLinker.HAPEvent.emit("smokeUpdate", deviceID);
		        }
		        break;
            case "EG":
                Seraph.devices.getDeviceByMDID(deviceID, payload.report.MDID).getSensor("EG").setValue(sensorValue);
                break;
            case "CP":
                var STDeviceID = payload.report.SEPID;
                var value = parseInt(payload.report.value);
                var keyPad = parseInt(payload.report.keyPad);
                var ST = Seraph.devices.getDevice(STDeviceID);
                if(ST){
                    let padArray = keyPad.toString(2).split("").map( x => parseInt(x) ).reverse();
                    let valueArray = value.toString(2).split("").map( x => parseInt(x) ).reverse();
                    for(let index in padArray){
                        if(index < 3){
                            if(valueArray[index] === 1){

                                let commandSequence = parseInt(parseInt(index) + 1);
                                let currentSTValue = ST.getKey(commandSequence).value;
                                if(currentSTValue){
                                    ST.executeCommand(commandSequence, 0);
                                }   else    {
                                    ST.executeCommand(commandSequence, 100);
                                }
                                ST.getKey(commandSequence).value = !currentSTValue;

                            }

                        }
                    }
                }
                break;
            case "CB":
                var STDeviceID = payload.report.SEPID;
                var value = parseInt(parseInt(payload.report.value) * 12.5);
                var keyPad = parseInt(payload.report.keyPad);
                if(!keyPad){
                    keyPad = 0;
                }
                var ST = Seraph.devices.getDevice(STDeviceID);
                if(ST){
                    ST.executeCommand(keyPad, value);
                }
                break;
            case "GT":
                var STDeviceID = payload.report.SEPID;
                var value = parseInt(payload.report.value);
                var keyPad = 4;
                var ST = Seraph.devices.getDevice(STDeviceID);
                if(ST){
	                let currentSTValue = ST.getKey(keyPad).value;
	                if(currentSTValue){
		                ST.executeCommand(keyPad, 0);
	                }   else    {
		                ST.executeCommand(keyPad, 100);
	                }
	                ST.getKey(keyPad).value = !currentSTValue;

                }
                break;
            case "PX":
                break;
            case "IR":
                try{
                    switch(payload.report.value){
                        case 1:
                            switch(payload.IR.type){
                                case 0:
                                    debug("IR Learning Result Received");
                                    debug(payload.IR.raw);

                                    setTimeout(function(){
                                        SSPB_APIs.sspbActionIR(payload.report.SEPID, 0, payload.IR.raw)
                                    },3000);


                                    break;
                                default:
                                    break
                            }
                            break;
                        case 2:
                            debug("IR Learning Timeout");
                            break;
                        default:
                            break;
                    }
                }   catch(err){
                    debug(err)
                }
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
	processSIAPIncomming: processSIAPIncomming,
    processSSPBReturn: processSSPBReturn,
    processSSPBRequest: processSSPBRequest,
    processQEReceipt: processQEReceipt,
    processSensorReceipt: processSensorReceipt,
    processDeviceStatusReceipt: processDeviceStatusReceipt,
    processDeviceInfo: processDeviceInfo,

}
