/**
 * Created by fangchenli on 7/11/17.
 */


var public = require("./public.js");
var Seraph = require ("./CoreData.js");
var TCPClient = require ("./TCPClient.js");
var constructSICPMessage = require("./Construct/constructSICPMessage.js");


/************************************/

        //SICP Methods//

/************************************/

module.exports = {
    SICPHeartBeat: function(){
        var msg = constructSICPMessage.constructSICPHeartBeats();
        for (let SSDeviceID in Seraph.devices.getDeviceList(["SS"])){
            public.eventLog("Network Status Sent: " + public.bufferString(msg),"SICP Network Status")
            TCPClient.TCPSocketWrite(SSDeviceID,msg);
        }
    }
}
