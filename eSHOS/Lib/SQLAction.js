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





//////////////////////////////////////
        //CONTENT START//
//////////////////////////////////////


var SQLAdd = function (db,sqlData){
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
};

var SQLFind = function(db,field,where,callback){
    var sql = "SELECT " + parseField(field) + " FROM " +  db  + parseWhere(where);
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


};

var SQLSetField = function (db,field,where){

    var sql = 'UPDATE ' + db + ' SET ' + parseField(field) + parseWhere(where);

    SQLdb.run(sql,function(err){
        debug("[%s] " + sql, public.getDateTime());
        if(err){
            debug("[*******ERROR*******] [%s] ", err);
        }
    });
};

var SQLSelect = function(db,field,where,order,callback){

    var sql = "SELECT " + parseField(field) + " FROM " +  db  + parseWhere(where);

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


};
var SQLSetInc = function (db,field,where,inc){
        var sql = 'UPDATE ' + db + ' SET ' + field + ' = ' + field + ' + ' + inc + ' ' + parseWhere(where);

        SQLdb.run(sql,function(err){
            debug("[%s] " + sql, public.getDateTime());
            if(err){
                debug("[*******ERROR*******] [%s] ", err);
            }
        });
        //public.eventLog(sql , "SQL");

    };
var SQLGetField = function(db,field,where,callback){
    var sql = "SELECT " + parseField(field) + " FROM " +  db  + parseWhere(where);

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
};



var SQLDelete = function (db,where){

    var sql = 'DELETE FROM ' + db + parseWhere(where);

    SQLdb.run(sql,function(err){
        debug("[%s] " + sql, public.getDateTime());
        if(err){
            debug("[*******ERROR*******] [%s] ", err);
        }
    });

};



var parseWhere = function(where,separator){
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

};
var parseField = function(field) {
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
};

module.exports = {


    SQLAdd : SQLAdd,
    SQLFind : SQLFind,
    SQLSetField : SQLSetField,
    SQLSelect : SQLSelect,
    SQLSetInc : SQLSetInc,
    SQLGetField : SQLGetField,
    SQLDelete : SQLDelete,
    parseWhere: parseWhere,
    parseField : parseField,
    SQLConnection: SQLdb,


};

