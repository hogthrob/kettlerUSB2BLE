
const Bleno = require('@abandonware/bleno');
const DEBUG = false;

// Spec
//https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.cycling_power_measurement.xml

class HeartMeasurementCharacteristic extends  Bleno.Characteristic {
 
  constructor() {
    super({
      uuid: '2A37',
      value: null,
      properties: ['notify'],
      descriptors: [
        new Bleno.Descriptor({
					uuid: '2901',
					value: 'Heart Measurement'
				}),
        new Bleno.Descriptor({
          // Server Characteristic Configuration
          uuid: '2903',
          value: Buffer.alloc(2)
        })
      ]
    });
    this._updateValueCallback = null;  
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    if (DEBUG) console.log('[heartService] client subscribed to PM');
    this._updateValueCallback = updateValueCallback;
    return this.RESULT_SUCCESS;
  };

  onUnsubscribe() {
    if (DEBUG) console.log('[heartService] client unsubscribed from PM');
    this._updateValueCallback = null;
    return this.RESULT_UNLIKELY_ERROR;
  };

  notify(event) {
    if (!('hr' in event)) {
      return this.RESULT_SUCCESS;;
    }
  
    if (this._updateValueCallback) {
      if (DEBUG) console.log('[heartService] Notify');
      const buffer = Buffer.alloc(2);
      // flags
     
      buffer.writeUInt16LE(0x0000, 0);

      if ('hr' in event) {
        if (DEBUG) console.log('[heartService] hr: ' + event.hr);
        buffer.writeUInt8(event.hr, 1);
      }

      this._updateValueCallback(buffer);
    }
    return this.RESULT_SUCCESS;
  }  
};

module.exports = HeartMeasurementCharacteristic;
