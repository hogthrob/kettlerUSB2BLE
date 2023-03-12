
const EventEmitter = require('events');
var DEBUG = false;

var minGear = 1;
var maxGear = 10;

var sprockets = [34, 31, 28, 25, 22, 19, 17, 16, 15, 14, 13, 12, 11, 10];
var rings = [34, 50];

class BikeState extends EventEmitter {

	constructor() {
		super();
		console.log(`[BikeState starting]`);

		// init
		this.data = null;
		this.external = null;
		//this.external = {
		//	windspeed: 0.0,
		//	grade: 0.0,
		//	crr: 0.0,
		//	cw: 0.0
		//};
		this.mode = 'ERG'; // ERG ou SIM
		//this.mode = 'SIM';
		this.autoGears = true;
		this.gearPower = 200;
		this.kill = false;
		this.gear = 1;

		this.sprocket = 0;
		this.ring = 0;

		// this.external = {}
		// this.external.grade = 0;
	};

	emitGear() {
		//console.log("Gear = " + rings[this.ring] + ' / ' + sprockets[this.sprocket]);
		this.emit('gear', rings[this.ring] + '/' + sprockets[this.sprocket]);
	};

	// Restart the trainer
	restart() {
		this.mode = 'ERG'; // ERG ou SIM
		//this.mode = 'SIM';
		this.emit('mode', this.mode);
		// update and compute
		this.data = null;
	};

	// Set the bike under the FTMS control
	setControl() {};

	// Current state
	setData(data) {
		this.data = data;
		// update
		this.compute();
	};

	setGear(gear) {
		this.gear = gear;
		this.emit('gear', this.gear);
	}

	// Gear Up
	GearUp() {
		this.gear++;
		if (this.gear > maxGear)
			this.gear = maxGear;
		this.emit('gear', this.gear);
	};

	// Gear Down
	GearDown() {
		this.gear--;
		if (this.gear < minGear)
			this.gear = minGear;
		this.emit('gear', this.gear);
	};

	SprocketUp() {
		this.sprocket++;
		if (this.sprocket >= sprockets.length) {
			this.sprocket = sprockets[sprockets.length - 1];
		}
		this.emitGear();
	}

	SprocketDown() {
		this.sprocket--;
		if (this.sprocket < 0) {
			this.sprocket = 0;
		}
		this.emitGear();
	}

	ChangeRing() {
		if (this.ring === 0) {
			this.ring = 1;
		} else {
			this.ring = 0;
		}
		this.emitGear();
	}

	ChangeGearMode() {
		this.autoGears = !this.autoGears;

		this.emit('autoGears', this.autoGears);
	}

	GearPowerUp(amount) {
		if (amount) {
			this.gearPower += amount;
		} else {
			this.gearPower += 5;
		}

		this.emit('gearPower', this.gearPower);
	}

	GearPowerDown(amount) {
		if (amount) {
			this.gearPower -= amount;
		} else {
			this.gearPower -= 5;
		}

		this.emit('gearPower', this.gearPower);
	}

	ChangeKill() {
		this.kill = !this.kill;

		this.emit('kill', this.kill);
	}

	/* Puissance a atteindre */
	setTargetPower(power) {
		this.mode = 'ERG'; // ERG
		this.emit('mode', this.mode);
		// update and compute
		if (this.data == null)
			return;
		this.data.power = power;
		this.emit('simpower', this.data.power);
	};

	/* Modifie la puissance target */
	addPower(increment) {
		if (this.data == null)
			return;
		this.data.power += increment;
		// update and compute
		this.emit('simpower', this.data.power);
	};

	/* Mode Simulation : les conditions externes a simuler */
	setExternalCondition(windspeed, grade, crr, cw) {
		console.log("setExternalCondition");
		this.mode = 'SIM'; // ERG ou SIM
		this.emit('mode', this.mode);
		this.external = {
			windspeed: windspeed,
			grade: grade,
			crr: crr,
			cw: cw
		};
		this.emit('windspeed', (windspeed * 3.6).toFixed(1));
		this.emit('grade', (grade).toFixed(1));
	};

