const Bleno = require('@abandonware/bleno');
const DEBUG = false;

const IndoorFlags = {
  moreData: 0x0001,
  averageSpeed: 0x0002,
  cadence: 0x0004,
  averageCadence: 0x0008,
  totalDistance: 0x0010,
  resistanceLevel: 0x0020,
  power: 0x0040,
  averagePower: 0x080,
  expendedEnergy: 0x0100,
  heartRate: 0x0200,
  metabolicEquivalent: 0x0400,
  elapsedTime: 0x0800,
  remainingTime: 0x1000,
 };

 class IndoorBikeDataCharacteristic extends Bleno.Characteristic {

	constructor() {
		super({
			uuid: '2AD2',
			value: null,
			properties: ['notify'],
		});
		this._updateValueCallback = null;
	}

	onSubscribe(maxValueSize, updateValueCallback) {
		if (DEBUG) console.log('[IndoorBikeDataCharacteristic] client subscribed');
		this._updateValueCallback = updateValueCallback;
		return this.RESULT_SUCCESS;
	};

	onUnsubscribe() {
		if (DEBUG) console.log('[IndoorBikeDataCharacteristic] client unsubscribed');
		this._updateValueCallback = null;
		return this.RESULT_UNLIKELY_ERROR;
	};

	notify(event) {
		if (!('speed' in event) && !('power' in event) && !('hr' in event)) {
			// ignore events with no power and no hr data
			return this.RESULT_SUCCESS; 
		}

		if (this._updateValueCallback) {
			if (DEBUG) console.log("[IndoorBikeDataCharacteristic] Notify");
			const buffer = Buffer.alloc(10);

			let flags = 0x0000;
			
			let index = 2;

			const speed = parseInt(event.speed * 100);
			if (DEBUG) console.log("[IndoorBikeDataCharacteristic] speed: " + speed);
			buffer.writeInt16LE(speed, index);
			index += 2;
			
			if ('rpm' in event) {
				flags |= IndoorFlags.cadence;
				const rpm = event.rpm;
				if (DEBUG) console.log("[IndoorBikeDataCharacteristic] rpm: " + rpm);
				buffer.writeInt16LE(rpm * 2, index);
				index += 2;
			}
			
			if ('power' in event) {
				flags |= IndoorFlags.power;
				const power = event.power;
				if (DEBUG) console.log("[IndoorBikeDataCharacteristic] power: " + power);
				buffer.writeInt16LE(power, index);
				index += 2;
			}

			if ('hr' in event) {
				flags |= IndoorFlags.heartRate;
				const hr = event.hr;
				if (DEBUG) console.log("[IndoorBikeDataCharacteristic] hr : " + hr);
				buffer.writeUInt16LE(hr, index);
				index += 2;
			}

			buffer.writeUInt16LE(flags, 0);
      		
			this._updateValueCallback(buffer);
		}
		else
		{
			if (DEBUG) console.log("[IndoorBikeDataCharacteristic] nobody is listening");
		}
		return this.RESULT_SUCCESS;
	}

};

module.exports = IndoorBikeDataCharacteristic;
