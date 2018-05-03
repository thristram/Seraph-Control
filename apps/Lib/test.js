//

var debug = require("debug")("abc");
var debug1 = require("debug")("ddd");


setInterval(function () {
	debug("Hello");
	debug1("Hello");
}, 1000);
