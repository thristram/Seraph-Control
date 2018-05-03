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

	consructSIDPReceipt: function(protocolType,messageID,meshID,type){

        var requireData = {
            protocolType: protocolType,
            isRequest	: typeof messageID != "object",
            messageID	: messageID,
            meshID		: meshID,

        }

        //Assembly
        requireData.payload = Buffer.concat([
            new Buffer([0xAA]),
            public.int2Buffer(parseInt(type),1)
        ],2);

        //Construct Message
        var message = constructMessage.constructMessage(requireData);
        return message;

	},
    consructSIDPCMD: function(protocolType,messageID,meshID,type,options){

        var requireData = {
            protocolType: protocolType,
            isRequest	: typeof messageID != "object",
            messageID	: messageID,
            meshID		: meshID,

        }

        requireData.payload = Buffer.concat([new Buffer([0x03]), public.int2Buffer(parseInt(type),1)],2);

        switch (type){
			case 1:
				var addressesString = "";
                for (var i = 0; i < options.sensors.length; i++){
                    addressesString += options.sensors[i];
                }
                var addresses = new Buffer(addressesString, "hex");

                //Assembly
                requireData.payload = Buffer.concat([
                    requireData.payload,
                    addresses
                ],2 + options.sensors.length);

				break;
			case 3:
				var moduleID = public.int2Buffer(options.moduleID,1);

				//Assembly
                requireData.payload = Buffer.concat([
                    requireData.payload,
                    moduleID
                ],3);

                break;
			default:
				break;

		}

        //Construct Message
        var message = constructMessage.constructMessage(requireData);
        return message;
    },
    consructSIDPAlarm: function(protocolType,messageID,meshID,type){

        var requireData = {
            protocolType: protocolType,
            isRequest	: typeof messageID != "object",
            messageID	: messageID,
            meshID		: meshID,

        }

        //Assembly
        requireData.payload = Buffer.concat([
            new Buffer([0x05]),
            public.int2Buffer(parseInt(type),1)
        ],2);

        //Construct Message
        var message = constructMessage.constructMessage(requireData);
        return message;
    },
    consructSIDPBLE: function(protocolType,messageID,meshID,type){

        var requireData = {
            protocolType: protocolType,
            isRequest	: typeof messageID != "object",
            messageID	: messageID,
            meshID		: meshID,

        }

		//Assembly
        requireData.payload = Buffer.concat([
        	new Buffer([0xC0]),
			public.int2Buffer(parseInt(type),1)
		],2);

        //Construct Message
        var message = constructMessage.constructMessage(requireData);
        return message;
    },
    consructSIDPAction: function(protocolType,messageID,meshID,type,options){

        var requireData = {
            protocolType: protocolType,
            isRequest	: typeof messageID != "object",
            messageID	: messageID,
            meshID		: meshID,

        };
        var messageParts = {};

        //Single Dimmer
        if(["DM1","DM2","DM3","DM4"].indexOf(type) >= 0){

        	//Type
			switch(type){
				case "DM1":
					messageParts.command = new Buffer([0x51]);
					break;
				case "DM2":
                    messageParts.command = new Buffer([0x52]);
                    break;
				case "DM3":
                    messageParts.command = new Buffer([0x53]);
                    break;
				case "DM4":
                    messageParts.command = new Buffer([0x54]);
                    break;

			}

			//Channel
            messageParts.channel = constructMessage.constructChannel(options.moduleID,options.channel);

			//Action Value
			messageParts.value = public.int2Buffer(options.value,1);

            //Transition Time
            if(!options.time) options.time = 2000;
            messageParts.ext = public.int2Buffer(Math.floor(options.time/100),1);

            //Assembly
            requireData.payload = Buffer.concat([
            	messageParts.command,
				messageParts.channel,
				messageParts.value,
				messageParts.ext
			],4);


		//Wall Plug & Control Pad
        }	else if(["WP","CP"].indexOf(type) >= 0){

        	//Wall Plug or Control Pad
            switch(type){
                case "WP":
                    messageParts.command = new Buffer([0x55]);
                    break;
                case "CP":
                    messageParts.command = new Buffer([0x56]);
                    break;

            }

            //Channel
            messageParts.channel = constructMessage.constructChannel(options.moduleID,options.channel);

            //Actions Value 0 or 99
            if(options.value > 0){
                messageParts.value = public.int2Buffer(99,1);
			}	else	{
                messageParts.value = public.int2Buffer(0,1);
			}

			//Bland Reserve
			messageParts.ext = new Buffer([0x00]);

			//Assembly
            requireData.payload = Buffer.concat([
            	messageParts.command,
				messageParts.channel,
				messageParts.value,
				messageParts.ext
			],4);

        //Multiple Dimmer
        }	else if(type == "DMM"){
        	//Command
            messageParts.command = new Buffer([0x57]);

            //Value
            messageParts.value = public.int2Buffer(options.value,1);

            //Time
            if(!options.time) options.time = 2000;
            messageParts.ext = public.int2Buffer(Math.floor(options.time/100),1);

            //# of Modules
            messageParts.numberModule = public.int2Buffer(options.moduleID.length,1)

			//Channels
            var channelString = "";
            for (var i in options.moduleID){
            	channelString += constructMessage.constructChannel(options.moduleID[i],options.channel[i]).toString('hex');
			}
			messageParts.channel = new Buffer(channelString,'hex');

			//Assembly
            requireData.payload = Buffer.concat([
            	messageParts.command,
				messageParts.numberModule,
				messageParts.channel,
				messageParts.value,
				messageParts.ext
			], 4 + options.moduleID.length)
		}

        var message = constructMessage.constructMessage(requireData);
        return message;
    },
    consructSIDPConfig: function(protocolType,messageID,meshID,type,options){

        var requireData = {
            protocolType: protocolType,
            isRequest	: typeof messageID != "object",
            messageID	: messageID,
            meshID		: meshID,

        };
        var messageParts = {};

    	//Command
        messageParts.command = new Buffer([0x04]);

        //Type
		messageParts.type = public.int2Buffer(parseInt(type),1);

		//Board and Control Channel
        messageParts.channel = constructMessage.constructChannel(options.moduleID,options.channel);

        //Action
        switch(options.action){
            case "DM1": messageParts.action = new Buffer([0x51]); break;
            case "DM2": messageParts.action = new Buffer([0x52]); break;
            case "DM3": messageParts.action = new Buffer([0x53]); break;
            case "DM4": messageParts.action = new Buffer([0x54]); break;
            case "WP" : messageParts.action = new Buffer([0x55]); break;
        }

        switch(type){

			case 1:

                //pad
                messageParts.pad = public.int2Buffer(parseInt(options.pad),1);

                //Blank Buffer
                messageParts.reserve = new Buffer([0x00]);

                //Assembly
                requireData.payload = Buffer.concat([
                	messageParts.command,
					messageParts.type,
					messageParts.pad,
					messageParts.reserve,
					options.meshID,
					messageParts.channel,
					messageParts.action,
					messageParts.reserve,
				], 9);

                break;

			case 2:

				//Gesture
                messageParts.gesture = constructMessage.constructGesture(options.gesture);

                //Value
                messageParts.value = public.int2Buffer(options.value,1);

                //Assembly
                requireData.payload = Buffer.concat([
                    messageParts.command,
                    messageParts.type,
                    messageParts.gesture,
                    options.meshID,
                    messageParts.channel,
                    messageParts.action,
                    messageParts.value
                ], 9);

                break;

        }
        var message = constructMessage.constructMessage(requireData);
        return message;


    },
    consructSIDPLED: function(protocolType,messageID,meshID,type,options){

        var requireData = {
            protocolType: protocolType,
            isRequest	: typeof messageID != "object",
            messageID	: messageID,
            meshID		: meshID,

        };
        var messageParts = {};
        var unit = 10;

        //Command
        messageParts.command = new Buffer([0x09]);

        //Type
        messageParts.mode = constructMessage.constructChannel(type,options.display);

        //Colors
        if(!options.colors)  options.colors = [];
        var colorString = "";
        for (index in options.colors){
            colorString += options.colors[index];
        }
        messageParts.colors = new Buffer(colorString, 'hex');

        switch(type){

            case 1:

                messageParts.density = public.int2Buffer(parseInt(options.density), 1);
                messageParts.speed = public.int2Buffer(parseInt(options.speed), 1);

                //Assembly
                requireData.payload = Buffer.concat([
                    messageParts.command,
                    messageParts.mode,
                    messageParts.density,
                    messageParts.speed,
                    messageParts.colors,
                ], options.colors.length * 3 + 4);

                break;

            case 2:

                messageParts.in = public.int2Buffer(parseInt(options.in) / unit, 1);
                messageParts.duration = public.int2Buffer(parseInt(options.duration) / unit, 1);
                messageParts.out = public.int2Buffer(parseInt(options.out) / unit, 1);
                messageParts.blank = public.int2Buffer(parseInt(options.blank) / unit, 1);

                //Assembly
                requireData.payload = Buffer.concat([
                    messageParts.command,
                    messageParts.mode,
                    messageParts.in,
                    messageParts.duration,
                    messageParts.out,
                    messageParts.blank,
                    messageParts.colors,
                ], options.colors.length * 3 + 6);

                break;

            case 3:

                messageParts.in = public.int2Buffer(parseInt(options.in) / unit, 1);
                messageParts.duration = public.int2Buffer(parseInt(options.duration) / unit, 1);

                //Assembly
                requireData.payload = Buffer.concat([
                    messageParts.command,
                    messageParts.mode,
                    messageParts.in,
                    messageParts.duration,
                    messageParts.colors,
                ], options.colors.length * 3 + 4);

                break;

            default:

                //Assembly
                requireData.payload = Buffer.concat([
                    messageParts.command,
                    messageParts.mode
                ], 2);

                break;
        }

        var message = constructMessage.constructMessage(requireData);
        return message;
    },




};

