/*
 * clock.js
 * Display a digital clock on a small I2C connected display
 *
 * 2016-11-28 v1.0 Harald Kubota
 */

"use strict";

// NOTE: On newer versions of Raspberry Pi the I2C is set to 1,
// however on other platforms you may need to adjust if to
// another value, for example 0.
var bus = 1;

const i2c = require('i2c-bus'),
i2cBus = i2c.openSync(bus),
oled = require('oled-i2c-bus');
const FontPack = require('oled-font-pack');
const font = FontPack.oled_5x7;;
const fontLarge = FontPack.medium_numbers_12x16;

const SIZE_X = 128,
SIZE_Y = 64;

var opts = {
	width: SIZE_X,
	height: SIZE_Y,
	address: 0x3C
};

class Oled {

	constructor() {
		try {
			this.oled = new oled(i2cBus, opts);

			this.oled.clearDisplay();
			this.oled.turnOnDisplay();

			// set the refresh
			this.shouldUpdate = true;
			this.screenStatus = 0;
			this.usb = 'waiting';
			this.ble = 'waiting';
			this.gear = "";
			this.grade = 0;
			this.targetPower = 0;

			// run async
			this.displayLoop();

		} catch (err) {
			// Print an error message a
			console.log(err.message);
		}
	};

	displayLoop() {
		if (this.shouldUpdate == true) {
			this.shouldUpdate = false;
			this.Draw().then(() => setTimeout(() => this.displayLoop(), 5000));
		} else {
			setTimeout(() => this.displayLoop(), 2000);
		}
	};

	async Draw() {
		this.oled.clearDisplay(false);
		this.oled.drawPixel([
				[SIZE_X - 1, 0, 1],
				[SIZE_X - 1, SIZE_Y - 1, 1],
				[0, SIZE_Y - 1, 1],
				[0, 0, 1]
			], false);

		this.oled.drawLine(1, 1, SIZE_X - 2, 1, 1, false);
		this.oled.drawLine(SIZE_X - 2, 1, SIZE_X - 2, SIZE_Y - 2, 1, false);
		this.oled.drawLine(SIZE_X - 2, SIZE_Y - 2, 1, SIZE_Y - 2, 1, false);
		this.oled.drawLine(1, SIZE_Y - 2, 1, 1, 1, false);

		// reste du message
		switch (this.screenStatus) {
		case 0:
			this.displayStatus();
			break;
		case 1:
			this.displaySimInfo();
			break;
		case 2:
			this.displayErgInfo();
			break;
		case 3:
			this.displayControlledInfo();
			break;
		}
	}

	// Gear
	displayStatus() {
		this.oled.setCursor(10, 5);
		this.oled.writeString(font, 1, 'Status', 1, false);
		this.oled.setCursor(10, 20);
		this.oled.writeString(font, 1, 'USB ' + this.usb, 1, false);
		this.oled.setCursor(10, 38);
		this.oled.writeString(font, 1, 'BLE ' + this.ble, 1, false);
		this.oled.setCursor(50, 50);
		this.oled.writeString(font, 1, 'INIT', true);
	}

	
	// Gear
	displaySimInfo() {
		this.oled.setCursor(80, 5);
		this.oled.writeString(font, 1, 'Gear', 1, false);
		this.oled.setCursor(90, 25);
		this.oled.writeString(font, 1, this.gear.toString(), 1, false);
		this.oled.setCursor(20, 5);
		this.oled.writeString(font, 1, 'Grade', 1, false);
		this.oled.setCursor(10, 25);
		this.oled.writeString(fontLarge, 1, this.grade.toString(), 1, false);
		this.oled.writeString(font, 1, '%', 1, false);
		this.oled.setCursor(50, 50);
		this.oled.writeString(font, 1, 'SIM', true);
	}

		// Gear
	displayControlledInfo() {
		this.oled.setCursor(80, 5);
		this.oled.writeString(font, 1, 'Gear', 1, false);
		this.oled.setCursor(90, 25);
		this.oled.writeString(font, 1, this.gear.toString(), 1, false);
		this.oled.setCursor(20, 5);
		this.oled.writeString(font, 1, 'Power', 1, false);
		this.oled.setCursor(10, 25);
		this.oled.writeString(fontLarge, 1, this.targetPower.toString(), 1, false);
		this.oled.writeString(font, 1, 'W', 1, false);
		this.oled.setCursor(50, 50);
		this.oled.writeString(font, 1, 'CONTROLLED', true);
	}


	displayErgInfo() {
		this.oled.setCursor(80, 5);
		this.oled.writeString(font, 1, 'Gear', 1, false);
		this.oled.setCursor(90, 25);
		this.oled.writeString(font, 1, this.gear.toString(), 1, false);
		this.oled.setCursor(20, 5);
		this.oled.writeString(font, 1, 'Power', 1, false);
		this.oled.setCursor(10, 25);
		this.oled.writeString(fontLarge, 1, this.targetPower.toString(), 1, false);
		this.oled.writeString(font, 1, 'W', 1, false);
		// this.oled.writeString(fontLarge, 1, this.targetPower.toString() + 'W', 1, false);
		this.oled.setCursor(50, 50);
    	this.oled.writeString(font, 1, "ERG", true);
	}

	setStatus(status) {
		this.screenStatus = status;
		this.shouldUpdate = true;
	}

	// iusb
	displayUSB(message) {
		this.shouldUpdate = true;
		this.usb = message;
	}
	// iusb
	displayBLE(message) {
		this.shouldUpdate = true;
		this.ble = message;
	}

	// Gear
	displayGear(gear) {
		if (gear != this.gear) {
			this.shouldUpdate = true;
			this.gear = gear;
		}
	}

	// Gear
	displayGrade(grade) {
		if (grade != this.grade) {
			this.shouldUpdate = true;
			this.grade = grade;
		}
	}

		// Gear
	displayPower(targetPower) {
		if (targetPower != this.targetPower) {
			this.shouldUpdate = true;
			this.targetPower = targetPower;
		}
	}

}
module.exports = Oled
