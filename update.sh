#!/bin/sh

cd /opt/seraph_esh

echo "Checking Software Version......";
echo "";
echo "---------------------------------------------------------------------------------------------------------------------------"
echo "";


versionR=$(curl 'http://seraph.applicationclick.com/eshApi/requestLatestVersion?type=esh')
echo "";
echo "Newest Software Version is: $versionR";
echo "";

versionFile="/opt/seraph_esh/version";


update(){
    if [ -d "/opt/seraph_esh/update" ]; then
        echo "";
    else
        sudo mkdir /opt/seraph_esh/update
        sudo chmod -R 777 /opt/seraph_esh/update
    fi
    cd /opt/seraph_esh/update
    updatePackage="/opt/seraph_esh/update/esh_$versionR.zip";
    if [ -f "$updatePackage" ]; then
        echo "";
    else
        cd /opt/seraph_esh/update
        packageURL="http://seraph.applicationclick.com/eshApi/requestUpdateBinary?type=esh&version=$versionR"
        sudo wget --content-disposition "$packageURL";
    fi

    if [ -d "/opt/seraph_esh/temp" ]; then
        echo "";
    else
        sudo mkdir /opt/seraph_esh/temp
        sudo chmod -R 777 /opt/seraph_esh/temp
    fi
    sudo unzip "esh_$versionR.zip" -d /opt/seraph_esh/temp
    cd /opt/seraph_esh/temp


    updateInstruction="update"
    while IFS='' read -r line || [[ -n "$line" ]]; do


    if [ -d "/opt/seraph_esh/temp/$line" ]; then
        if [ -d "/opt/seraph_esh/$line" ]; then
            sudo rm -rf "/opt/seraph_esh/$line"
        fi
    sudo mkdir "/opt/seraph_esh/$line"
    sudo mv "/opt/seraph_esh/temp/$line" "/opt/seraph_esh/$line/../"
    fi


    if [ -f "/opt/seraph_esh/temp/$line" ]; then
        if [ -f "/opt/seraph_esh/$line" ]; then
            sudo rm -rf "/opt/seraph_esh/$line"
        fi
    sudo mv "/opt/seraph_esh/temp/$line" "/opt/seraph_esh/$line"
        if [ "$line" -eq "seraph" ]; then
            if [ -f "/usr/bin/seraph" ]; then
                sudo rm -rf /usr/bin/seraph
            fi
            sudo cp /opt/seraph_esh/seraph /usr/bin/seraph
        fi
        if [ "$line" -eq "startSeraph.sh" ]; then
            if [ -f "/etc/init.d/startSeraph.sh" ]; then
                sudo rm -rf /etc/init.d/startSeraph.sh
            fi
            sudo cp /opt/seraph_esh/startSeraph.sh /etc/init.d/startSeraph.sh
        fi
    fi



    done < "$updateInstruction"


    sudo chmod -R 777 /opt/seraph_esh
    cd /opt/seraph_esh/apps/install
    sudo rm -rf "/opt/seraph_esh/temp"


    echo "";
    cd /opt/seraph_esh/
    rm -rf version
    echo "$versionR" >> version

#    pm2 restart CoreData
    sudo chmod 777 /opt/seraph_esh/restart.sh
    /opt/seraph_esh/restart.sh

    rm -rf /opt/seraph_esh/update/*




}

cd /opt/seraph_esh
if [ -f "$versionFile" ]; then
    versionNo=$(cat "$versionFile")
    echo "Current eSH Software Version: $versionNo"
    echo "";
    if [ "$versionNo" \<  "$versionR" ]; then
        update
    else
        echo "You have the Latest eSH software....."

    fi


else
	echo "No eSH Software Version Found, Requesting New Software from Seraph Update....."
	update
fi