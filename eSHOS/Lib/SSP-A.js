/**
 * Use Pure Node.js
 * @param request
 * @param response
 */
/*
 function handleRequest(request, response) {
 response.setHeader("Access-Control-Allow-Origin", "*");
 response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
 response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-seraph-version, x-seraph-messageID, x-seraph-accessToken' );
 //next();
 response.end('It Works!! Path Hit: ' + request.url);

 parseURL(request);

 }


 var server = http.createServer(handleRequest);
 server.listen(HTTPort, function() {
 console.log("Server listening on: http://localhost:%s", HTTPort);
 });


/************************************/

            //SSP-A API//

/************************************/

function parseURL(request){
    var APIQuery = {
        action 			: "",
        query 			: {},
        paramURL 		: "",
        method 			: request.method
    };
    if(request.method != "OPTIONS"){
        console.log("Method: " + request.method);
        var pathname = url.parse(request.url,true).pathname;
        var query = pathname.split("/");
        APIQuery.paramURL = request.url;


        if(query[1] == "qe" || query[1] == "alarm"){
            APIQuery.action = query[1];
            query.splice(0, 2);

        }	else if(query[1] == "config" && query[2] == "strategy" && query[3] == "htsp" ){
            APIQuery.action = query[1] + "/" + query[2] + "/" + query[3];
            query.splice(0, 4);

        }	else	{
            APIQuery.action = query[1] + "/" + query[2];
            query.splice(0, 3);
        }


        APIQuery.query = getQuery(query);
        parseAPI(APIQuery);
    }	else {
        console.log("\nMethod: " + request.method);
    }


}

function parseAPI(APIQuery){
    console.log("************************ COMMAND TYPE ************************");
    console.log("Action: " + APIQuery.action);
    console.log("Requested URI: " + APIQuery.paramURL);
    console.log(APIQuery.query);

    var data;
    var ifRecord = true;

    switch (APIQuery.action){
        case "actions/perform":
            data = sspbActionPerform(APIQuery);break;
        case "actions/refresh":
            data = sspbActionRefresh(APIQuery);break;
        case "data/sync":
            data = sspbDataSync(APIQuery);break;
        case "data/recent":
            data = sspbDataRecent(APIQuery);break;
        case "device/status":
            data = sspbDeviceStatus(APIQuery);break;
        case "qe":
            data = sspbQE(APIQuery);break;
        case "alarm":
            data = sspbQE(APIQuery);break;



        case "config/ss":

            switch (APIQuery.method){
                case "GET"	: data = sspbConfigssGet(APIQuery);break;
                case "POST"	: data = sspbConfigssPost(APIQuery);break;
                default		: break;
            }
            break;

        case "config/strateg":
            switch (APIQuery.method){
                case "GET"	: data = sspbConfigStrategyHTSPGet(APIQuery);break;
                case "POST"	: data = sspbConfigStrategyHTSPPost(APIQuery);break;
                default		: break;
            }
            break;

        case "device/list":
            switch (APIQuery.method){
                case "GET" 	: data = sspbDeviceListGet(APIQuery);break;
                case "POST" : data = sspbDeviceListPost(APIQuery);break;
            }
            break;

        default:
            console.log("UNKOWN API");
            console.log("************************ MESSAGE ENDS ************************\n\n");
            ifRecord = false;
            break;
    }


    if(ifRecord){
        //Record Data
        var sqlData = {
            messageID 		: data.MessageID,
            action 			: APIQuery.action,
            parameter 		: JSON.stringify(APIQuery.query),
            requestedURI 	: data.Topic,
            method 			: APIQuery.method,
            timestamp 		: public.timestamp(),
            qos 			: data.QosNeeded
        };
        SQLAction.SQLAdd("commands",sqlData);
    }


}

function getQuery(query){
    var parsedQuery = {};
    var i = 0;
    while (i < query.length){
        parsedQuery[query[i]] = query[i+1];
        i = i + 2;
    }
    //console.log(parsedQuery);
    return parsedQuery;
}


/**
 * Created by Thristram on 12/10/16.
 */
