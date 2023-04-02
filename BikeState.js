const EventEmitter = require('events');
const DEBUG = false;

// used for "simple" gearbox simulating a single chainring and any number of evenly spaced gears
const minGear = 1;
const maxGear = 20;
const gearMult = 1.1; // ratio difference between gears
const minGearRatio = 0.5; // lowest possible gear ration crank to wheel

// used for "real" bicyle gearbox simulation with multiple chain rings and sprockets
const sprockets = [34, 31, 28, 25, 22, 19, 17, 16, 15, 14, 13, 12, 11, 10]; // big to small
const rings = [34, 50]; // small to big, currently it must be exactly two of them

class BikeState extends EventEmitter {
  constructor(config = null) {
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
    this.setGear(1.0);
    this.controlMode = 'remote';
    this.SetGearMode(true);

    this.sprocket = 0;
    this.ring = 0;

    this.config = config;

    // this.external = {}
    // this.external.grade = 0;
  }

  begin()
  {
    this.SetGearMode(true);
  }

  emitGear() {
    //console.log("Gear = " + rings[this.ring] + ' / ' + sprockets[this.sprocket]);
    this.emit('gear', rings[this.ring] + '/' + sprockets[this.sprocket]);
  }

  // Restart the trainer
  restart() {
    this.mode = 'ERG'; // ERG ou SIM
    //this.mode = 'SIM';
    this.emit('mode', this.mode);
    // update and compute
    this.data = null;
  }

  // Set the bike under the FTMS control
  setControl() {}

  // Current state
  setData(data) {
    this.data = data;
    // update
    if (this.mode === 'SIM') {
      this.compute();
    }
  }

  ChangeControlMode() {
    this.controlMode = this.controlMode === 'local'? 'remote': 'local'; 
    this.emit('controlMode',this.controlMode)
  }

  setGear(gear) {
    this.gear = gear < minGear ? minGear : gear < maxGear ? Math.floor(gear) : maxGear;
    this.gearRatio = minGearRatio * Math.pow(gearMult, this.gear);
    this.emit('gear', this.gear);
  }

  // Gear Up
  GearUp() {
    this.setGear(this.gear + 1);
  }

