export class DriftScorer {
  constructor() {
    this.driftAngleThreshold = 0.18;
    this.speedThreshold = 5;

    this.isDrifting = false;
    this.currentDriftAngle = 0;
    this.currentDriftPoints = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.totalDriftPoints = 0;
    this.maxComboMultiplier = 5.0;
    this.comboIncreaseInterval = 0.5;
    this.comboIncreaseAmount = 0.2;

    this.driftLost = false;
    this.driftLostTimer = 0;
    this.driftLostPoints = 0;

    this.recentlyBanked = false;
    this.bankTimer = 0;
    this.bankDisplayPoints = 0;
  }

  update(car, dt, hitWall = false) {
    this.currentDriftAngle = car.getDriftAngle();
    const speed = car.getSpeed();

    this.driftLost = false;
    this.recentlyBanked = false;

    if (hitWall && this.isDrifting) {
      this.driftLostPoints = Math.floor(this.currentDriftPoints);
      this.isDrifting = false;
      this.currentDriftPoints = 0;
      this.comboMultiplier = 1.0;
      this.comboTimer = 0;
      this.driftLost = true;
      this.driftLostTimer = 1.5;
      return;
    }

    if (this.bankTimer > 0) {
      this.bankTimer -= dt;
      if (this.bankTimer <= 0) {
        this.bankDisplayPoints = 0;
      }
    }

    if (this.currentDriftAngle > this.driftAngleThreshold && speed > this.speedThreshold) {
      if (!this.isDrifting) {
        this.isDrifting = true;
        this.currentDriftPoints = 0;
        this.comboMultiplier = 1.0;
        this.comboTimer = 0;
      }

      const points = speed * this.currentDriftAngle * this.comboMultiplier * dt * 10;
      this.currentDriftPoints += points;

      this.comboTimer += dt;
      if (this.comboTimer >= this.comboIncreaseInterval) {
        this.comboTimer -= this.comboIncreaseInterval;
        this.comboMultiplier = Math.min(
          this.maxComboMultiplier,
          this.comboMultiplier + this.comboIncreaseAmount
        );
      }
    } else if (this.isDrifting) {
      this.totalDriftPoints += this.currentDriftPoints;
      this.bankDisplayPoints = Math.floor(this.currentDriftPoints);
      this.recentlyBanked = true;
      this.bankTimer = 1.5;
      this.isDrifting = false;
      this.currentDriftPoints = 0;
      this.comboMultiplier = 1.0;
      this.comboTimer = 0;
    }

    if (this.driftLostTimer > 0) {
      this.driftLostTimer -= dt;
    }
  }

  reset() {
    this.isDrifting = false;
    this.currentDriftAngle = 0;
    this.currentDriftPoints = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.totalDriftPoints = 0;
    this.driftLost = false;
    this.driftLostTimer = 0;
    this.driftLostPoints = 0;
    this.recentlyBanked = false;
    this.bankTimer = 0;
    this.bankDisplayPoints = 0;
  }

  getDisplayPoints() {
    if (this.isDrifting) {
      return Math.floor(this.currentDriftPoints);
    }
    return Math.floor(this.totalDriftPoints);
  }

  getTotalPoints() {
    return Math.floor(this.totalDriftPoints + (this.isDrifting ? this.currentDriftPoints : 0));
  }

  getDriftAngleDegrees() {
    return Math.round(this.currentDriftAngle * (180 / Math.PI));
  }
}
