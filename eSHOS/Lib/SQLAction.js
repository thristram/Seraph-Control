/************************************/

		  //SQL Action//

/************************************/


var config = require("../../config.js");
var public = require("./public.js");


var path = require('path');
var SQLite = require('sqlite3').verbose();
var SQLdb = new SQLite.Database(path.join(__dirname.replace("Lib","") + '/db/seraph.sqlite'));




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
    SQLdb.run(sql);
    public.eventLog(sql , "SQL");
},
SQLSetInc: function (db,field,where,inc){
	var sql = 'UPDATE ' + db + ' SET ' + field + ' = ' + field + ' + ' + inc + ' ' + this.parseWhere(where);

    SQLdb.run(sql);
    public.eventLog(sql , "SQL");
	
},
SQLFind: function(db,field,where,callback){
    var sql = "SELECT " + this.parseField(field) + " FROM " +  db  + this.parseWhere(where);
    public.eventLog(sql , "SQL");
    SQLdb.all(sql, function(err, data) {
        if(data.length > 0){
            callback(data[0]);
        }	else	{
            callback([]);
        }
    })


},
SQLGetField: function(db,field,where,callback){
    var sql = "SELECT " + this.parseField(field) + " FROM " +  db  + this.parseWhere(where);
    public.eventLog(sql , "SQL");
    SQLdb.all(sql, function(err, data) {
    	if(data.length > 0){
    		callback(data[0][field]);
        }	else	{
            callback("");
        }
    })
},
SQLSetField: function (db,field,where){

	var sql = 'UPDATE ' + db + ' SET ' + this.parseField(field) + this.parseWhere(where);
	public.eventLog(sql , "SQL");
    SQLdb.run(sql);
},

SQLSetConfig: function (db,field){
    var query,where;
    for (var key in field){
        query = field[key];
        where = key;
    }
    var sql = 'UPDATE ' + db + ' SET ' + this.parseField({value:query,timestamp:public.timestamp()}) + this.parseWhere({name:where});
	SQLdb.run(sql);
    public.eventLog(sql , "SQL");

},
SQLDelete: function (db,where){

    var sql = 'DELETE FROM ' + db + this.parseWhere(where);
    SQLdb.run(sql);
    public.eventLog(sql , "SQL");
},
SQLSelect: function(db,field,where,order,callback){

	var sql = "SELECT " + this.parseField(field) + " FROM " +  db  + this.parseWhere(where);
    public.eventLog(sql , "SQL");
    SQLdb.all(sql, function(err, data) {
        if(data.length > 0){
            callback(data);
        }	else	{
            callback([]);
        }
    });


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