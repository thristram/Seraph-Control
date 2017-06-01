#!/bin/sh
echo "Configurating eSH Software...."
echo "";
echo "---------------------------------------------------------------------------------------------------------------------------"
echo "";



read -p "Please enter SS's HTTPort (eg. 80)    : " HTTPort


cd /opt/seraph_esh
rm -rf ./config.js
echo "module.exports = { \n
    HTTPort : $HTTPort, \n
    TCPort : 1838,\n
    SSCPort : 9957,\n
    UDPPort : 1888,\n
    SSPushPort : 9509,\n
    versionNumber : 1,\n
    TCPAddress : '127.0.0.1',\n
    UARTConfig : {\n
        device : '/dev/serial0',\n
        bitRate : 115200,\n
    }\n
}" >> config.js
echo "";