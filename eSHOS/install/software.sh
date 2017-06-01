#!/bin/bash

#Install NodeJS
vercomp () {
    if [[ $1 == $2 ]]
    then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    # fill empty fields in ver1 with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++))
    do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++))
    do
        if [[ -z ${ver2[i]} ]]
        then
            # fill empty fields in ver2 with zeros
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]}))
        then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]}))
        then
            return 2
        fi
    done
    return 0
}
installNode () {
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -;
	sudo apt-get install -y nodejs;
	sudo apt-get install -y build-essential;
}


program="nodejs"
condition=$(which $program 2>/dev/null | grep -v "not found" | wc -l)
if [ $condition -eq 0 ] ; then



    read -p "Node.js NOT installed! Do you wish to install Node.js [y/n]?  " yn
    case $yn in
        [Yy]* )
			echo "Setting up Node.js.....";
			installNode
			break;;
        [Nn]* )
            echo "Exiting Node.js installation.....";
            echo "Moving Forward.....";

            break;;
        * ) echo "Please answer yes or no.";;
    esac


fi
nodeVersion=$(node -v)
requiredVersion="0.12.5"


vercomp ${nodeVersion/v/""} $requiredVersion
result=$?

if [ $result -eq 2 ] ; then
    echo "Node.js version too low, current version is $nodeVersion, required version is v$requiredVersion. proceeding update..."
    installNode
fi



echo "";
echo "---------------------------------------------------------------------------------------------------------------------------"
echo "";

