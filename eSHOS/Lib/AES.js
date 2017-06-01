/**
 * Created by Thristram on 2/16/17.
 */

var crypto = require('crypto');
var public = require("./public.js");


var IDPublicKey = ">ff?gQ=d=~585E{";
var msgPublicKey = '77]"9u0tdbsWAXf';




module.exports = {
    md5: function(data){
        var md5 = crypto.createHash('md5').update(data).digest("hex");
        return md5;

    },
    md5Buffer: function(data){
        var md5Buf = new Buffer(this.md5(data), "hex");
        //console.log(md5Buf);
        return md5Buf;
    },
    genIDKey: function(mac,ifText){
        mac = this.formatMacAddress(mac);
        var tempIDKey = this.md5(mac + IDPublicKey).substring(8,23);
        var IDKey = this.md5(tempIDKey + mac).toUpperCase();
        var IDKeyBuf = new Buffer(IDKey, "hex");
        public.eventLog("ID Key:           " + public.bufferString(IDKeyBuf),"Keys");
        if(ifText){
            return IDKey;
        }   else    {
            return IDKeyBuf;
        }
    },
    genMsgKey: function(mac,ifText){
        mac = this.formatMacAddress(mac);
        var tempMsgKey = this.md5(mac + msgPublicKey).substring(3,20);
        var msgKey = this.md5(tempMsgKey + mac).toUpperCase();
        var msgKeyBuf = new Buffer(msgKey, "hex");
        public.eventLog("Message Key:      " + public.bufferString(msgKeyBuf),"Keys");
        if(ifText){
            return msgKey;
        }   else    {
            return msgKeyBuf;
        }

    },
    encrypt: function(text,key,iv){

        public.eventLog("ORG Data           " + public.bufferString(new Buffer(text, "ascii")),"AES");
        var clearEncoding = 'ascii';
        var cipherEncoding = 'hex';
        var cipherChunks = [];
        var aesKey,aesIv;
        if(typeof key === "string"){
            aesKey = this.md5Buffer(key);
            if(!iv){
                aesIv = aesKey;
            }   else    {
                aesIv = this.md5Buffer(iv);
            }
        }   else    {
            aesKey = key;
            if(!iv) aesIv = aesKey;

        }
        public.eventLog("AES Key:          " + public.bufferString(aesKey),"Keys");

        var aesCipher = crypto.createCipheriv("aes-128-cbc", aesKey, aesIv);
        aesCipher.setAutoPadding(true);


        cipherChunks.push(aesCipher.update(text, clearEncoding, cipherEncoding));
        cipherChunks.push(aesCipher.final(cipherEncoding));

        encrypted =  new Buffer(cipherChunks.join(''), "hex")





        public.eventLog("Encryped:          " + public.bufferString(encrypted),"AES");
        return encrypted;


    },
    decrypt: function(text,key,iv){

        var clearEncoding = 'ascii';
        var cipherEncoding = 'hex'
        var cipherChunks = [];
        var aesKey,aesIv;

        if(typeof key === "string"){
            aesKey = this.md5Buffer(key);
            if(!iv){
                aesIv = aesKey;
            }   else    {
                aesIv = this.md5Buffer(iv);
            }
        }   else    {
            aesKey = key;
            if(!iv) aesIv = aesKey;

        }

        var aesCipher = crypto.createDecipheriv("aes-128-cbc", aesKey, aesIv);
        aesCipher.setAutoPadding(true);

        cipherChunks.push(aesCipher.update(text, cipherEncoding, clearEncoding));
        cipherChunks.push(aesCipher.final(clearEncoding));

        decrypted = cipherChunks.join('');



        public.eventLog("Decryped:          " + public.bufferString(decrypted),"AES");
        public.eventLog("Decryped Text:     " + decrypted.toString("ascii"),"AES");
    },

    formatMacAddress: function(mac){
        var macArray = [],macOutput;
        mac = mac.replace(/ /g,'');
        if(mac.indexOf(":") > 0){
            macOutput = mac
        }   else if(mac.indexOf(".") > 0){
            macOutput = mac.split(".").join(":");
        }   else    {
            for (var i = 0; i < 12; i=i+2) {
                macArray.push(mac[i] + mac[i+1]);
                macOutput = macArray.join(":");
            }
        }
        macOutput = macOutput.toUpperCase();

        public.eventLog("MAC Address: " + macOutput,"Secured Smart Connect");
        return macOutput;
    }



}
