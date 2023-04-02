const EvdevReader = require('evdev');
const EventEmitter = require('events');

function prettyPrint(ar) {
  return `[\n\t${ar.join(',\n\t')}\n]`;
}

const target_match = 'event-joystick';
    
class GamepadControl extends EventEmitter {
  constructor() {
    super();
    this.reader = new EvdevReader();
    const self = this;
    this.reader
      .on('EV_KEY', function (data) {
        console.log('key : ', data.code, data.value);
      })
      .on('EV_ABS', function (data) {
        /// console.log('Absolute axis : ', data.code, data.value);
        if (data.value != 127)
        {
          const emitValue = data.code === 'ABS_X' ? (data.value === 0 ? 'left' : 'right') : data.value === 0 ? 'up' : 'down';
          /// console.log(emitValue);
          self.emit("buttonPress",emitValue);
        }
      })
      .on('EV_REL', function (data) {
        console.log('Relative axis : ', data.code, data.value);
      })
      .on('error', function (e) {
        console.log('reader error : ', e);
      });

    const reader = this.reader;
    // console.log("searching for event streams matching %s in : /dev/input/by-path",  target_match);
    this.reader.search('/dev/input/by-path', target_match, function (err, files) {
      var device;
      const target_index = parseInt(process.argv[3]); // don't forget to check if NaN
      if (err) {
        console.log('node-evdev search stream : ', err);
      } else if (files.length == 1) {
        console.log('Opening %s', files[0]);
        device = reader.open(files[0]);
      } else if (1 < files.length) {
        if (Number.isNaN(target_index)) {
          console.log('Found %d files : %s', files.length, prettyPrint(files));
          console.log('Provide a third argument "index" to choose your file. e.g. :');
          console.log('\t./index.js %s 0', target_match);
          console.log('Or provide a more precise filter to match only 1 device');
          return;
        } else if (!files[target_index]) {
          console.error('No file at index %d : %s', target_index, prettyPrint(files));
          return;
        } else {
          console.log('Opening : %s', files[target_index]);
          device = reader.open(files[target_index]);
        }
      } else {
        console.log('No device matching %s found', target_match);
        return;
      }

      //We don't check if device is assigned because any code path that does not return should assign it.
      device.on('open', function () {
        console.log(device.id);
      });
    });
  }
}

module.exports = GamepadControl;
