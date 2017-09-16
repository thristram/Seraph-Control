/************************************/

		  //WEB ACTION//

/************************************/

var config = require("../../config.js");
var http = require('http');

//"use strict";
var os = require('os');

//////////////////////////////////////
		//REQUIRE MODULE//
//////////////////////////////////////

var public = require("./public.js");
var CoreData = require("./CoreData.js");


module.exports = {

//////////////////////////////////////
		 //CONTENT START//
//////////////////////////////////////
refreshAll: function(callback){
    var url = 'http://ha.applicationclick.com/index.php/seraph/eshGetLocalWeather';

    http.get(url, function(res){
        var body = '';

        res.on('data', function(chunk){
            body += chunk;
        });

        res.on('end', function(){
            var SCSResponse = JSON.parse(body);
            var configToSet = {
                "WORLD_WEATHER_HM" 				: SCSResponse.weather.atmosphere.HM,
            	"WORLD_WEATHER_PR" 				: SCSResponse.weather.atmosphere.PR,
            	"WORLD_WEATHER_visibility" 		: SCSResponse.weather.atmosphere.visibility,
				"WORLD_WEATHER_sunrise"	 		: SCSResponse.weather.astronomy.sunrise,
            	"WORLD_WEATHER_sunset" 			: SCSResponse.weather.astronomy.sunset,
            	"WORLD_WEATHER_code" 			: SCSResponse.weather.condition.code,
				"WORLD_WEATHER_TP" 				: SCSResponse.weather.condition.TP,
            	"WORLD_WEATHER_AQ_index" 		: SCSResponse.weather.airquality.index,
            	"WORLD_LOCATION_CITY" 			: SCSResponse.location.city,
            	"WORLD_LOCATION_COUNTRY" 		: SCSResponse.location.country,
				"WORLD_LOCATION_REGION" 		: SCSResponse.location.region
            };
            CoreData.Seraph.setGeographicInfos(configToSet);

        });
    }).on('error', function(e){
        console.log("Got an error: ", e);
    });
},


getIP : function(callback){

	return CoreData.Seraph.sysConfigs.ESH_CONFIG_PUBLIC_IP;
},

getSSConfig : function(){
    var config = {
        system 		: {
            HPST  		: parseInt(CoreData.Seraph.sysConfigs.SS_CONFIG_HPST),
            REFR  		: parseInt(CoreData.Seraph.sysConfigs.SS_CONFIG_REFR),
        },
        wifi 		: {
            ssid 		: CoreData.Seraph.sysConfigs.ROUTER_SSID,
            passwd 		: CoreData.Seraph.sysConfigs.ROUTER_PASSWORD
        }
    }
	return config;
},

getWeatherLocation : function(){
    var loc = {
        city 		: CoreData.Seraph.geographicInfos.WORLD_LOCATION_CITY,
        country 	: CoreData.Seraph.geographicInfos.WORLD_LOCATION_COUNTRY,
        region 		: CoreData.Seraph.geographicInfos.WORLD_LOCATION_REGION
    };

    var weather = {
        astronomy 	: {
            sunrise 	: CoreData.Seraph.geographicInfos.WORLD_WEATHER_sunrise,
            sunset 		: CoreData.Seraph.geographicInfos.WORLD_WEATHER_sunset
        },
        atmosphere 	: {
            HM 			: CoreData.Seraph.geographicInfos.WORLD_WEATHER_HM,
            PR 			: CoreData.Seraph.geographicInfos.WORLD_WEATHER_PR,
            visibility 	: CoreData.Seraph.geographicInfos.WORLD_WEATHER_visibility,
        },
        condition 	: {
            code 		: CoreData.Seraph.geographicInfos.WORLD_WEATHER_code,
            TP 			: CoreData.Seraph.geographicInfos.WORLD_WEATHER_TP,
        },
        airquality 	: {
            index 		: CoreData.Seraph.geographicInfos.WORLD_WEATHER_AQ_index,
        },
    };

    var weatherLoc = {
        location 	: loc,
        weather 	: weather
    }
    //console.log(weatherLoc);
    return weatherLoc;
},
getLocalIP: function (callback){

    var ifaces = os.networkInterfaces();

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                //console.log(ifname + ':' + alias, iface.address);
                CoreData.Seraph.setSysConfig("ESH_CONFIG_LOCAL_IP", iface.address);
                callback(iface.address);
            } else {
                // this interface has only one ipv4 adress
                //console.log(ifname, iface.address);
                CoreData.Seraph.setSysConfig("ESH_CONFIG_LOCAL_IP", iface.address);
                callback(iface.address);
            }
            ++alias;
        });
    });


}



};