const SAVE_KEY = 'driftgame_save';

const CAR_UPGRADE_DEFS = {
  xpMultiplier: {
    name: 'XP Boost',
    description: 'Increase XP earned per run',
    maxLevel: 5,
    costs: [500, 1500, 4000, 10000, 25000],
    perLevel: 0.5,
  },
  moneyMultiplier: {
    name: 'Money Boost',
    description: 'Increase money earned per run',
    maxLevel: 5,
    costs: [500, 1500, 4000, 10000, 25000],
    perLevel: 0.5,
  },
};

const TRACK_UPGRADE_DEFS = {
  earningMultiplier: {
    name: 'Track Earnings',
    description: 'Increase earning multiplier for this track',
    maxLevel: 5,
    costs: [300, 1000, 3000, 8000, 20000],
    perLevel: 0.25,
  },
};

export class UpgradeSystem {
  constructor() {
    this.money = 0;
    this.xp = 0;
    this.totalXp = 0;
    this.level = 1;
    this.carUpgrades = { xpMultiplier: 0, moneyMultiplier: 0 };
    this.trackUpgrades = {};
    this.unlockedTracks = ['track_1'];
    this.load();
  }

  getXpMultiplier() {
    return 1.0 + (this.carUpgrades.xpMultiplier || 0) * CAR_UPGRADE_DEFS.xpMultiplier.perLevel;
  }

  getMoneyMultiplier() {
    return 1.0 + (this.carUpgrades.moneyMultiplier || 0) * CAR_UPGRADE_DEFS.moneyMultiplier.perLevel;
  }

  getTrackMultiplier(trackId) {
    const track = this.trackUpgrades[trackId];
    if (!track) return 1.0;
    return 1.0 + (track.earningMultiplier || 0) * TRACK_UPGRADE_DEFS.earningMultiplier.perLevel;
  }

  getCarUpgradeDef(key) {
    return CAR_UPGRADE_DEFS[key];
  }

  getTrackUpgradeDef(key) {
    return TRACK_UPGRADE_DEFS[key];
  }

  getCarUpgradeCost(key) {
    const def = CAR_UPGRADE_DEFS[key];
    const level = this.carUpgrades[key] || 0;
    if (level >= def.maxLevel) return null;
    return def.costs[level];
  }

  getTrackUpgradeCost(trackId, key) {
    const def = TRACK_UPGRADE_DEFS[key];
    if (!this.trackUpgrades[trackId]) this.trackUpgrades[trackId] = {};
    const level = this.trackUpgrades[trackId][key] || 0;
    if (level >= def.maxLevel) return null;
    return def.costs[level];
  }

  buyCarUpgrade(key) {
    const cost = this.getCarUpgradeCost(key);
    if (cost === null || this.money < cost) return false;
    this.money -= cost;
    this.carUpgrades[key] = (this.carUpgrades[key] || 0) + 1;
    this.save();
    return true;
  }

  buyTrackUpgrade(trackId, key) {
    const cost = this.getTrackUpgradeCost(trackId, key);
    if (cost === null || this.money < cost) return false;
    this.money -= cost;
    if (!this.trackUpgrades[trackId]) this.trackUpgrades[trackId] = {};
    this.trackUpgrades[trackId][key] = (this.trackUpgrades[trackId][key] || 0) + 1;
    this.save();
    return true;
  }

  addRewards(xp, money) {
    this.xp += xp;
    this.totalXp += xp;
    this.money += money;
    this._checkLevelUp();
    this.save();
  }

  _checkLevelUp() {
    const threshold = this._xpForNextLevel();
    if (this.xp >= threshold) {
      this.xp -= threshold;
      this.level++;
    }
  }

  _xpForNextLevel() {
    return 100 + (this.level - 1) * 75;
  }

  isTrackUnlocked(trackId) {
    return this.unlockedTracks.includes(trackId);
  }

  canUnlockTrack(trackId, trackDef) {
    if (this.isTrackUnlocked(trackId)) return false;
    if (this.level < trackDef.requiredLevel) return false;
    if (this.money < trackDef.costToUnlock) return false;
    return true;
  }

  unlockTrack(trackId, cost) {
    if (this.isTrackUnlocked(trackId)) return false;
    if (this.money < cost) return false;
    this.money -= cost;
    this.unlockedTracks.push(trackId);
    this.save();
    return true;
  }

  getTrackUnlockStatus(trackId, trackDef) {
    if (this.isTrackUnlocked(trackId)) {
      return { unlocked: true, canUnlock: false, reason: 'Unlocked' };
    }
    if (this.level < trackDef.requiredLevel) {
      return { unlocked: false, canUnlock: false, reason: `Requires Level ${trackDef.requiredLevel}` };
    }
    if (this.money < trackDef.costToUnlock) {
      return { unlocked: false, canUnlock: false, reason: `Requires $${trackDef.costToUnlock.toLocaleString()}` };
    }
    return { unlocked: false, canUnlock: true, reason: 'Unlock' };
  }

  getXpProgress() {
    const threshold = this._xpForNextLevel();
    return this.xp / threshold;
  }

  save() {
    const data = {
      money: this.money,
      xp: this.xp,
      totalXp: this.totalXp,
      level: this.level,
      carUpgrades: { ...this.carUpgrades },
      trackUpgrades: JSON.parse(JSON.stringify(this.trackUpgrades)),
      unlockedTracks: [...this.unlockedTracks],
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.money = data.money || 0;
      this.xp = data.xp || 0;
      this.totalXp = data.totalXp || 0;
      this.level = data.level || 1;
      if (data.carUpgrades) this.carUpgrades = { ...this.carUpgrades, ...data.carUpgrades };
      if (data.trackUpgrades) this.trackUpgrades = data.trackUpgrades;
      if (data.unlockedTracks) this.unlockedTracks = data.unlockedTracks;
    } catch (e) { }
  }

  resetSave() {
    this.money = 0;
    this.xp = 0;
    this.totalXp = 0;
    this.level = 1;
    this.carUpgrades = { xpMultiplier: 0, moneyMultiplier: 0 };
    this.trackUpgrades = {};
    this.unlockedTracks = ['track_1'];
    localStorage.removeItem(SAVE_KEY);
  }
}