  // Gear Down
  GearDown() {
    this.setGear(this.gear - 1);
  }

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
    this.SetGearMode(!this.autoGears);
  }

  /**
   * Enable or disable automatic gear shifting in simulation mode
   * 
   * @param {bool} autoGears true => automatic shifting enabled, otherwise manual gear shifting 
   */
  SetGearMode(autoGears = false) {
    this.autoGears = autoGears;

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
    if (this.data != null) {
      this.data.power = power;
      this.emit('simpower', this.data.power);
    }
  }

  /* Modifie la puissance target */
  addPower(increment) {
    if (this.data != null) {
      this.setTargetPower(this.data.power + increment);
    }
  }

  /* Mode Simulation : les conditions externes a simuler */
  setExternalCondition(windspeed, grade, crr, cw) {
    console.log('setExternalCondition');
    this.mode = 'SIM'; // ERG ou SIM
    this.emit('mode', this.mode);
    this.external = {
      windspeed: windspeed,
      grade: grade,
      crr: crr,
      cw: cw,
    };
    this.emit('windspeed', (windspeed * 3.6).toFixed(1));
    this.emit('grade', grade.toFixed(1));
  }

  // Do the math
  compute_old() {
    // rien si en mode ERG
    if (this.mode === 'ERG') {
      console.log('Mode is ERG');
      return;
    }
    // pas de data du velo : on ne peut rien faire
    if (this.data == null) {
      console.log('Data is null');
      return;
    }
    // pas de data externe : on ne peut rien faire
    if (this.external == null) {
      console.log('External is null');
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
    const dist = Math.PI * (diameter + 2 * tire_size) * (chainring / cog) * cadence;
    const speed = (dist / 1000000) * 60;

    this.emit('speed', speed.toFixed(1));
    this.emit('rpm', this.data.rpm);
    this.emit('crr', this.external.crr);
    this.emit('cw', this.external.cw);

    const ms = speed / 3.6;
    const gravity = this.config.physics.gravity;
    const airDensity = this.config.physics.airDensity;
    const chainDrag = 0.98;
    const weight = 61 + 7;
    //const frontalArea = 0.47;
    const frontalArea = 0.509;
    const cd = 0.63;
    const crr = 0.005;

    var powerGravity = gravity * Math.sin(Math.atan(this.external.grade / 100)) * weight;
    // var powerRolling = gravity * Math.cos(Math.atan(this.external.grade / 100)) * weight * this.external.crr;
    // var powerAir = 0.5 * this.external.cw * frontalArea * airDensity * Math.pow(ms, 2);
    var powerRolling = gravity * Math.cos(Math.atan(this.external.grade / 100)) * weight * crr;
    var powerAir = 0.5 * cd * frontalArea * airDensity * Math.pow(ms, 2);

    var power = ((powerGravity + powerRolling + powerAir) * ms) / chainDrag;
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
  }

  compute() {
    // rien si en mode ERG
    if (this.mode === 'ERG') {
      console.log('Mode is ERG');
      return;
    }
    // pas de data du velo : on ne peut rien faire
    if (this.data == null) {
      console.log('Data is null');
      return;
    }
    // pas de data externe : on ne peut rien faire
    if (this.external == null) {
      console.log('External is null');
      return;
    }

    // Set params for calculate functions
    const params = {};
    params.rp_dtl = this.config.bike.driveTrainLoss; // 3 - 5
    params.rp_wr = this.config.cyclist.weight;
    params.rp_wb = this.config.bike.weight;
    params.ep_g = this.external.grade;
    params.ep_crr = this.external.crr;
    params.rp_a = this.config.cyclist.frontalArea; //  0.65 tops, 0.514 hoods, 0.487 drops, 0.462 aerobars
    params.rp_cd = 0.63; // constant value
    params.ep_rho = this.config.physics.airDensity;
    params.ep_headwind = 0;

    // constants for bike calculations
    const diameter = this.config.bike.tireDiameter;
    const tire_size = this.config.bike.tireWidth;

    // If auto gears then calculate gear
    //console.log("this.autoGears = " + this.autoGears);
    if (this.autoGears) {
      this.autoGearRPM(params, diameter, tire_size);
    }

    // Calculate speed
    const speed = 60 * Math.PI * ((diameter + 2 * tire_size) / 1000000) * this.gearRatio * this.data.rpm;

    // Calculate power
    const powerValues = this.CalculatePower(speed, params);
    this.gearPower = Math.round(powerValues.legpower);

    // emit new values
    this.emit('speed', speed.toFixed(1));
    this.emit('rpm', this.data.rpm);
    this.emit('crr', this.external.crr);
    this.emit('cw', this.external.cw);

    // Return the power
    this.emit('simpower', this.gearPower);
    console.log(
      'Simulation',
      speed,
      this.gear,
      this.gearRatio,
      this.gearPower,
      this.external.crr,
      this.external.cw,
      this.external.grade,
      this.external.windspeed
    );
  }

  autoGearDanheron(params, diameter, tire_size) {
    // Increase power on uphill, decrease on downhill.
    var grade = this.external.grade;
    if (grade < 0) {
      // Zwift only uses half grade on downhill so we will double it
      grade = grade * 2;
    }
    const rpm = this.data.rpm;

    const targetPower = this.gearPower * ((100 + grade * 2) / 100) * (rpm / 85);
    // Adjust target power based on rpm
    //console.log("targetPower = " + targetPower);
    // Get speed from power
    const kph = this.CalculateVelocity(targetPower, params);

    //console.log("kph = " + kph);
    //const dist = Math.PI * (diameter + (2 * tire_size)) * (chainring/cog) * cadence
    //const speed = dist / 1000000 * 60;
    // Calculate gear at 90 rpm
    //var kph = ms * 3.6;
    this.ring = kph < 28 ? 0 : 1;
    const ring = rings[this.ring];

    const distance = (kph * 1000000) / 60;
    const cog = Math.PI * (diameter + 2 * tire_size) * (ring / distance) * rpm;

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

    this.gearRatio = rings[this.ring] / sprockets[this.sprocket];

    this.emitGear();
  }

  autoGearRPM(params, diameter, tire_size) {
    const rpm = this.data.rpm;

    if (rpm > 95 || (this.gearPower < 100 && rpm > 75)) {
      this.GearUp();
    } else if ((rpm < 75 && this.gearPower > 100) || rpm < 55) {
      this.GearDown();
    }
  }

  // Calculates and returns the force components needed to achieve the
  // given velocity. <params> is a dictionary containing the rider and
  // environmental parameters, as returned by ScrapeParameters(), i.e.,
  // all in metric units.  'velocity' is in km/h.
  CalculateForces(velocity, params) {
    // calculate Fgravity
    const Fgravity = 9.8067 * (params.rp_wr + params.rp_wb) * Math.sin(Math.atan(params.ep_g / 100.0));

    // calculate Frolling
    const Frolling = (velocity < 0 ? -1 : 1) * 9.8067 * (params.rp_wr + params.rp_wb) * Math.cos(Math.atan(params.ep_g / 100.0)) * params.ep_crr;

    // calculate Fdrag
    const sumWind = velocity + params.ep_headwind;
    const Fdrag = (sumWind < 0 ? -0.5 : 0.5) * params.rp_a * params.rp_cd * params.ep_rho * Math.pow((sumWind * 1000.0) / 3600.0, 2);

    // cons up and return the force components
    return { Fgravity, Frolling, Fdrag };
  }

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
    const forces = this.CalculateForces(velocity, params);
    const totalforce = forces.Fgravity + forces.Frolling + forces.Fdrag;

    // calculate necessary wheelpower.
    const wheelpower = totalforce * ((velocity * 1000.0) / 3600.0);

    // calculate necessary legpower. Note: if wheelpower is negative,
    // i.e., braking is needed instead of pedaling, then there is
    // no drivetrain loss.
    const drivetrainfrac = 1.0 - (wheelpower > 0.0 ? params.rp_dtl / 100.0 : 0);

    const legpower = wheelpower / drivetrainfrac;

    return legpower > 0.0
      ? {
          legpower,
          wheelpower,
          drivetrainloss: legpower - wheelpower,
          brakingpower: 0.0,
        }
      : {
          legpower: 0.0,
          wheelpower: 0.0,
          drivetrainloss: 0.0,
          brakingpower: legpower * -1.0,
        };
  }

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
      if (Math.abs(midpow - power) < epsilon) break;

      if (midpow > power) uppervel = midvel;
      else lowervel = midvel;

      midvel = (uppervel + lowervel) / 2.0;
      midpowdict = this.CalculatePower(midvel, params);
    } while (itcount++ < 100);

    return midvel;
  }

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
}

module.exports = BikeState;
