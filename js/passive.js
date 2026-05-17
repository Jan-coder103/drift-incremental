const PASSIVE_SAVE_KEY = 'driftgame_passive';

const DRIVER_DEFS = {
  track_1: { cost: 5000, baseIncome: 200 },
};

export class PassiveIncome {
  constructor() {
    this.drivers = {};
    this.bestLapTimes = {};
    this.accumulatedMoney = 0;
    this.totalPassiveEarned = 0;
    this.saveTimer = 0;
    this.load();
  }

  getDriverCost(trackId) {
    const def = DRIVER_DEFS[trackId];
    return def ? def.cost : 10000;
  }

  getDriverBaseIncome(trackId) {
    const def = DRIVER_DEFS[trackId];
    return def ? def.baseIncome : 200;
  }

  hasDriver(trackId) {
    return !!this.drivers[trackId];
  }

  buyDriver(trackId) {
    if (this.hasDriver(trackId)) return false;
    this.drivers[trackId] = true;
    this.save();
    return true;
  }

  setBestLapTime(trackId, time) {
    if (time === null || time === undefined) return;
    if (this.bestLapTimes[trackId] === undefined || time < this.bestLapTimes[trackId]) {
      this.bestLapTimes[trackId] = time;
      this.save();
    }
  }

  getBestLapTime(trackId) {
    return this.bestLapTimes[trackId] || null;
  }

  getEarningRate(trackId, trackMoneyMultiplier) {
    if (!this.hasDriver(trackId)) return 0;
    const bestTime = this.bestLapTimes[trackId];
    if (!bestTime || bestTime <= 0) return 0;
    const baseIncome = this.getDriverBaseIncome(trackId);
    return (baseIncome * (trackMoneyMultiplier || 1.0)) / bestTime;
  }

  getTotalEarningRate(trackIds, getTrackMultiplier) {
    let total = 0;
    for (const id of trackIds) {
      total += this.getEarningRate(id, getTrackMultiplier(id));
    }
    return total;
  }

  update(dt, trackIds, getTrackMultiplier) {
    for (const id of trackIds) {
      const rate = this.getEarningRate(id, getTrackMultiplier(id));
      this.accumulatedMoney += rate * dt;
    }
    this.saveTimer += dt;
    if (this.saveTimer >= 5) {
      this.saveTimer = 0;
      this.save();
    }
  }

  collect() {
    const amount = Math.floor(this.accumulatedMoney);
    if (amount <= 0) return 0;
    this.accumulatedMoney -= amount;
    this.totalPassiveEarned += amount;
    this.save();
    return amount;
  }

  save() {
    try {
      localStorage.setItem(PASSIVE_SAVE_KEY, JSON.stringify({
        drivers: this.drivers,
        bestLapTimes: this.bestLapTimes,
        accumulatedMoney: this.accumulatedMoney,
        totalPassiveEarned: this.totalPassiveEarned,
      }));
    } catch (e) { /* ignore */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(PASSIVE_SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.drivers = data.drivers || {};
      this.bestLapTimes = data.bestLapTimes || {};
      this.accumulatedMoney = data.accumulatedMoney || 0;
      this.totalPassiveEarned = data.totalPassiveEarned || 0;
    } catch (e) { /* ignore */ }
  }

  resetSave() {
    this.drivers = {};
    this.bestLapTimes = {};
    this.accumulatedMoney = 0;
    this.totalPassiveEarned = 0;
    localStorage.removeItem(PASSIVE_SAVE_KEY);
  }
}
