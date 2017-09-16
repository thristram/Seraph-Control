#!/bin/bash
echo "Installing dependencies...."
sudo apt-get install libavahi-compat-libdnssd-dev

cd /opt/seraph_esh
if [ ! -d "/opt/seraph_esh/node_modules/hap-nodejs" ]; then
  npm install hap-nodejs --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/express" ]; then
  npm install express --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/body-parser" ]; then
  npm install body-parser --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/mustache" ]; then
  npm install mustache --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/mustache-express" ]; then
  npm install mustache-express --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/sqlite3" ]; then
  npm install sqlite3 --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/require-uncached" ]; then
  npm install require-uncached --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/request" ]; then
  npm install request --save
fi
if [ ! -d "/opt/seraph_esh/node_modules/debug" ]; then
  npm install debug --save
fi
if [ ! -d "/usr/lib/node_modules/pm2" ]; then
    sudo npm install -g pm2
fi
