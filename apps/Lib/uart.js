/**
 * Created by fangchenli on 1/29/17.
 */
var wpi = require('wiring-pi');
var uart = wpi.serialOpen("/dev/ttyAMA0", 115200)
if(wpi.serialDataAvail(uart) > 0){
    var data = new Buffer(serialGetchar(uart));
    console.log(data.toString('hex'));
    console.log();
}