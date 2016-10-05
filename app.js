//Created by Jeroen van den Bergh

//import node modules
var natpmp = require('nat-pmp'),
    http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    port = process.argv[2] || 443,
    mysql = require('mysql'),
    device = require("./device"),
    exec = require('child_process').exec,
    network = require('network');

var portNumber = 2001;

network.get_gateway_ip(function(err, ip) {
    try {
        console.log(err || ip); // err may be 'No active network interface found.'

        var client = natpmp.connect(ip);
        var externalIp = "";
        client.externalIp(function (err, info) {
            if (err) throw err;

            externalIp = info.ip.join('.');
        });
        portMapping(client);
    }catch(Exception){
        console.log(Exception);
        console.log("error while configuring nat-pmp");
    }



//Start point is port 2000. Increments everytime a port isn't available

})


//Function portMapping makes the specified port accessible from outside the local network
function portMapping(client){
    console.log("starting portmapping");
    try {
        // setup a new port mapping
        client.portMapping({ private: 2000, public:portNumber, ttl: 3600 }, function (err, info) {
            if (err)  throw err;
            console.log(info);
            console.log(portNumber);
        });

    }catch(Exception){
        console.log(Exception);
        console.log("couldn't create server in specified port, moving to next port");

        //increment portnumber and restart function portMapping()
        portNumber++;
        console.log("new port number = " + portNumber);

        //setTimeout( portMapping, 1000 );
        portMapping();
    }
    syncWithDatabase();
}


function syncWithDatabase(){

    var connection = mysql.createConnection({
        host     : '185.13.227.197',
        user     : 'jeroebp165',
        password : 'Hagrid123',
        database : 'jeroebp165_UWPSecurityApp'
    });
    connection.connect();

    connection.query('SELECT * FROM tbCamera WHERE RpiSerial = "' + device.serial() + '"', function(err, rows, fields)
    {
        if (err) throw err;

        if (rows.length == 0){
            insertNewRecord(connection);
        }else {
            if(rows[0].Port != portNumber){

                updatePortNumber(connection);
            }else {
                console.log("Camera is up to date");
            }
        }
        console.log("turning on camera");
        turnOnCamera();
    });
}

function insertNewRecord(connection){
    connection.query('INSERT INTO tbCamera (ExternalIp, RpiSerial, Port) VALUES ("'+externalIp+'", "'+device.serial()+'",'+portNumber+')', function(err, rows, fields)
    {
        if (err) throw err;

    });
    console.log("done");
    connection.end();
}

function turnOnCamera(){
    var cmd = 'cd .. && ./mjpg-streamer/mjpg-streamer.sh start';

    exec(cmd, function (error, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        console.log(error);
    });

    console.log("camera is running");
}

function updatePortNumber(connection) {

    connection.query('UPDATE tbCamera SET Port="' + portNumber + '" WHERE RpiSerial ="' + device.serial() + '"', function (err, rows, fields) {
        if (err) throw err;

    });
    console.log("done");
    connection.end();

}
