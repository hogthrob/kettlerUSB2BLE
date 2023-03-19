var $q = require('q');
var EventEmitter = require('events').EventEmitter;
var SerialPort = require('serialport');
const DEBUG = false;
const MOCKDEBUG = false;

const Readline = SerialPort.parsers.Readline;
const EOL = '\r\n'; // CRLF
var portName = '/dev/ttyUSB0';

if (MOCKDEBUG) {
	const Mock = require('@serialport/binding-mock');
	SerialPort.Binding = Mock;
	portName = '/dev/ROBOT';
	Mock.createPort(portName, {
		echo: true
	});
}

const CmdRsp = {
  Status: 'Status', // 8 tab separated values, see below
  Ack: 'ACK',
  Error: 'ERROR', // string shown here
  Str: 'String', // any single string without spaces, but not ACK or ERROR
  Num: 'Number', // single number
  Unrecognized: 'Unrecognized',
  Unknown: 'Unknown', // not known how a valide response looks like, but it must be a single line
};

const Cmd = {
  Calibration: { name: 'CA', response: CmdRsp.Num, parameter: false }, // not on older firmwares
  CommandMode: { name: 'CM', response: CmdRsp.Ack, parameter: false },
  HardwareId: { name: 'ID', response: CmdRsp.Str, parameter: false },
  DeviceKind: { name: 'KI', response: CmdRsp.Str, parameter: false }, // not on older firmwares
  SetPower: { name: 'PW', response: CmdRsp.Status, parameter: true },
  SetTime: { name: 'PT', response: CmdRsp.Status, parameter: true },
  SetDistance: { name: 'PD', response: CmdRsp.Status, parameter: true },
  Reset: { name: 'RS', response: CmdRsp.Ack, parameter: false },
  Status: { name: 'ST', response: CmdRsp.Status, parameter: false },
  UnknownSetPerson: { name: 'SP', response: CmdRsp.Unknown, parameter: true }, // it is not clear if SP means set person, not on older firmwares
  Version: { name: 'VE', response: CmdRsp.Num, parameter: false },
};

class kettlerUSB extends EventEmitter {
  constructor() {
    console.log('[KettlerUSB] constructor');
    super();
    this.msg = [Cmd.Version, Cmd.HardwareId, Cmd.Version, Cmd.CommandMode];
    //start at -1
    this.writePower = false;
    this.power = -1;
    this.lastCommand = null;
    this.lastResponse = null;
    this.responseWait = 0;
  }

  directWrite(data, parameter = '') {
    const command = data.name + parameter;
    if (DEBUG) console.log('[KettlerUSB] write : ' + command);
    this.port.write(command + EOL, (e) => {
      if (!e) {
        this.lastCommand = data;
      }
    });
  }

  async readAndDispatch(data) {
    if (typeof data != 'string') {
      console.log('[KettlerUSB] strange data');
      console.log(data);
      return;
    }

    if (DEBUG) {
      if (MOCKDEBUG) {
        if (data == 'ST' || data.startsWith('PW')) data = '101\t85\t35\t002\t' + this.power + '\t300\t01:12\t' + this.power;
      }
      if (this.last == null) this.last = Date.now();
      console.log('[KettlerUSB] read [' + (Date.now() - this.last) + '] :  ' + data);
      this.last = Date.now();
    }

    var states = data.split('\t');

    let classification = CmdRsp.Unknown;

    // Analyse le retour de ST
    //      101     047     074    002     025      0312    01:12   025
    //info: 1       2       3       4       5       6       7       8
    //1: heart rate as bpm (beats per minute)
    //2: rpm (revolutions per minute)
    //3: speed as 10*km/h -> 074=7.4 km/h
    //4: distance in 100m steps
    //   in non-PC mode: either counting down or up, depending on program
    //   in PC mode: can be set with "pd x[100m]", counting up
    //5: power in Watt, may be configured in PC mode with "pw x[Watt]"
    //6: energy in kJoule (display on trainer may be kcal, note kcal = kJ * 0.2388)
    //   in non-PC mode: either counting down or up, depending on program
    //   in PC mode: can be set with "pe x[kJ]", counting up
    //7: time minutes:seconds,
    //   in non-PC mode: either counting down or up, depending on program
    //   in PC mode: can be set with "pt mmss", counting up
    //8: current power on eddy current brake
    if (states.length == 8) {
      classification = CmdRsp.Status;
      var dataOut = {};
      // puissance
      var power = parseInt(states[7]);
      if (!isNaN(power)) {
        dataOut.power = power;
      }

      // speed
      var speed = parseInt(states[2]);
      if (!isNaN(speed)) {
        dataOut.speed = speed * 0.1;
      }

      // cadence
      var cadence = parseInt(states[1]);
      if (!isNaN(cadence)) {
        dataOut.cadence = cadence;
      }

      // HR
      var hr = parseInt(states[0]);
      if (!isNaN(hr)) {
        dataOut.hr = hr;
      }

      // rpm
      var rpm = parseInt(states[1]);
      if (!isNaN(rpm)) {
        dataOut.rpm = rpm;
      }

      if (Object.keys(data).length > 0) this.emit('data', dataOut);
    }
    //                command: es 1
    // Le dernier chiffre semble etre une touche
    //response: 00      0       0       175
    else if (states.length == 4) {
      // key
      var key = parseInt(states[3]);
      if (!isNaN(key)) {
        this.emit('key', key);
      }
    } else if (states.length == 1) {
      switch (states[0]) {
        case 'ACK':
          classification = CmdRsp.Ack;
          break;
        case 'ERROR':
          classification = CmdRsp.Error;
          break;
        default:
          classification = CmdRsp.Str;
          break;
      }
    } else {
      if (DEBUG) console.log('[KettlerUSB] Unrecognized packet');
    }

    this.lastResponse = classification;
    if (DEBUG) console.log('[KettlerUSB] Response classification: ', classification);
  }

