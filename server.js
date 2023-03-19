/*
var util = require('util');
var fs = require('fs');
var ws = fs.createWriteStream('./Ketter.log', {
		flags: 'a'
	});
var through = require('through2');
var t = new through();
t.pipe(process.stdout);
t.pipe(ws);
console.log = function () {
	t.write(util.format.apply(this, arguments) + '\n');
};*/

const DEBUG = false;
const express = require('express');
const KettlerUSB = require('./kettlerUSB');
const KettlerBLE = require('./BLE/kettlerBLE');
const BikeState = require('./BikeState');
const Oled = require('./OledInfo');
const Button = require('./lib/rpi_gpio_buttons');
const YAML = require('yaml');
const fs = require('fs');


const defaultConfig = {
  server: { debug: false, port: 3000 },
  cyclist: { 
	ftp: 300, 
	weight: 75, 
	frontalArea: 0.47, // 0.65 tops, 0.514 hoods, 0.487 drops, 0.462 aerobars 
  },
  bike: {
    weight: 9,
    driveTrainLoss: 3, // in percent, 3 is normal, 4 is for dry chain, 5 for dry AND old chain
    tireDiameter: 622,
    tireWidth: 23,
    cogs: [28, 25, 22, 19, 17, 16, 15, 14, 13, 12, 11, 10],
    chainRings: [34, 50],
  },
  physics: { gravity: 9.8067, airDensity: 1.226 },
};

const file = fs.readFileSync('./config.yml', 'utf8')
const fileConfig = YAML.parse(file);

const config = { ...defaultConfig, ...fileConfig};
console.log(config);

//--- Web Server on port 3000 for inspecting the Kettler State
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
	res.render('index', {});
});
server = app.listen(config.server.port, function () {
		console.log(`Kettler app listening on port ${config.server.port}!`);
	});
const io = require("socket.io")(server);

io.on('connection', (socket) => {
	socket.on('key', function (ev) {
		console.log('key' + ev);
		switch (ev) {
		case 'PowerUp':
			bikeState.addPower(20);
			break;
		case 'PowerDn':
			bikeState.addPower(-20);
			break;
		case 'GearUp':
			bikeState.GearUp();
			break;
		case 'GearDn':
			bikeState.GearDown();
			break;
		case 'SprocketUp':
			bikeState.SprocketUp();
			break;
		case 'SprocketDown':
			bikeState.SprocketDown();
			break;
		case 'ChangeRing':
			bikeState.ChangeRing();
			break;
		case 'GearPowerUp':
			bikeState.GearPowerUp();
			break;
		case 'GearPowerUpBig':
			bikeState.GearPowerUp(30);
			break;
		case 'GearPowerDown':
			bikeState.GearPowerDown();
			break;
		case 'GearPowerDownBig':
			bikeState.GearPowerDown(30);
			break;
		case 'ChangeGearMode':
			bikeState.ChangeGearMode();
			break;
		case 'ChangeKill':
			bikeState.ChangeKill();
			break;
		case 'pause':
			bikeState.setTargetPower(140);
			break;
		}
	});
});

//--- Buttons
// 7 -> GPIO4
// 11 -> GPIO17
const buttons = new Button({ mode: Button.MODE_BCM, pins: [7,11] });
buttons.on('clicked', pin => {
	switch(pin)
	{
	case 7: bikeState.GearUp(); break;
	case 11: bikeState.GearDown(); break;
	}
});
 
//--- Oled Screen
const oled = new Oled();

//--- Machine State
const bikeState = new BikeState(config);
// un peu de retour serveur
bikeState.on('mode', (mode) => {
	io.emit('mode', mode);
});
bikeState.on('gear', (gear) => {
	io.emit('gear', gear);
	oled.displayGear(gear);
});
bikeState.on('grade', (grade) => {
	io.emit('grade', grade);
	oled.displayGrade(grade);
});
bikeState.on('windspeed', (windspeed) => {
	io.emit('windspeed', windspeed);
});
bikeState.on('simpower', (simpower) => {
	io.emit('power', simpower);
	kettlerUSB.setPower(simpower);
	oled.displayPower(simpower);
});
bikeState.on('speed', (speed) => {
	io.emit('speed', speed);
});
// bikeState.on('rpm', (rpm) => {
// 	io.emit('rpm', rpm);
// });
bikeState.on('crr', (crr) => {
	io.emit('crr', crr);
});
bikeState.on('cw', (cw) => {
	io.emit('cw', cw);
});
bikeState.on('autoGears', (autoGears) => {
	io.emit('autoGears', autoGears);
});
bikeState.on('kill', (kill) => {
	io.emit('kill', kill);
});
bikeState.on('gearPower', (gearPower) => {
	io.emit('gearPower', gearPower);
});
// first state
//bikeState.setGear(4);

