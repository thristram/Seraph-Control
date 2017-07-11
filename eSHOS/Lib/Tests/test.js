/**
 * Created by Thristram on 2/17/17.
 */
var AES =  require ("../AES.js");
var UDP = require("../UDP.js");
var SQLAction =  require ("../SQLAction.js");


//var enc = AES.encrypt("ackapp123","ackapp123");
//var dec = AES.decrypt(enc,"ackapp123");



/*

var IDKey = AES.genIDKey("39:10:9f:e4:ca:13");
var msgKey = AES.genMsgKey("39:10:9f:e4:ca:13");
var msgKeyArray = UDP.dataToArray("holyshit");
var arr = UDP.constructSSCMessage("holyshit","1234qwer","39:10:9f:e4:ca:13");
UDP.constructSSCPacket(arr)
*/
UDP.smartConnectSecure("holyshit","1234qwer","39:10:9f:e4:ca:13")