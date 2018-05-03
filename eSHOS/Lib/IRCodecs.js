let debug = require('debug')("IRCodecs");

class ACCodecs{


    constructor(){
        this.brand = 3;

        this.targetTemperature = 25;
        this.mode = 1;
        this.power = true;
        this.fanSpeed = 0;


        this.fanSweep = false;
        this.fanSweepLR = false;
        this.fanSweepTB = false;
        this.sleepMode = false;
        this.superMode = false;
        this.healthyMode = false;
        this.circulationMode = false;
        this.secondaryFunction = false;
        this.light = true;
        this.displayMode = 1;
    }
    setMode(mode){
        // 1 - Cool
        // 2 - Heat
        // 3 - Fan
        // 4 - De-humidify
        // 5 - Auto
        this.mode = mode
    }
    IREncode(){
        switch(this.brand){
            case 3:
                return this.GreeEncode();

        }
    }
    GreeEncode(){
        let cmd1 = [];
        let cmd2 = [];
        let self = this;
        for (let i = 0; i < 36; i++){
            cmd1[i] = 0;
            if(i < 36){
                cmd2[i] = 0;
            }
        }

        constructDefault();


        //模式
        // 1 - Cool
        // 2 - Heat
        // 3 - Fan
        // 4 - De-humidify
        // 5 - Auto
        switch (this.mode){
            case 1:
                cmd1[0] = 1; cmd1[1] = 0; cmd1[2] = 0;
                constructFanSpeed();
                constructSleepMode();
                constructSuperMode();
                constructHealthyMode();
                constructCirculationMode();
                break;
            case 2:
                cmd1[0] = 0; cmd1[1] = 0; cmd1[2] = 1;
                constructFanSpeed();
                constructSleepMode();
                constructSuperMode();
                constructSecondaryFunction();
                break;
            case 3:
                cmd1[0] = 1; cmd1[1] = 1; cmd1[2] = 0;
                constructFanSpeed();
                constructHealthyMode();
                constructCirculationMode();
                break;
            case 4:
                cmd1[0] = 0; cmd1[1] = 1; cmd1[2] = 0;
                constructSecondaryFunction();
                constructSleepMode();
                constructHealthyMode();
                constructCirculationMode();
                break;

        }
        constructLight();
        constructFanSweep();
        constructDisplayMode();
        constructTemperature();
        constructPower();


        //默认
        function constructDefault(){
            cmd1[28] = 1;
            cmd1[30] = 1;
            cmd1[33] = 1;
            cmd2[13] = 1;
        }

        //电源
        function constructPower(){
            if (self.power){
                cmd1[3] = 1;
            }   else    {
                cmd1[3] = 0;
                cmd2[31] = 1 - cmd2[31];
            }
        }


        //风速
        function constructFanSpeed(){

            switch (self.fanSpeed){
                case 1: cmd1[4] = 1; cmd1[5] = 0; break;
                case 2: cmd1[4] = 0; cmd1[5] = 1; break;
                case 3: cmd1[4] = 1; cmd1[5] = 1; break;
                case 4: cmd1[4] = 0; cmd1[5] = 0; break;
                default: cmd1[4] = 0; cmd1[5] = 0; break;

            }
        }


        //睡眠模式
        function constructSleepMode(){

            if (self.sleepMode){
                cmd1[7] = 1;
            }   else    {
                cmd1[7] = 0;
            }
        }

        //超强模式
        function constructSuperMode(){
            if(self.superMode){
                cmd1[20] = 1;
            }   else    {
                cmd1[20] = 0;
            }
        }

        //灯光
        function constructLight(){
            if(self.light){
                cmd1[21] = 1;
            }   else    {
                cmd2[21] = 0;
            }
        }

        //健康模式
        function constructHealthyMode(){
            if(self.healthyMode){
                cmd1[22] = 1;
            }   else    {
                cmd1[22] = 0;
            }
        }

        //换气模式
        function constructCirculationMode(){
            if(self.circulationMode){
                cmd1[24] = 1;
            }   else    {
                cmd1[24] = 0;
            }
        }

        //干燥，辅热
        function constructSecondaryFunction(){
            if(self.secondaryFunction){
                cmd1[23] = 1;
            }   else    {
                cmd1[23] = 0;
            }
        }

        //显示温度
        function constructDisplayMode(){
            switch(self.displayMode){
                case 0: cmd2[8] = 0; cmd2[9] = 0; break;
                case 1: cmd2[8] = 0; cmd2[9] = 1; break;
                case 2: cmd2[8] = 1; cmd2[9] = 0; break;
                case 3: cmd2[8] = 1; cmd2[9] = 1; break;

            }
        }


        //扫风
        function constructFanSweep(){
            if(self.fanSweep){
                cmd1[6] = 1;
                if(self.fanSweepLR){
                    cmd2[4] = 1;
                }   else    {
                    cmd2[4] = 0;
                }
                if(self.fanSweepTB){
                    cmd2[0] = 1;
                }   else    {
                    cmd2[0] = 0;
                }
            }   else    {
                cmd1[6] = 0;
                cmd2[0] = 0;
                cmd2[4] = 0;
            }
        }



        //目标温度
        function constructTemperature(){
            debug("Target Temperature: " + self.targetTemperature);
            switch (self.targetTemperature){
                case 30:
                    cmd1[8] = 0; cmd1[9] = 1; cmd1[10] = 1; cmd1[11] = 1;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 0;break;

                    }
                    break;
                case 29:
                    cmd1[8] = 1; cmd1[9] = 0; cmd1[10] = 1; cmd1[11] = 1;
                    switch(self.mode){
                        case 1: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 2: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 3: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;

                    }
                    break;
                case 28:
                    cmd1[8] = 0; cmd1[9] = 0; cmd1[10] = 1; cmd1[11] = 1;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;

                    }
                    break;
                case 27:
                    cmd1[8] = 1; cmd1[9] = 1; cmd1[10] = 0; cmd1[11] = 1;
                    switch(self.mode){
                        case 1: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 2: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 3: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;

                    }
                    break;
                case 26:
                    cmd1[8] = 0; cmd1[9] = 1; cmd1[10] = 0; cmd1[11] = 1;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;

                    }
                    break;
                case 25:
                    cmd1[8] = 1; cmd1[9] = 0; cmd1[10] = 0; cmd1[11] = 1;
                    switch(self.mode){
                        case 1: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 3: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 4: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;

                    }
                    break;
                case 24:
                    cmd1[8] = 0; cmd1[9] = 0; cmd1[10] = 0; cmd1[11] = 1;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 0;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;

                    }
                    break;
                case 23:
                    cmd1[8] = 1; cmd1[9] = 1; cmd1[10] = 1; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 4: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;

                    }
                    break;
                case 22:
                    cmd1[8] = 0; cmd1[9] = 1; cmd1[10] = 1; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;

                    }
                    break;
                case 21:
                    cmd1[8] = 1; cmd1[9] = 0; cmd1[10] = 1; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 4: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 1;break;

                    }
                    break;
                case 20:
                    cmd1[8] = 0; cmd1[9] = 0; cmd1[10] = 1; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 1;break;

                    }
                    break;
                case 19:
                    cmd1[8] = 1; cmd1[9] = 1; cmd1[10] = 0; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 2: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;

                    }
                    break;
                case 18:
                    cmd1[8] = 0; cmd1[9] = 1; cmd1[10] = 0; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;

                    }
                    break;
                case 17:
                    cmd1[8] = 1; cmd1[9] = 0; cmd1[10] = 0; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 2: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 1; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;

                    }
                    break;
                case 16:
                    cmd1[8] = 0; cmd1[9] = 0; cmd1[10] = 0; cmd1[11] = 0;
                    switch(self.mode){
                        case 1: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 2: cmd2[28] = 0; cmd2[29] = 0; cmd2[30] = 0; cmd2[31] = 1;break;
                        case 3: cmd2[28] = 1; cmd2[29] = 0; cmd2[30] = 1; cmd2[31] = 0;break;
                        case 4: cmd2[28] = 0; cmd2[29] = 1; cmd2[30] = 1; cmd2[31] = 0;break;

                    }
                    break;

            }


        }
        let resultHex = this.hexCodecs(cmd1) + this.hexCodecs(cmd2);
        debug("IR Encode Hex: " + resultHex);
        return resultHex;



    }
    hexCodecs(binary){
        let bin = "";
        let displayBin = "";
        let byteCount = 0;
        for(let i in binary){
            bin =  bin + binary[i];
            displayBin = displayBin + binary[i];
            if((i % 4)  == 3){
                displayBin = displayBin + " ";
                byteCount++;
            }
        }
        debug("IR Encode: " + displayBin);

        let hex = parseInt(bin, 2).toString(16).toUpperCase();
        let bytesShorts = byteCount - hex.length;
        if(bytesShorts > 0){
            for(let i = 0; i < bytesShorts; i++){
                hex = "0" + hex;
            }
        }
        return hex
    }
}

//let codecs = new ACCodecs();
//codecs.IREncode();
module.exports.ACCodecs = { ACCodecs };