//--- Serial port
const kettlerUSB = new KettlerUSB();
kettlerUSB.on('error', (string) => {
	console.log('error : ' + string);
	io.emit('error', string);
});
kettlerUSB.on('connecting', () => {
	oled.displayUSB('connecting');
});
kettlerUSB.on('start', () => {
	oled.displayUSB('connected');
});
kettlerUSB.on('disconnected', () => {
  oled.displayUSB('disconnected');
});
kettlerUSB.on('data', (data) => {
	// keep
	bikeState.setData(data);

	// send to html server
	//if ('speed' in data)
	//	io.emit('speed', data.speed.toFixed(1));
	// if ('power' in data)
	// 	io.emit('power', data.power);
	// if ('hr' in data)
	// 	io.emit('hr', data.hr);
	if ('rpm' in data)
		io.emit('rpm', data.rpm);

	// The minimum power that can be set is 25 Watts.
	// The bike will transmit that we are riding at 25 watts even when we are not pedalling.
	// 25 watts should be considered 0.
	if ('power' in data) {
		if ((data.power < 25) || bikeState.kill) {
			data.power = 0;
			data.rpm = 0;
		}
	}

	// send to BLE adapter
	kettlerBLE.notifyFTMS(data);
});

kettlerUSB.on('buttonPress', (buttonPressed) => {
	// console.log("ergo konzept button press", buttonPressed);
	switch (buttonPressed) {
    case 'up':
	  	bikeState.GearUp();
      break;
    case 'down':
		bikeState.GearDown();
      break;
    case 'left':
		// not always available
      break;
    case 'right':
		bikeState.ChangeGearMode();
      break;
  }
});

kettlerUSB.open();

//--- BLE server
var kettlerBLE = new KettlerBLE(serverCallback);

kettlerBLE.on('advertisingStart', (client) => {
	oled.displayBLE('Started');
});
kettlerBLE.on('accept', (client) => {
	oled.displayBLE('Connected');
});
kettlerBLE.on('disconnect', (client) => {
	oled.displayBLE('Disconnected');
});

function serverCallback(message, ...args) {
	var success = false;
	switch (message) {
	case 'reset':
		oled.setStatus(0);
		console.log('[server.js] - Bike reset');
		//kettlerUSB.restart();
		bikeState.restart();
		success = true;
		break;

	case 'control':
		oled.setStatus(2);
		console.log('[server.js] - Bike is under control');
		bikeState.setControl();
		success = true;
		break;

	case 'power':
		oled.setStatus(2);
		// console.log('[server.js] - Bike in ERG Mode');
		bikeState.setTargetPower(args[0]);
		success = true;
		break;

	// TODO: more meaningful handling of start and stop events	
	case 'start':
	case 'stop':
		oled.setStatus(3);
		success = true;
		break;	

	case 'simulation': // SIM Mode - calculate power based on physics
		oled.setStatus(1);
		//console.log('[server.js] - Bike in SIM Mode');
		var windspeed = Number(args[0]);
		var grade = Number(args[1]);
		var crr = Number(args[2]);
		var cw = Number(args[3]);
		// console.log('[server.js] - Bike SIM Mode - [wind]: ' + (windspeed * 3.6).toFixed(1) + 'hm/h [grade]: ' + grade.toFixed(1) + '% [crr]: ' + crr + ' [cw]: ' + cw)

		bikeState.setExternalCondition(windspeed, grade, crr, cw);
		// nothing special
		success = true;
		break;
	}
	return success;
};

/**** TEST ***/
/*
setInterval(mafonction, 2000);
setInterval(mafonction2, 4000);
oled.setStatus(1);

bikeState.on('simpower', (simpower) => {
	dataFake.power = simpower;
});
var dataFake = {
	rpm: 80, //+ 20 * (Math.random() - 0.5),
	speed: 20,
	power: 100
};
function mafonction() {
	kettlerUSB.emit('data', dataFake);

	dataFake = {
		rpm: 80 + 20 * (Math.random() - 0.5),
		speed: 20,
		power: 100
	};
};
function mafonction2() {
	var grade = 3; //20 * (Math.random() - 0.5);
	bikeState.setExternalCondition(0, grade, 0.005, 0.39);
};
*/