	// Do the math
	compute_old() {
		// rien si en mode ERG
		if (this.mode === 'ERG') {
			console.log("Mode is ERG");
			return;
		}
		// pas de data du velo : on ne peut rien faire
		if (this.data == null) {
			console.log("Data is null");
			return;
		}
		// pas de data externe : on ne peut rien faire
		if (this.external == null) {
			console.log("External is null");
			return;
		}

		// var simpower = 170 * (1 + 1.15 * (this.data.rpm - 80.0) / 80.0) * (1.0 + 3 * this.external.grade / 100.0);
		// // apply gear
		// simpower = Math.max(0.0, simpower * (1.0 + 0.1 * (this.gear - 5)));
		// // store
		// simpower = simpower.toFixed(1);

		// if (DEBUG) {
		// 	console.log('[BikeState.js] - SIM rpm: ', this.data.rpm);
		// 	console.log('[BikeState.js] - SIM pente: ', this.external.grade);
		// 	console.log('[BikeState.js] - SIM gear : ', this.gear);
		// 	console.log('[BikeState.js] - SIM calculated power: ', simpower);
		// }

		// Calculate speed from gear and rpm
		const diameter = 622;
		const tire_size = 23;
		const chainring = rings[this.ring];
		const cog = sprockets[this.sprocket];
		const cadence = this.data.rpm;
		const dist = Math.PI * (diameter + (2 * tire_size)) * (chainring/cog) * cadence
		const speed = dist / 1000000 * 60;

		this.emit('speed', (speed).toFixed(1));
		this.emit('rpm', this.data.rpm);
		this.emit('crr', this.external.crr);
		this.emit('cw', this.external.cw);

		const ms = speed / 3.6;
		const gravity = 9.8067;
		const airDensity = 1.226;
		const chainDrag = 0.98;
		const weight = 61 + 7;
		//const frontalArea = 0.47;
		const frontalArea = 0.509;
		const cd = 0.63
		const crr = 0.005

		var powerGravity = gravity * Math.sin(Math.atan(this.external.grade / 100)) * weight;
		// var powerRolling = gravity * Math.cos(Math.atan(this.external.grade / 100)) * weight * this.external.crr;
		// var powerAir = 0.5 * this.external.cw * frontalArea * airDensity * Math.pow(ms, 2);
		var powerRolling = gravity * Math.cos(Math.atan(this.external.grade / 100)) * weight * crr;
		var powerAir = 0.5 * cd * frontalArea * airDensity * Math.pow(ms, 2);

		var power = (powerGravity + powerRolling + powerAir) * ms / chainDrag;
		if (power < 0) {
			power = 0;
		}

		if (DEBUG) {
			console.log('[BikeState.js] - SIM rpm: ', this.data.rpm);
			console.log('[BikeState.js] - SIM pente: ', this.external.grade);
			//console.log('[BikeState.js] - SIM gear : ', this.gear);
			console.log('[BikeState.js] - SIM calculated power: ', power);
		}

		this.emit('simpower', Math.round(power));
	};

	compute() {
		// rien si en mode ERG
		if (this.mode === 'ERG') {
			console.log("Mode is ERG");
			return;
		}
		// pas de data du velo : on ne peut rien faire
		if (this.data == null) {
			console.log("Data is null");
			return;
		}
		// pas de data externe : on ne peut rien faire
		if (this.external == null) {
			console.log("External is null");
			return;
		}

		// Set params for calculate functions
		var params = {};
		params.rp_dtl = 0;
		params.rp_wr = 60;
		params.rp_wb = 7;
		params.ep_g = this.external.grade;
		params.ep_crr = this.external.crr;
		params.rp_a = 0.509;
		params.rp_cd = 0.63;
		params.ep_rho = 1.226;
		params.ep_headwind = 0;

		// constants for bike calculations
		const diameter = 622;
		const tire_size = 23;

		// If auto gears then calculate gear
		//console.log("this.autoGears = " + this.autoGears);
		if (this.autoGears) {
			// Increase power on uphill, decrease on downhill.
			var grade = this.external.grade;
			if (grade < 0) {
				// Zwift only uses half grade on downhill so we will double it
				grade = grade * 2;
			}
			var targetPower = this.gearPower * ((100 + (grade * 2)) / 100);

			// Adjust target power based on rpm
			var rpm = this.data.rpm;
			targetPower = targetPower * (rpm / 85);

			//console.log("targetPower = " + targetPower);

			// Get speed from power
			var kph = this.CalculateVelocity(targetPower, params);

			//console.log("kph = " + kph);

			//const dist = Math.PI * (diameter + (2 * tire_size)) * (chainring/cog) * cadence
			//const speed = dist / 1000000 * 60;

			// Calculate gear at 90 rpm
			//var kph = ms * 3.6;
			var ring = kph < 28 ? rings[0] : rings[1];
			this.ring = kph < 28 ? 0 : 1;
			var distance = (kph * 1000000) / 60;
			//var rpm = 90;
			var cog = Math.PI * (diameter + (2 * tire_size)) * (ring / distance) * rpm;

			//console.log("cog = " + cog);

			// Find closest cog
			var diff = 100;
			var index = 0;
			for (let i = 0; i < sprockets.length; i++) {
				if (Math.abs(cog - sprockets[i]) < diff) {
					diff = Math.abs(cog - sprockets[i]);
					index = i;
				}
			}
			this.sprocket = index;

			this.emitGear();
		}

		// Calculate speed
		const chainring = rings[this.ring];
		const sprocket = sprockets[this.sprocket];
		const cadence = this.data.rpm;
		const dist = Math.PI * (diameter + (2 * tire_size)) * (chainring/sprocket) * cadence
		const speed = dist / 1000000 * 60;

		// emit new values
		this.emit('speed', (speed).toFixed(1));
		this.emit('rpm', this.data.rpm);
		this.emit('crr', this.external.crr);
		this.emit('cw', this.external.cw);

		// Calculate power
		var powerValues = this.CalculatePower(speed, params);
		var power = powerValues.legpower;

		// Return the power
		this.emit('simpower', Math.round(power));
	}