  buttonPoll(prev = {}) {
    // HACK: This is experimental code to read the modem control lines connected to an Ergo Konzep button pad via serial
    // The support for s.rng is not part of the official package unfortunately (modem ring, pin 9 of DSUB 9).
    // without out it, we can only read 3 (up, down, right) out of 4 buttons.
    const options = { dtr: true, rts: true };

    // up => cts
    // down => dcd
    // left => rng, cts
    // right => dsr

    this.port.set(options, (e) => {
      if (!e) {
        this.port.get((e, s) => {
          let buttonPress = null;
          if (s.rng && s.rng != prev.rng) {
            buttonPress = 'left';
          } else if (s.dsr && s.dsr != prev.dsr) {
            buttonPress = 'right';
          } else if (s.dcd && s.dcd != prev.dcd) {
            buttonPress = 'down';
          } else if (s.cts && s.cts != prev.cts) {
            buttonPress = 'up';
          }
          if (buttonPress) {
            if (DEBUG) { 
				console.log('buttonPress', buttonPress); 
			}
            this.emit('buttonPress', buttonPress);
          }
          // if (s) console.log('modem', s.cts, s.dcd, s.dsr, s.rng);
          if (this.port.isOpen) {
            setTimeout(() => this.buttonPoll(s), 20);
          }
        });

      }
    });
  }

  // Open COM port
  open() {
    console.log('[KettlerUSB] open');
    this.emit('connecting');
    // create and open a Serial port
    this.port = new SerialPort(portName, {
      baudRate: 9600,
      autoOpen: false,
    });
    this.parser = this.port.pipe(
      new Readline({
        delimiter: '\r\n',
      })
    );
    this.parser.on('data', (data) => this.readAndDispatch(data));

    // try open
    this.internalOpen();

    this.port.on('open', async () => {
      // read state
      // inform it's ok
      this.emit('open');

      this.buttonPoll();

      // Je sais pas trop ce que ça fait mais ça initialise la bete
      this.port.drain();
      await this.init();
      this.emit('start');

      // start polling in 3s for the state
      //setTimeout(() => this.askState(), 3000);
      setTimeout(() => this.askState(), 2000);
    });

    this.port.on('close', () => {
      console.log('closing');
    });
  }

  internalOpen() {
    this.port.open((err) => {
      if (!err) return;
      console.log('[KettlerUSB] port is not open, retry in 10s');
      setTimeout(() => this.internalOpen(), 10000);
    });
  }

  // let's initialize com with the bike
  //
  sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async initCheckIdAvailable() {
    this.lastResponse = null;
    this.directWrite(Cmd.HardwareId);
    await this.sleep(500);
    return this.lastResponse === CmdRsp.Str;
  }

  async init(foundId = false) {
    // wait until we get a valid response from the bike
    while (false === (await this.initCheckIdAvailable()));

    for (let i = 0; i < this.msg.length; i++) {
      this.directWrite(this.msg[i]);
      await this.sleep(300);
    }
  }

  // require state from the bike
  askState() {
    // if we are not seeing response coming in, something bad has happened here
    // we try to re-establish the connection

    if (this.lastResponse === null) {
    }
    if (this.responseWait > 10) {
      this.emit('disconnected');
      if (DEBUG) {
        console.log('[KettlerUSB] no response from bike, disconnecting');
      }
      this.restart();
      this.responseWait = 0;
    } else {
      this.lastResponse = null;
      this.responseWait = 0;
      if (this.writePower) {
        this.directWrite(Cmd.SetPower, this.power.toString());
        this.writePower = false;
      } else {
        this.directWrite(Cmd.Status);
      }
      // call back later
      setTimeout(() => this.askState(), 1000);
    }
  }

  // restart a connection
  restart() {
    console.log('restart');
    if (this.port.isOpen) {
      this.stop();
      this.port.close();
      this.emit('stop');
    }
    setTimeout(() => this.open(), 10000);
  }

  // Stop the port
  stop() {
    // fermeture
    this.directWrite(Cmd.Version);
    this.directWrite(Cmd.HardwareId);
    this.directWrite(Cmd.Version);
  }

  // set the bike power resistance
  setPower(power) {
    var p = parseInt(Math.max(0, power), 10);
    if (p != this.power) {
      this.power = p;
      this.writePower = true;
    }
  }
};

module.exports = kettlerUSB
