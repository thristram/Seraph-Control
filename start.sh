#!/bin/sh

cd /opt/seraph_esh/apps/Lib
#DEBUG=ConstuctMessage,ReceivedMessage,SeraphUpdate,TCPClient,SIAP,RemoteCommand
pm2 start /opt/seraph_esh/seraph.json