	// Calculates and returns the force components needed to achieve the
	// given velocity. <params> is a dictionary containing the rider and
	// environmental parameters, as returned by ScrapeParameters(), i.e.,
	// all in metric units.  'velocity' is in km/h.
	CalculateForces(velocity, params) {
		// calculate Fgravity
		var Fgravity = 9.8067 *
			(params.rp_wr + params.rp_wb) *
			Math.sin(Math.atan(params.ep_g / 100.0));

		// calculate Frolling
		var Frolling = 9.8067 *
			(params.rp_wr + params.rp_wb) *
			Math.cos(Math.atan(params.ep_g / 100.0)) *
			(params.ep_crr);
		if (velocity < 0) {
			Frolling *= -1.0;
		}

		// calculate Fdrag
		var Fdrag = 0.5 *
			(params.rp_a) *
			(params.rp_cd) *
			(params.ep_rho) *
			((velocity + params.ep_headwind) * 1000.0 / 3600.0) *
			((velocity + params.ep_headwind) * 1000.0 / 3600.0);
		if (velocity + params.ep_headwind < 0) {
			Fdrag *= -1.0;
		}

		// cons up and return the force components
		var ret = { };
		ret.Fgravity = Fgravity;
		ret.Frolling = Frolling;
		ret.Fdrag = Fdrag;
		return ret;
	};

	// Calculates and returns the power needed to achieve the given velocity.
	//
	// <params> is a dictionary containing the rider and environmenetal
	// parameters, as returned by ScrapeParameters() in metric units.
	// 'velocity' is in km/h.
	//
	// Returns a dictionary of power parameters, in watts:
	//   ret.legpower
	//   ret.wheelpower
	//   ret.drivetrainloss
	//   ret.brakingpower
	//
	// Only one of legpower or brakingpower is greater than zero. So, if
	// the rider is pedaling, legpower (and wheelpower, drivetrainloss) are
	// positive. If the rider is braking, brakingpower is positive.
	CalculatePower(velocity, params) {
		// calculate the forces on the rider.
		var forces = this.CalculateForces(velocity, params);
		var totalforce = forces.Fgravity + forces.Frolling + forces.Fdrag;

		// calculate necessary wheelpower.
		var wheelpower = totalforce * (velocity * 1000.0 / 3600.0);

		// calculate necessary legpower. Note: if wheelpower is negative,
		// i.e., braking is needed instead of pedaling, then there is
		// no drivetrain loss.
		var drivetrainfrac = 1.0;
		if (wheelpower > 0.0) {
			drivetrainfrac = drivetrainfrac - (params.rp_dtl/100.0);
		}
		var legpower = wheelpower / drivetrainfrac;

		var ret = { };
		if (legpower > 0.0) {
			ret.legpower = legpower;
			ret.wheelpower = wheelpower;
			ret.drivetrainloss = legpower - wheelpower;
			ret.brakingpower = 0.0;
		} else {
			ret.legpower = 0.0;
			ret.wheelpower = 0.0;
			ret.drivetrainloss = 0.0;
			ret.brakingpower = legpower * -1.0;
		}

		return ret;
	};

	// Calculates the velocity obtained from a given power. <params> is a
	// dictionary containing the rider and model parameters in metric units.
	//
	// Runs a simple midpoint search, using CalculatePower().
	//
	// Returns velocity, in km/h.
	CalculateVelocity(power, params) {
		// How close to get before finishing.
		var epsilon = 0.000001;

		// Set some reasonable upper / lower starting points.
		var lowervel = -1000.0;
		var uppervel = 1000.0;
		var midvel = 0.0;
		var midpowdict = this.CalculatePower(midvel, params);

		// Iterate until completion.
		var itcount = 0;
		do {
			var midpow = this.PowDictToLegPower(midpowdict);
			if (Math.abs(midpow - power) < epsilon)
				break;

			if (midpow > power)
				uppervel = midvel;
			else
				lowervel = midvel;

			midvel = (uppervel + lowervel) / 2.0;
			midpowdict = this.CalculatePower(midvel, params);
		} while (itcount++ < 100);

		return midvel;
	};

	// Returns the legpower (negative for brakepower) from the powerdict.
	PowDictToLegPower(powdict) {
    var midpow = 0.0;
    if (powdict.brakingpower > 0.0) {
        midpow = powdict.brakingpower * -1.0;
    } else {
        midpow = powdict.legpower;
    }
    return midpow;
}
};

module.exports = BikeState
