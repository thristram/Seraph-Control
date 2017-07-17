/**
 * Created by fangchenli on 7/11/17.
 */

var public = require("./public.js");
var constructMessage = require ("./constructMessage.js")
var TCPClient = require ("./TCPClient.js");
var SSPBObjects = require("./SSP-B_Object.js");
var AES = require("./AES.js")

/************************************/

        //SSP-B API//

/************************************/

module.exports = {
    /**
     *
     * @param SSDevice
     * @param APIQuery
     */

    spbActionPerform: function(SSDevice,APIQuery){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 3,
            Topic 		: "/actions/perform",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        var commands = SSPBObjects.strategyExecutionObject();
        var payload = {
            qos 		: 2 + commands.length,
            cmd 		: commands
        }
        data.payload = JSON.stringify(payload);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        recordExpressRequestData(data,APIQuery);
        return data;
    },

    /**
     *
     * @param SSDevice
     * @param APIQuery
     */

    sspbActionRefresh : function (SSDevice,APIQuery){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/actions/refresh",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        if(APIQuery.query.CH){
            data.Topic = data.Topic + "/CH/" + APIQuery.query.CH
        }
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        recordExpressRequestData(data,APIQuery);
        return data;
    },

    /**
     *
     * @param SSDevice
     * @param APIQuery
     */
    sspbActionBacklight: function(SSDevice,APIQuery){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/actions/backlight",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        var payload = {};
        //public.eventLog(APIQuery.query)

        switch (parseInt(APIQuery.query.mode)){
            case 1:
                payload.type = parseInt(APIQuery.query.mode);
                payload.colors = APIQuery.query.colors.split(",");
                payload.density = APIQuery.query.density;
                payload.speed = APIQuery.query.speed;
                payload.display = parseInt(APIQuery.query.display);
                break;
            case 2:
                payload.type = parseInt(APIQuery.query.mode);
                payload.colors = APIQuery.query.colors.split(",");
                payload.time = {
                    "in"      : parseInt(APIQuery.query.timeIn),
                    "duration": parseInt(APIQuery.query.timeDuration),
                    "out"     : parseInt(APIQuery.query.timeOut),
                    "blank"   : parseInt(APIQuery.query.timeBlank),
                }
                payload.display = parseInt(APIQuery.query.display);
                break;
            case 3:
                payload.type = parseInt(APIQuery.query.mode);
                payload.colors = APIQuery.query.colors.split(",");
                payload.time = {
                    "in"      : parseInt(APIQuery.query.timeIn),
                    "duration": parseInt(APIQuery.query.timeDuration),
                }
                payload.display = parseInt(APIQuery.query.display);
                break;
            case 4:
                payload.type = parseInt(APIQuery.query.mode);
                break;
            case 5:
                payload.type = parseInt(APIQuery.query.mode);
                break;
            default:
                break;
        }
        data.payload = JSON.stringify(payload);
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        recordExpressRequestData(data,APIQuery);
        return data;
    },

    /**
     *
     * @param SSDevice
     * @param APIQuery
     */
    sspbDataSync: function(SSDevice,APIQuery){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/data/sync",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        if(APIQuery.query.SEPID){
            data.Topic = data.Topic + "/SEPID/" + APIQuery.query.SEPID;
        }
        if(APIQuery.query.CH){
            data.Topic = data.Topic + "/CH/" + APIQuery.query.CH
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        recordExpressRequestData(data,APIQuery);
        return data;
    },

    /**
     * SSP Data Recent
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */


    sspbDataRecent: function(SSDevice,APIQuery){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/data/recent",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        if(APIQuery.query.SEPID){
            data.Topic = data.Topic + "/SEPID/" + APIQuery.query.SEPID;
        }
        if(APIQuery.query.CH){
            data.Topic = data.Topic + "/CH/" + APIQuery.query.CH;
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
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
            MessageType : 2,
            Topic 		: "/data/ir",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: JSON.stringify(SEPID)
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
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
            MessageType : 2,
            Topic 		: "/config/ss",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        return data;

    },

    sspbConfigssPost: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 3,
            Topic 		: "/config/ss",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }
        SSPBObjects.SSConfigObject(function(conf){
            data.payload = JSON.stringify(conf);
            var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
            TCPClient.TCPSocketWrite(SSDevice,msg);

        });
        return data;
    },

    /**
     * Config Strategy HTSP
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */

    sspbConfigStrategyHTSPGet: function(SSDevice,APIQuery){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/config/strategy/htsp",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        if(APIQuery.query.STID){
            data.Topic = data.Topic + "/STID/" + APIQuery.query.STID
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        return data;

    },

    sspbConfigStrategyHTSPPost: function(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 3,
            Topic 		: "/config/strategy/htsp",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }


        var payload = {
            cond 		: SSPBObjects.strategyConditionObject(),
            cmd 		: SSPBObjects.strategyExecutionObject()
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        return data;
    },

    sspbConfigST: function (SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 3,
            Topic 		: "/config/st",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        var managedSS = SSDevice.deviceID;
        SSPBObjects.configSTObject(managedSS,function(SQLData){
            data.payload = JSON.stringify(SQLData);
            var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
            TCPClient.TCPSocketWrite(SSDevice,msg);

        })
        return data;

    },

    /**
     * Device Status
     * @param APIQuery
     * @returns {{isRequest: boolean, QoS: number, QosNeeded: number, dup: number, MessageType: number, Topic: string, MessageID: *, MessageIDextended: number, payload: string}}
     */


    sspbDeviceStatus: function(SSDevice,APIQuery){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 2,
            Topic 		: "/device/status",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        if(APIQuery.query.SEPID){
            data.Topic = data.Topic + "/SEPID/" + APIQuery.query.SEPID
        }
        if(APIQuery.query.CH){
            data.Topic = data.Topic + "/CH/" + APIQuery.query.CH
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
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
            MessageType : 2,
            Topic 		: "/device/list",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        return data;
    },

    sspbDeviceListPost: function sspbDeviceListPost(SSDevice){
        var data = {
            isRequest 	: true,
            QoS 		: 2,
            QosNeeded	: 1,
            dup 		: 0,
            MessageType : 3,
            Topic 		: "/device/list",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        var managedSS = SSDevice.deviceID;

        SSPBObjects.deviceListObject(managedSS,function(SQLData){
            data.payload = JSON.stringify(SQLData);
            var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
            TCPClient.TCPSocketWrite(SSDevice,msg);
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
            MessageType : 2,
            Topic 		: "/qe/sepid/" + sepid + "/action/" + action,
            MessageIDextended   : 0,
            payload 	: ""
        };
        var command = options;

        /*
        for (var key in options){
            data.Topic += "/" + key + "/" + options[key];
        }
        */
        data.Topic = "/qe/sepid/" + sepid + "/MD/" + options.MD + "/CH/" + options.CH + "/action/" + action + "/topos/" + options.topos,


        command["action"] = action;
        command["sepid"] = sepid;


        command["data"] = data;
        command["hash"] = AES.md5(JSON.stringify(data));
        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,public.generateMessageID(),data.MessageIDextended,data.payload,SSDevice);
        TCPClient.TCPSocketWrite(SSDevice,msg,"QE",command);
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
            MessageType : 2,
            Topic 		: "/alarm",
            MessageID   : public.generateMessageID(),
            MessageIDextended   : 0,
            payload 	: ""
        }

        var msg = constructMessage.constructMessage(data.isRequest,data.QoS,data.dup,data.MessageType,data.Topic,data.MessageID,data.MessageIDextended,data.payload,SSDevice)
        TCPClient.TCPSocketWrite(SSDevice,msg);
        return data;
    },


}


function recordExpressRequestData(data,APIQuery){
    var sqlData = {
        messageID 		: data.MessageID,
        action 			: APIQuery.action,
        parameter 		: JSON.stringify(APIQuery.query),
        requestedURI 	: data.Topic,
        method 			: APIQuery.method,
        timestamp 		: public.timestamp(),
        qos 			: data.QosNeeded
    };
    SQLAction.SQLAdd("commands",sqlData);
}


