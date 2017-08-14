/**
 * Created by fangchenli on 5/16/17.
 */
var path = require('path');
var request = require('request');

var express = require('express')
var app = express();
var bodyParser = require('body-parser')
var mustacheExpress = require('mustache-express');

//////////////////////////////////////
//REQUIRE MODULE//
//////////////////////////////////////

var config = require("../../config.js");
var public = require("./public.js");


/************************************/

        //HTTP SERVER//

/************************************/


/**
 * USE Express Framework
 */

app.listen(config.HTTPTestPort, function () {
    public.eventLog('Seraph eSHOS Testing Console Listening on Port ' + config.HTTPTestPort+ '...', "HTTP Server")
})

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-seraph-version, x-seraph-messageID, x-seraph-accessToken");
    next();
});

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
// Register '.mustache' extension with The Mustache Express
app.engine('html', mustacheExpress());

app.set('view engine', 'html');
app.set('views', path.join(__dirname.replace("Lib",""), 'html'));
app.use(express.static(path.join(__dirname.replace("Lib",""), 'public')));



/**
 * Index
 */
app.get('/', function(req, res) {

    request.get(
        'http://localhost:20002/test/linkService',
        { json: { key: 'value' } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {

                res.render('index',body);
            }
        }
    );





});




