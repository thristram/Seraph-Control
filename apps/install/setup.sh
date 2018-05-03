#!/bin/sh


if [ -f /etc/debian_version ]; then
    pkgmgr="apt-get"
elif [ -f /etc/redhat-release ]; then
    pkgmgr="yum"
elif [ -f /etc/banner ]; then
    pkgmgr="opkg"
elif [ -f /etc/arch-release ]; then
    pkgmgr="pacman"
elif [ -f /etc/gentoo-release ]; then
    pkgmgr="emerge"
elif [ -f /etc/SuSE-release ]; then
    pkgmgr="zypp"
else
   pkgmgr="brew"
fi
echo "";
echo "Initializing Installer.....";
echo "";
echo "---------------------------------------------------------------------------------------------------------------------------"
echo "";


program="unzip"
condition=$(which $program 2>/dev/null | grep -v "not found" | wc -l)
if [ $condition -eq 0 ] ; then
    eval "sudo $pkgmgr install unzip"

fi





if [ -d "/opt" ]; then
    echo "";
else
    cd /
    echo "Creating Dictionary /opt.....";
    sudo mkdir opt;
fi

cd /opt

if [ -d "/opt/seraph_esh" ]; then
    echo "";
else
    echo "Creating Dictionary /seraph_esh.....";
    sudo mkdir seraph_esh;
    cd seraph_esh
    sudo mkdir update;
    sudo mkdir apps;
fi
sudo chmod -R 777 /opt/seraph_esh

sudo chmod 777 /opt/seraph_esh/apps/install/update.sh
/opt/seraph_esh/apps/install/configurate.sh




cd /opt/seraph_esh/apps/install


#Displaying the Logo
echo "";
echo "";
input="/opt/seraph_esh/apps/install/logo.txt"
currentDictionary=$(pwd)
while IFS= read -r var
do
  echo "$var"
done < "$input"

echo "";


sudo chmod 777 /opt/seraph_esh/apps/install/configurate.sh
/opt/seraph_esh/apps/install/configurate.sh
sudo chmod 777 /opt/seraph_esh/apps/install/software.sh
/opt/seraph_esh/apps/install/software.sh
sudo chmod 777 /opt/seraph_esh/apps/install/dependency.sh
/opt/seraph_esh/apps/install/dependency.sh
sudo chmod 777 /opt/seraph_esh/apps/install/additionalUpdate.sh
/opt/seraph_esh/apps/install/additionalUpdate.sh
sudo chmod 777 /opt/seraph_esh/apps/install/appConfig.sh
/opt/seraph_esh/apps/install/appConfig.sh


echo "---------------------------------------------------------------------------------------------------------------------------"
echo "";
echo "Seraph Update Complete! Software Dictoinary is /opt/seraph_esh";
echo "";
#echo "run 'node /opt/seraph_esh/apps/Lib/TCPClient.js' to start!";
#echo "";
#echo "";

cd /opt/seraph_esh/apps
#node /opt/seraph_esh/apps/TCPClient.js

