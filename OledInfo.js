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
      this.gear = '';
      this.grade = 0;
      this.targetPower = 0;
      this.autoGears = '';
      this.speed = 0;
      this.rpm = 0;
      this.controlMode = '';

      // run async
      this.displayLoop();
    } catch (err) {
      // Print an error message a
      console.log(err.message);
    }
  }

  displayLoop() {
    if (this.shouldUpdate == true) {
      this.shouldUpdate = false;
      this.Draw().then(() => setTimeout(() => this.displayLoop(), 50));
    } else {
      setTimeout(() => this.displayLoop(), 200);
    }
  }

  async Draw() {
    this.oled.clearDisplay(false);
    this.oled.drawPixel(
      [
        [SIZE_X - 1, 0, 1],
        [SIZE_X - 1, SIZE_Y - 1, 1],
        [0, SIZE_Y - 1, 1],
        [0, 0, 1],
      ],
      false
    );

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
    this.displayMainMode('INIT');
  }

  displayMainMode(modeName)
  {
    this.oled.setCursor(50, 50);
    this.oled.writeString(font, 1, modeName + ' ' + this.controlMode.charAt(0), true);
  }
  // Gear
  displaySimInfo() {
    this.oled.setCursor(80, 5);
    this.oled.writeString(font, 1, 'Gear ' + (this.autoGears ? 'A' : 'M'), 1, false);
    this.oled.setCursor(90, 25);
    this.oled.writeString(font, 1, this.gear.toString(), 1, false);
    this.oled.setCursor(90, 45);
    this.oled.writeString(font, 1, this.speed.toString(), 1, false);

    this.oled.setCursor(20, 5);
    this.oled.writeString(font, 1, 'Grade', 1, false);
    this.oled.setCursor(10, 25);
    this.oled.writeString(fontLarge, 1, this.grade.toString(), 1, false);
    this.oled.writeString(font, 1, '%', 1, false);
    this.oled.setCursor(10, 45);
    this.oled.writeString(font, 1, this.targetPower.toString(), 1, false);
    this.displayMainMode('SIM');
  }

  // Gear
  displayControlledInfo() {
    this.oled.setCursor(80, 5);
    this.oled.writeString(font, 1, 'Gear ' + (this.autoGears ? 'A' : this.autoGears === false ? 'M' : '?'), 1, false);
    this.oled.setCursor(90, 25);
    this.oled.writeString(font, 1, this.gear.toString(), 1, false);
    this.oled.setCursor(20, 5);
    this.oled.writeString(font, 1, 'Power', 1, false);
    this.oled.setCursor(10, 25);
    this.oled.writeString(fontLarge, 1, this.targetPower.toString(), 1, false);
    this.oled.writeString(font, 1, 'W', 1, false);
    this.displayMainMode('CONTROLLED');
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
    this.displayMainMode('ERG');
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

  // Power
  displayPower(targetPower) {
    if (targetPower != this.targetPower) {
      this.shouldUpdate = true;
      this.targetPower = targetPower;
    }
  }

  // Speed
  displaySpeed(speed) {
    if (speed != this.speed) {
      this.shouldUpdate = true;
      this.speed = speed;
    }
  }

  // Speed
  displayAutoGears(autoGears) {
    if (autoGears != this.autoGears) {
      this.shouldUpdate = true;
      this.autoGears = autoGears;
    }
  }

  // Control Mode
  displayControlMode(cm) {
    if (cm != this.controlMode) {
      this.shouldUpdate = true;
      this.controlMode = cm;
    }
  }
}
module.exports = Oled