var protocolSelected = "SICP";
/*
module.exports.consructSIDPReceipt(protocolSelected,false,new Buffer([0x82, 0x0D]),3);
module.exports.consructSIDPCMD(protocolSelected,false,new Buffer([0x82, 0x0D]),1,{
    sensors:["30","32"]
});
module.exports.consructSIDPCMD(protocolSelected,false,new Buffer([0x82, 0x0D]),2);
module.exports.consructSIDPCMD(protocolSelected,false,new Buffer([0x82, 0x0D]),3,{
    moduleID:9
});
module.exports.consructSIDPAction(protocolSelected,false,new Buffer([0x82, 0x0D]),"DM1",{
    moduleID:9,
    channel:"1001",
    value:80,
    time:3000
});
module.exports.consructSIDPAction(protocolSelected,false,new Buffer([0x82, 0x0D]),"WP",{
    moduleID:15,
    channel:"0011",
    value:1
});
module.exports.consructSIDPAction(protocolSelected,false,new Buffer([0x82, 0x0D]),"DMM",{
    moduleID:[9,15],
    channel:["1001","0011"],
    value:80,
    time:3000
});
module.exports.consructSIDPAlarm(protocolSelected,false,new Buffer([0x82, 0x0D]),1);
module.exports.consructSIDPBLE(protocolSelected,false,new Buffer([0x82, 0x0D]),1);
module.exports.consructSIDPConfig(protocolSelected,false,new Buffer([0x82, 0x0D]),1,{
    pad         : 1,
    meshID      : new Buffer([0x82, 0x0D]),
    moduleID    : 9,
    channel     : "0011",
    action      : "DM1",
});

module.exports.consructSIDPConfig(protocolSelected,false,new Buffer([0x82, 0x0D]),2,{
    gesture     : "343",
    meshID      : new Buffer([0x82, 0x0D]),
    moduleID    : 4,
    channel     : "0110",
    action      : "DM1",
    value       : 80
});

module.exports.consructSIDPLED(protocolSelected,false,new Buffer([0x82, 0x0D]),1,{
    display     : "1111",
    speed       : 4,
    density     : 3,
    colors      : ["FF00FF","A7D099"]
});
module.exports.consructSIDPLED(protocolSelected,false,new Buffer([0x82, 0x0D]),2,{
    display     : "1111",
    in          : 200,
    out         : 200,
    duration    : 300,
    blank       : 100,
    colors      : ["FF00FF","A7D099"]
});
module.exports.consructSIDPLED(protocolSelected,false,new Buffer([0x82, 0x0D]),3,{
    display     : "1111",
    in          : 200,
    duration    : 200,
    colors      : ["FF00FF","A7D099"]
});
module.exports.consructSIDPLED(protocolSelected,false,new Buffer([0x82, 0x0D]),4,{
    display     : "1111",
});
*/