/************************************/

		  //SQL Action//

/************************************/


var config = require("../../config.js");
var public = require("./public.js");
var debug = require('debug')('SQL');


var path = require('path');
var SQLite = require('sqlite3').verbose();
var SQLdb = new SQLite.Database(path.join(__dirname.replace("Lib","") + '/db/seraph.sqlite'));
SQLdb.on("error", function(error) {
    debug("[%s] SQL Error:" + error, public.getDateTime());
});
//var SQLdb = new SQLite.Database('/Users/fangchenli/Downloads/Seraph-eSH-master/eSHOS/db//db/seraph.sqlite'));

//////////////////////////////////////
              //TEMP//
//////////////////////////////////////


var homeKitIdentifierCache = {}


module.exports = {

//////////////////////////////////////
		 //CONTENT START//
//////////////////////////////////////

    SQLAdd: function (db,sqlData){
        var keys = [],
            values = [],
            sql;
        for (var key in sqlData){
            keys.push(key);
            values.push(sqlData[key]);
        }
        sql = 'INSERT INTO ' + db + "(" + keys.join(",") + ")" + " VALUES ('" + values.join("' , '") + "');";
        SQLdb.run(sql,function(err){
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
            }
        });

        //public.eventLog(sql , "SQL");
    },
    SQLSetInc: function (db,field,where,inc){
        var sql = 'UPDATE ' + db + ' SET ' + field + ' = ' + field + ' + ' + inc + ' ' + this.parseWhere(where);

        SQLdb.run(sql,function(err){
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
            }
        });
        //public.eventLog(sql , "SQL");

    },
    SQLFind: function(db,field,where,callback){
        var sql = "SELECT " + this.parseField(field) + " FROM " +  db  + this.parseWhere(where);
        //public.eventLog(sql , "SQL");
        SQLdb.all(sql, function(err, data) {
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
                callback([]);
            }   else    {
                if(data.length > 0){
                    callback(data[0]);
                }	else	{
                    callback([]);
                }
            }

        })


    },
    SQLGetField: function(db,field,where,callback){
        var sql = "SELECT " + this.parseField(field) + " FROM " +  db  + this.parseWhere(where);

        //public.eventLog(sql , "SQL");
        SQLdb.all(sql, function(err, data) {
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
                callback([]);
            }   else {
                if (data.length > 0) {
                    callback(data[0][field]);
                } else {
                    callback("");
                }
            }
        })
    },
    SQLSetField: function (db,field,where){

        var sql = 'UPDATE ' + db + ' SET ' + this.parseField(field) + this.parseWhere(where);

        SQLdb.run(sql,function(err){
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
            }
        });
    },

    SQLSetConfig: function (db,field){
        var query,where;
        for (var key in field){
            query = field[key];
            where = key;
        }
        var sql = 'UPDATE ' + db + ' SET ' + this.parseField({value:query,timestamp:public.timestamp()}) + this.parseWhere({name:where});

        SQLdb.run(sql,function(err){
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
            }
        });


    },
    SQLDelete: function (db,where){

        var sql = 'DELETE FROM ' + db + this.parseWhere(where);

        SQLdb.run(sql,function(err){
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
            }
        });

    },
    SQLSelect: function(db,field,where,order,callback){

        var sql = "SELECT " + this.parseField(field) + " FROM " +  db  + this.parseWhere(where);

        SQLdb.all(sql, function(err, data) {
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
                callback([]);
            }   else {
                if(data.length > 0){
                    callback(data);
                }	else	{
                    callback([]);
                }
            }

        });


    },
    HomeKitCacheSet: function(key,saved) {
        var value = JSON.stringify(saved);
        homeKitIdentifierCache[key] = value;
        this.SQLFind("seraph_HomeKit_cache", "id", "key = '" + key + "'", function (data) {
            if(data != []){

                module.exports.SQLSetField("seraph_HomeKit_cache", {"key":key,"value":value}, "key = '" + key + "'")
            }   else    {
                module.exports.SQLAdd("seraph_HomeKit_cache", {"key":key, "value":value})
            }
        })
    },
    HomeKitCacheGet: function(key) {
        if(homeKitIdentifierCache.hasOwnProperty(key)){
            return homeKitIdentifierCache[key];
        }   else    {
            return null
        }

    },
    HomeKitCachePreLoad: function() {
        this.SQLSelect("seraph_HomeKit_cache", "*", "","", function (data) {
            if(data != []){
                for(var key in data){
                    homeKitIdentifierCache[data[key].key] = JSON.parse(data[key].value);
                    module.exports.homeKitIdentifierCache = homeKitIdentifierCache;
                }
            }   else    {
                callback(null)
            }
        })
    },

    parseWhere: function(where,separator){
        if(where && where  != "undefined"){
            var SQLWhere = "";
            if(!separator || separator == "undefined"){
                separator = " AND ";
            }

            if(where !== null && typeof where === 'object'){
                var tempWhere = [];
                for (var key in where) {
                    tempWhere.push( key + " = '" + where[key]+ "'");
                }
                SQLWhere = tempWhere.join(separator);
            }	else	{
                SQLWhere = where;
            }
            return " WHERE " + SQLWhere;
        }	else    {
            return "";
        }

    },
    parseField: function(field) {
        if(field == null || field == "undefined" || field == ""){
            return " * ";
        }	else if(Array.isArray(field)) {
            return field.join(" , ");
        }	else if(typeof field === 'object') {
            var SQLField = [];
            for (var key in field){
                SQLField.push(key + "='" + field[key] + "' ");
            }
            return SQLField.join(" , ");
        }	else	{
            return field;
        }
    },
    SQLConnection: SQLdb,


};

