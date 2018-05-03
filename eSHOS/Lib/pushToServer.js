
var path = require('path');
var request = require('request');


class remotePush{

    constructor(){

    }

    webCall(method, url, data, callback){
        switch (method){
            case "GET":
                request.get(
                    'http://seraph.applicationclick.com/eshApi' + url,
                    { json: { data } },
                    function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            callback(body)

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