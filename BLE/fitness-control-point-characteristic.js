
const Bleno = require('@abandonware/bleno');
const DEBUG = true;

// Spec
// Control point op code
const ControlPointOpCode = {
	requestControl: 0x00,
	resetControl: 0x01,
	setTargetSpeed: 0x02,
	setTargetInclincation: 0x03,
	setTargetResistanceLevel: 0x04,
	setTargetPower: 0x05,
	setTargetHeartRate: 0x06,
	startOrResume: 0x07,
	stopOrPause: 0x08,
	setTargetedExpendedEnergy: 0x09,
	setTargetedNumberOfSteps: 0x0A,
	setTargetedNumberOfStrides: 0x0B,
	setTargetedDistance: 0x0C,
	setTargetedTrainingTime: 0x0D,
	setTargetedTimeInTwoHeartRateZones: 0x0E,
	setTargetedTimeInThreeHeartRateZones: 0x0F,
	setTargetedTimeInFiveHeartRateZones: 0x10,
	setIndoorBikeSimulationParameters: 0x11,
	setWheelCircumference: 0x12,
	spinDownControl: 0x13,
	setTargetedCadence: 0x14,
	responseCode: 0x80
};

const ResultCode = {
	reserved: 0x00,
	success: 0x01,
	opCodeNotSupported: 0x02,
	invalidParameter: 0x03,
	operationFailed: 0x04,
	controlNotPermitted: 0x05
};

class FitnessControlPoint extends Bleno.Characteristic {

	constructor(callback) {
		super({
			uuid: '2AD9',
			value: null,
			properties: ['write', 'indicate'],
		});

		this.underControl = false;
		if (!callback)
			throw "callback can't be null";
		this.ClientCallback = callback;
		this.serverCallback = () => {};
	}
	
	
	onSubscribe(maxValueSize, updateValueCallback) {
		if (DEBUG)
			console.log('[FitnessControlPoint] onSubscribe');
		this.serverCallback = updateValueCallback;
		return this.RESULT_SUCCESS;
	};

	onUnsubscribe() {
		if (DEBUG)
			console.log('[FitnessControlPoint] onUnsubscribe');
		this.serverCallback = () => {};
		return this.RESULT_UNLIKELY_ERROR;
	};

	onIndicate() {
		if (DEBUG)
			console.log('[FitnessControlPoint] onIndicate');
	};

	// Follow Control Point instruction from the client
	onWriteRequest(data, offset, withoutResponse, callback) {
		const state = data.readUInt8(0);
		callback(this.RESULT_SUCCESS);
		 
		switch (state) {
		case ControlPointOpCode.requestControl:
			if (DEBUG)
				console.log('[FitnessControlPoint] ControlPointOpCode.requestControl.');
			if (!this.underControl) {
				if (this.ClientCallback('control')) {
					if (DEBUG)
						console.log('[FitnessControlPoint] control succeeded.');
					this.underControl = true;
					this.serverCallback(this.buildResponse(state, ResultCode.success)); // ok
				} else {
					if (DEBUG)
						console.log('[FitnessControlPoint] control aborted.');
					this.serverCallback(this.buildResponse(state, ResultCode.operationFailed));
				}
			} else {
				if (DEBUG)
					console.log('[FitnessControlPoint] allready controled.');
				this.serverCallback(this.buildResponse(state, ResultCode.success));
			}
			break;

		case ControlPointOpCode.resetControl:
			if (DEBUG)
				console.log('[FitnessControlPoint] ControlPointOpCode.resetControl.');
			if (this.underControl) {
				// reset the bike
				if (this.ClientCallback('reset')) {
					this.underControl = false;
					this.serverCallback(this.buildResponse(state, ResultCode.success)); // ok
				} else {
					if (DEBUG)
						console.log('[FitnessControlPoint] control reset controled.');
					this.serverCallback(this.buildResponse(state, ResultCode.operationFailed));
				}
			} else {
				if (DEBUG)
					console.log('[FitnessControlPoint] reset without control.');
				this.serverCallback(this.buildResponse(state, ResultCode.controlNotPermitted));
			}
			break;

		case ControlPointOpCode.setTargetPower:
			const watt = data.readUInt16LE(1);
				
			if (DEBUG)
				console.log('[FitnessControlPoint] ControlPointOpCode.setTargetPower: ', watt);
			if (this.underControl) {
				if (DEBUG)
					console.log('[FitnessControlPoint] watt : ' + watt);
				if (this.ClientCallback('power', watt)) {
					this.serverCallback(this.buildResponse(state, ResultCode.success)); // ok
				} else {
					if (DEBUG)
						console.log('[FitnessControlPoint] setTarget failed');
					this.serverCallback(this.buildResponse(state, ResultCode.operationFailed));
				}
			} else {
				if (DEBUG)
					console.log('[FitnessControlPoint] setTargetPower without control.');
				this.serverCallback(this.buildResponse(state, ResultCode.controlNotPermitted));
			}
			break;

		case ControlPointOpCode.startOrResume:
			if (DEBUG)
				console.log('[FitnessControlPoint] ControlPointOpCode.startOrResume');
			if (this.ClientCallback('start')) {
					this.serverCallback(this.buildResponse(state, ResultCode.success)); // ok
			} else {
				if (DEBUG) {
					console.log('[FitnessControlPoint] setTarget failed');
				}
				this.serverCallback(this.buildResponse(state, ResultCode.operationFailed));
			}	
			break;

		case ControlPointOpCode.stopOrPause:
			if (DEBUG) {
				console.log('[FitnessControlPoint] ControlPointOpCode.stopOrPause');
			}

			if (this.ClientCallback('stop')) {
					this.serverCallback(this.buildResponse(state, ResultCode.success)); // ok
			} else {
				if (DEBUG) {
					console.log('[FitnessControlPoint] setTarget failed');
				}
				this.serverCallback(this.buildResponse(state, ResultCode.operationFailed));
			}	
			break;

		case ControlPointOpCode.setIndoorBikeSimulationParameters:
			if (DEBUG)
				console.log('[FitnessControlPoint] ControlPointOpCode.setIndoorBikeSimulationParameters');
			const windspeed = data.readInt16LE(1) * 0.001;
			const grade = data.readInt16LE(3) * 0.01;
			const crr = data.readUInt8(5) * 0.0001;
			const cw = data.readUInt8(6) * 0.01;
			if (this.ClientCallback('simulation', windspeed, grade, crr, cw)) {
				this.serverCallback(this.buildResponse(state, ResultCode.success));
			} else {
				if (DEBUG)
					console.log('[FitnessControlPoint] simulation failed');
				this.serverCallback(this.buildResponse(state, ResultCode.operationFailed));
			}
			break;

		default: // anything else : not yet implemented
			if (DEBUG)
				console.log('[FitnessControlPoint] State is not supported ' + state + '.');
			this.serverCallback(this.buildResponse(state, ResultCode.opCodeNotSupported));
			break;
		}
	};

	// Return the result message
	buildResponse(opCode, resultCode) {
		const buffer = Buffer.alloc(3);
		buffer.writeUInt8(0x80, 0);
		buffer.writeUInt8(opCode, 1);
		buffer.writeUInt8(resultCode, 2);
		return buffer;
	};

};

module.exports = FitnessControlPoint;
