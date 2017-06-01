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


var SQLAction =  require ("./SQLAction.js");
var path = require('path');
var SQLite = require('sqlite3').verbose();
var SQLdb = new SQLite.Database(path.join(__dirname.replace("Lib","") + '/db/seraph.sqlite'));
var public = require("./public.js");


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
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_HM 				: SCSResponse.weather.atmosphere.HM });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_PR 				: SCSResponse.weather.atmosphere.PR });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_visibility 		: SCSResponse.weather.atmosphere.visibility });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_sunrise 		: SCSResponse.weather.astronomy.sunrise });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_sunset 			: SCSResponse.weather.astronomy.sunset });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_code 			: SCSResponse.weather.condition.code });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_TP 				: SCSResponse.weather.condition.TP });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_WEATHER_AQ_index 		: SCSResponse.weather.airquality.index });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_LOCATION_CITY 			: SCSResponse.location.city });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_LOCATION_COUNTRY 		: SCSResponse.location.country });
            SQLAction.SQLSetConfig("temp_variable", { WORLD_LOCATION_REGION 		: SCSResponse.location.region });
        });
    }).on('error', function(e){
        console.log("Got an error: ", e);
    });
},


getIP : function(callback){
	var sql = "SELECT * FROM config WHERE name = 'ESH_CONFIG_PUBLIC_IP'";
    public.eventLog(sql , "SQL");
	SQLAction.SQLConnection.all(sql, function(err, res) {

		callback(res[0].value);

	});
},

getSSConfig : function(callback){
	var data = {};
	var qeuryField = ['ROUTER_SSID','ROUTER_PASSWORD','SS_CONFIG_HPST','SS_CONFIG_REFR'];
	var sql = "SELECT * FROM config WHERE name = '" + qeuryField.join("' OR name = '") + "'";
	
	//console.log(sql);

	SQLAction.SQLConnection.all(sql, function(err, res) {
		
		for(var key in res){
			data[res[key].name] = res[key].value;
		}

		var config = {
			system 		: {
				HPST  		: parseInt(data.SS_CONFIG_HPST),
				REFR  		: parseInt(data.SS_CONFIG_REFR),
			},
			wifi 		: {
				ssid 		: data.ROUTER_SSID,
				passwd 		: data.ROUTER_PASSWORD
			}
		}
		console.log(config);
		callback(config);
	});
},

getWeatherLocation : function(callback){
	var location = {};
	var qeuryField = ['WORLD_LOCATION_CITY','WORLD_LOCATION_COUNTRY','WORLD_LOCATION_REGION','WORLD_WEATHER_HM','WORLD_WEATHER_PR','WORLD_WEATHER_visibility','WORLD_WEATHER_sunrise','WORLD_WEATHER_sunset','WORLD_WEATHER_code','WORLD_WEATHER_TP','WORLD_WEATHER_AQ_index'];
	var sql = "SELECT * FROM temp_variable WHERE name = '" + qeuryField.join("' OR name = '") + "'";

	//console.log(sql);

	SQLAction.SQLConnection.all(sql, function(err, res) {

		for(var key in res){
			location[res[key].name] = res[key].value;
		}
		var loc = {
			city 		: location.WORLD_LOCATION_CITY,
			country 	: location.WORLD_LOCATION_COUNTRY,
			region 		: location.WORLD_LOCATION_REGION
		};

		var weather = {
			astronomy 	: {
				sunrise 	: location.WORLD_WEATHER_sunrise,
				sunset 		: location.WORLD_WEATHER_sunset
			},
			atmosphere 	: {
				HM 			: location.WORLD_WEATHER_HM,
				PR 			: location.WORLD_WEATHER_PR,
				visibility 	: location.WORLD_WEATHER_visibility,
			},
			condition 	: { 
				code 		: location.WORLD_WEATHER_code,
			    TP 			: location.WORLD_WEATHER_TP,
			},
			airquality 	: { 
				index 		: location.WORLD_WEATHER_AQ_index,
			},
		};
			
		var weatherLoc = {
			location 	: loc,
			weather 	: weather
		}
		//console.log(weatherLoc);
		callback(weatherLoc);
	});
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
                SQLAction.SQLSetConfig("config", { ESH_CONFIG_LOCAL_IP	    : iface.address });
                callback(iface.address);
            } else {
                // this interface has only one ipv4 adress
                //console.log(ifname, iface.address);
                SQLAction.SQLSetConfig("config", { ESH_CONFIG_LOCAL_IP	    : iface.address });
                callback(iface.address);
            }
            ++alias;
        });
    });


}



};