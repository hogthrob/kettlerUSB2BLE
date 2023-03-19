const Bleno = require('@abandonware/bleno');

const HeartMeasurementCharacteristic = require('./heart-measurement-characteristic');
const StaticReadCharacteristic = require('./static-read-characteristic');

// https://developer.bluetooth.org/gatt/services/Pages/ServiceViewer.aspx?u=org.bluetooth.service.cycling_power.xml
class HeartService extends Bleno.PrimaryService {

  constructor() {
    const heartMeasurement = new HeartMeasurementCharacteristic();
    super({
        uuid: '180D',
	      characteristics: [
          heartMeasurement
        ]
    });

    this.heartMeasurement = heartMeasurement;
  }

  notify(event) {
    this.heartMeasurement.notify(event);
    return this.RESULT_SUCCESS;
  };
}

module.exports = HeartService;
