/**
 * Created by fangchenli on 7/11/17.
 */


var public = require("./public.js");
var TCPClient = require ("./TCPClient.js");
var constructSICPMessage = require("./Construct/constructSICPMessage.js");


/************************************/

        //SICP Methods//

/************************************/

module.exports = {
    SICPHeartBeat: function(){
        var msg = constructSICPMessage.constructSICPHeartBeats();
        for (SSDevice in TCPClient.TCPClients){
            public.eventLog("Network Status Sent: " + public.bufferString(msg),"SICP Network Status")
            TCPClient.TCPSocketWrite(TCPClient.TCPClients[SSDevice],msg);
        }
    }
}
