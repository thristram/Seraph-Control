var publicMethods = require("./public.js");
var SQLAction = require("./SQLAction")
let currentTimestamp = publicMethods.timestamp()
let timestampToday = currentTimestamp - (currentTimestamp % 86400) - 28800;
console.log(publicMethods.getDateTime(timestampToday));

console.log(publicMethods.generateTimeBasedUID());


let a = 1
b = a===1
console.log(b)