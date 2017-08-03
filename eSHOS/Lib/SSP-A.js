/**
 * Created by Thristram on 12/10/16.
 */

var url = require('url');


var SSPB_APIs = require("./SSP-B.js");
var config = require("../../config.js");
var public = require("./public.js");
var TCPClient = require ("./TCPClient.js");

/************************************/

            //SSP-A API//

/************************************/

module.exports = {
    /**
     * Action Perform
     */
    sspaGetActionsPerform: function (req, res) {

        req.rootRoute = "actions/perform";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbActionPerform(TCPClient.TCPClients[SSDevice]);
        })
        res.end("");


    },

    /**
     * Action Refresh
     */
    sspaGetActionsRefresh: function (req, res) {

        req.rootRoute = "actions/refresh";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbActionRefresh(TCPClient.TCPClients[SSDevice],channel);
        });
        res.end('')
    },

    /**
     * Action Backlight
     */
    sspaGetActionsBacklight: function (req, res) {

        req.rootRoute = "actions/backlight";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var mode = APIQuery.query.mode;
            var options = {};
            if(APIQuery.query.colors){
                options["colors"] = APIQuery.query.colors.split(",");
            }
            if(APIQuery.query.density){
                options["density"] = APIQuery.query.density;
            }
            if(APIQuery.query.speed){
                options["speed"] = APIQuery.query.speed;
            }
            if(APIQuery.query.display){
                options["display"] = parseInt(APIQuery.query.display)
            }
            if(APIQuery.query.timeIn){
                options["timeIn"] = parseInt(APIQuery.query.timeIn)
            }
            if(APIQuery.query.timeOut){
                options["timeOut"] = parseInt(APIQuery.query.timeOut)
            }
            if(APIQuery.query.timeDuration){
                options["timeDuration"] = parseInt(APIQuery.query.timeDuration)
            }
            if(APIQuery.query.timeBlank){
                options["timeBlank"] = parseInt(APIQuery.query.timeBlank)
            }
            SSPB_APIs.sspbActionBacklight(TCPClient.TCPClients[SSDevice], mode, options);
        })
        res.end('')
    },

    /**
     * Data Sync
     */
    sspaGetDataSync: function (req, res) {

        req.rootRoute = "data/sync";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDataSync(TCPClient.TCPClients[SSDevice], sepid, channel);
        })
        res.end('')
    },

    /**
     * Data Recent
     */
    sspaGetDataRecent: function (req, res) {

        req.rootRoute = "data/recent";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDataRecent(TCPClient.TCPClients[SSDevice], sepid, channel);
        })
        res.end('')
    },


    /**
     * Data IR
     */
    sspaGetDataIr: function(req, res) {

        req.rootRoute = "data/ir";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {

            SSPB_APIs.sspbDataIR(TCPClient.TCPClients[SSDevice]);
        })
        res.end('')
    },


    /**
     * Config SS
     */
    sspaGetConfigSS: function(req, res) {

        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbConfigssGet(TCPClient.TCPClients[SSDevice]);
        })
        res.end('')

    },

    sspaPostConfigSS: function (req, res) {
        req.rootRoute = "config/ss";
        var APIQuery = parseExpressURI(req);

        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbConfigssPost(TCPClient.TCPClients[SSDevice]);
        })
        res.end('')
    },


    /**
     * Config SS
     */

    sspaGetConfigStrategy: function(req, res) {

        req.rootRoute = "/config/strategy/htsp";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var stid = APIQuery.query.STID;
            SSPB_APIs.sspbConfigStrategyHTSPGet(TCPClient.TCPClients[SSDevice], stid);
        })
        res.end('')

    },

    sspaPostConfigStrategy: function(req, res) {
        req.rootRoute = "/config/strategy/htsp";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbConfigStrategyHTSPPost(TCPClient.TCPClients[SSDevice]);
        })

        res.end('')
    },


    /**
     * Device Status
     */

    sspaGetDeviceStatus: function(req, res) {

        req.rootRoute = "/device/status";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            var sepid = APIQuery.query.SEPID;
            var channel = APIQuery.query.CH;
            SSPB_APIs.sspbDeviceStatus(TCPClient.TCPClients[SSDevice], sepid, channel);
        })

        res.end('')

    },


    /**
     * Device List
     */

    sspaGetDeviceList: function(req, res) {

        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbDeviceListGet(TCPClient.TCPClients[SSDevice]);
        })

        res.end('')

    },

    sspaPostDeviceList: function(req, res) {
        req.rootRoute = "/device/list";
        var APIQuery = parseExpressURI(req);
        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbDeviceListPost(TCPClient.TCPClients[SSDevice]);
        })

        res.end('')
    },


    /**
     * Quick Event
     */

    sspaGetQE: function (req, res) {

        req.rootRoute = "/qe";
        var APIQuery = parseExpressURI(req);
        var data = {}
        switch(APIQuery.action){
            case "DM":
            case "WP":
                data["CH"] = APIQuery.query.CH;
                data["topos"] = APIQuery.query.TOPOS;
                break;
            case "UR":
                if(APIQuery.query.hasOwnProperty("type")){
                    data["type"] = APIQuery.query.type;
                }
                if(APIQuery.query.hasOwnProperty("code")){
                    data["code"] = APIQuery.query.code;
                }
                if(APIQuery.query.hasOwnProperty("raw")){
                    data["raw"] = APIQuery.query.raw;
                }
                if(APIQuery.query.hasOwnProperty("address")){
                    data["address"] = APIQuery.query.address;
                }
                if(APIQuery.query.hasOwnProperty("other")){
                    data["other"] = APIQuery.query.other;
                }
                break;
            default:
                break;

        }

        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbQE(TCPClient.TCPClients[SSDevice], APIQuery.query.action, APIQuery.query.SEPID, data);
        })

        res.end('')

    },

    /**
     * Alarm
     */

    sspaGetAlarm: function (req, res) {

        req.rootRoute = "/alarm";
        var APIQuery = parseExpressURI(req);

        APIQuery.device.forEach(function (SSDevice) {
            SSPB_APIs.sspbAlarm(TCPClient.TCPClients[SSDevice]);
        })


        res.end('')

    }

}





/************************************/

        //SSP-A API Function//

/************************************/


var parseExpressURI = function(request){
    var query;
    if(request.method == "GET") {
        query = url.parse(request.url, true).query;
    }	else if(request.method == "POST") {

        query = request.body;
    }

    if(!query.protocolType) query.protocolType = "SSP-A";
    if(!query.ssuid) query.ssuid = "";
    var APIQuery = {
        action 			: request.rootRoute,
        query 			: query,
        paramURL 		: request.url,
        method 			: request.method,
        device			: query.ssuid.split(","),
        protocolType    : query.protocolType
    };
    public.eventTitle("REQUEST RECEIVED",1,APIQuery.protocolType + " Request");



    public.dataLog(APIQuery,"SSP-A Request")

    if(APIQuery.device[0] == ''){
        APIQuery.device = [];
        public.eventTitle("NO DEVICE SELECTED",2,APIQuery.protocolType + " Request",true);

    }

    return APIQuery;
}

module.exports.parseExpressURI = parseExpressURI;


