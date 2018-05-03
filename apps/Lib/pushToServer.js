
var path = require('path');
var request = require('request');
var fs = require('fs');


class remotePush{

    constructor(){

    }
    downloadFile(url, fileName, path, callback){
	    request
		    .get(url)
		    .on('data', function(response) {
			    callback()
		    })
		    .pipe(fs.createWriteStream(path + fileName))
    }
    webCall(method, url, data,  callback){
        switch (method){
            case "APIGET":
                request.get(
                    'http://seraph.applicationclick.com' + url,
                    function (error, response, body) {
                        if (!error && response.statusCode === 200) {

                            callback(body)

                        }
                    }
                );
                break;
            case "GET":
                request.get(
                    'http://seraph.applicationclick.com/eshApi' + url,
                    function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            callback(body);


                        }
                    }
                )
                break;
            case "POST":
                request.post(
                    'http://seraph.applicationclick.com/eshApi' + url,
                    { json: { data } },
                    function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            callback(body)

                        }
                    }
                )
                break;
        }

    }
}
module.exports.remotePush = remotePush;