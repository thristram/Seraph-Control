/**
 * Created by fangchenli on 7/11/17.
 */

var public = require("./public.js");
var constructMessage = require ("./constructMessage.js")
var TCPClient = require ("./TCPClient.js");
var SSPBObjects = require("./SSP-B_Object.js");
var AES = require("./AES.js");
var SQLAction =  require ("./SQLAction.js");
var debug = require('debug')('SSP-B');

/************************************/

        //SSP-B API//

/************************************/

module.exports = {
    /**
     *
     * @param SSDevice
     * @param APIQuery
     */

    sspbActionPerform: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "POST",
            topicType   : "/actions/perform",
            topicExt    : {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        var commands = SSPBObjects.strategyExecutionObject();
        var payload = {
            qos 		: 2 + commands.length,
            cmd 		: commands
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        data.payload = JSON.stringify(payload);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);

        return data;
    },

    /**
     *
     * @param SSDevice
     * @param APIQuery
     */

    sspbActionRefresh : function (SSDevice,channel){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType   : "/actions/refresh",
            topicExt    : {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        if(channel){
            data.TopicExt["CH"] = channel;
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },

    /**
     *
     * @param SSDevice
     * @param APIQuery
     */
    sspbActionBacklight: function(SSDevice, mode, options){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType   : "/actions/backlight",
            topicExt    : {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        var payload = {};
        //public.eventLog(APIQuery.query)

        switch (parseInt(mode)){
            case 1:
                payload.type = parseInt(mode);
                payload.colors = options.colors;
                payload.density = options.density;
                payload.speed = options.speed;
                payload.display = parseInt(options.display);
                break;
            case 2:
                payload.type = parseInt(mode);
                payload.colors = options.colors;
                payload.time = {
                    "in"      : parseInt(options.timeIn),
                    "duration": parseInt(options.timeDuration),
                    "out"     : parseInt(options.timeOut),
                    "blank"   : parseInt(options.timeBlank),
                }
                payload.display = parseInt(options.display);
                break;
            case 3:
                payload.type = parseInt(mode);
                payload.colors = options.colors;
                payload.time = {
                    "in"      : parseInt(options.timeIn),
                    "duration": parseInt(options.timeDuration),
                }
                payload.display = parseInt(options.display);
                break;
            case 4:
                payload.type = parseInt(mode);
                break;
            case 5:
                payload.type = parseInt(mode);
                break;
            default:
                break;
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        data.payload = JSON.stringify(payload);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },

    /**
     *
     * @param SSDevice
     * @param APIQuery
     */
    sspbDataSync: function(SSDevice, sepid, channel){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType   : "/data/sync",
            topicExt    : {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        if(sepid){
            data.topicExt["SEPID"] = sepid;
        }
        if(channel){
            data.topicExt["CH"] = channel;
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },

    /**
     * SSP Data Recent
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */


    sspbDataRecent: function(SSDevice, sepid, channel){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType   : "/data/recent",
            topicExt    : {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        if(sepid){
            data.topicExt["SEPID"] = sepid;
        }
        if(channel){
            data.topicExt["CH"] = channel;
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },


    /**
     *
     * @param SSDevice
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */

    sspbDataIR: function(SSDevice){

        var SEPID = {"SEPID":SSDevice.deviceID}
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType 	: "/data/ir",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: JSON.stringify(SEPID)
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },

    /**
     *
     * @param SSDevice
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */

    sspbConfigssGet: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType 	: "/config/ss",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;

    },

    sspbConfigssPost: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "POST",
            topicType 	: "/config/ss",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        SSPBObjects.SSConfigObject(function(conf){
            data.Topic = createTopic(data.topicType, data.topicExt);
            data.payload = JSON.stringify(conf);
            var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
            TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);

        });
        return data;
    },

    /**
     * Config Strategy HTSP
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */

    sspbConfigStrategyHTSPGet: function(SSDevice, stid){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType 	: "/config/strategy/htsp",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        };

        if(stid){
            data.topicExt["STID"] = stid;
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;

    },

    sspbConfigStrategyHTSPPost: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "POST",
            topicType 	: "/config/strategy/htsp",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }


        var payload = {
            cond 		: SSPBObjects.strategyConditionObject(),
            cmd 		: SSPBObjects.strategyExecutionObject()
        };
        data.Topic = createTopic(data.topicType, data.topicExt);
        data.payload = JSON.stringify(payload);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },

    sspbConfigST: function (SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "POST",
            topicType 	: "/config/st",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        var managedSS = SSDevice.deviceID;
        SSPBObjects.configSTObject(managedSS,function(SQLData){
            data.Topic = createTopic(data.topicType, data.topicExt);
            data.payload = JSON.stringify(SQLData);
            var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
            TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);

        })
        return data;

    },

    /**
     * Device Status
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */


    sspbDeviceStatus: function(SSDevice, sepid, channel){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType 	: "/device/status",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        if(sepid){
            data.topicExt["SEPID"] = sepid
        }
        if(channel){
            data.topicExt["CH"] = channel
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },

    /**
     * Device List
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */

    sspbDeviceListGet: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType 	: "/device/list",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },

    sspbDeviceListPost: function sspbDeviceListPost(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "POST",
            topicType 	: "/device/list",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        var managedSS = SSDevice.deviceID;

        SSPBObjects.deviceListObject(managedSS,function(SQLData){
            data.Topic = createTopic(data.topicType, data.topicExt);
            data.payload = JSON.stringify(SQLData);
            var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
            TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        });

        return data;


    },

    /**
     * Quick Event
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */

    sspbQE: function(SSDevice, action, sepid, options){

        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType 	: "/qe",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        };
        data.topicExt = {
            "sepid"     : sepid,
            "action"    : action,
        };

        switch(action){
            case "DM":
            case "WP":
            case "DMM":
            case "WPM":
                data.topicExt["MD"] = options.MD;
                data.topicExt["CH"] = options.CH;
                data.topicExt["topos"] = options.topos;
                if(options.hasOwnProperty("duration")){
                    data.topicExt["duration"] = options.duration
                }
                if(options.hasOwnProperty("ease")){
                    data.topicExt["ease"] = options.ease
                }
                break;
            case "UR":
                if(options.hasOwnProperty("type")){
                    data.topicExt["type"] = options.type;
                    data.topicExt["code"] = options.code;
                    if(options.hasOwnProperty("address")){
                        data.topicExt["address"] = options.address;
                    }
                    if(options.hasOwnProperty("other")){
                        data.topicExt["other"] = options.other
                    }
                }   else if(options.hasOwnProperty("raw")){
                    data.topicExt["raw"] = options.raw;
                }
                break;
            default:
                break;

        }

        data.Topic = createTopic(data.topicType, data.topicExt);
        data.hash = AES.md5(JSON.stringify(data));
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice);
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },



    /**
     * Alarm
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: *, MessageID: *, MessageIDextended: number, payload: string}}
     */


    sspbAlarm: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : "GET",
            topicType 	: "/alarm",
            topicExt 	: {},
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        data.Topic = createTopic(data.topicType, data.topicExt);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice, msg, data.topicType, data);
        return data;
    },


    /************************************/

                //SSP RETURN//

    /************************************/

    constructReturnMessage: function(messgeType,messageID,code,msg,other){
        var data = {
            isRequest 	: false,
            QoS 		: 0,
            QosNeeded	: 0,
            dup 		: 0,
            MessageType : messgeType,
            Topic 		: "",
            MessageID   : messageID,
            MessageIDextended   : 0,
            payload 	: ""
        }
        data.payload = constructStatusMessage(code,msg);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,"SSM00000")

        return msg;
    },




}

var createTopic = function(topicType, topicExt){
    for (var key in topicExt){
        topicType += "/" + key + "/" + topicExt[key];
    }
    return topicType;
}

var recordCommandData = function(data){
    var sqlData = {
        messageID 		: data.MessageID,
        action 			: data.topicType,
        parameter 		: JSON.stringify(data.topicExt),
        requestedURI 	: data.Topic,
        method 			: data.MessageType,
        timestamp 		: public.timestamp(),
        qos 			: data.QosNeeded,
        payload         : data.payload
    };
    SQLAction.SQLAdd("seraph_sspb_command_logs",sqlData);
}





var constructStatusMessage = function(code,msg){
    var message = {
        code 	: code,
        msg 	: msg
    }
    return JSON.stringify(message);
}

module.exports.createTopic = createTopic;
module.exports.recordCommandData = recordCommandData;

