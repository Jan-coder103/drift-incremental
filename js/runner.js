export class RunTracker {
  constructor(track) {
    this.track = track;
    this.isRunning = false;
    this.isFinished = false;
    this.runTime = 0;
    this.bestRunTime = track.bestLapTime || null;
    this.newBestThisRun = false;

    this.startZoneSize = 8;
    this.finishZoneSize = 10;
    this.lastTrackIndex = 0;
    this.trackProgress = 0;

    this.ghostRecording = [];
    this.ghostRecordInterval = 0.033;
    this.ghostRecordTimer = 0;

    this.runStartedThisFrame = false;
    this.runFinishedThisFrame = false;

    this.xpEarned = 0;
    this.moneyEarned = 0;
    this.totalDriftAtEnd = 0;
  }

  update(car, dt, totalDriftPoints) {
    this.runStartedThisFrame = false;
    this.runFinishedThisFrame = false;

    if (this.isFinished) return;

    const closest = this.track.getClosestPoint(car.position);
    this.lastTrackIndex = closest.index;
    this.trackProgress = closest.index / this.track.sampleCount;

    if (!this.isRunning) {
      if (closest.index <= this.startZoneSize && car.getSpeed() > 2) {
        this.isRunning = true;
        this.runTime = 0;
        this.ghostRecording = [];
        this.ghostRecordTimer = 0;
        this.runStartedThisFrame = true;
      }
      return;
    }

    this.runTime += dt;

    this.ghostRecordTimer += dt;
    if (this.ghostRecordTimer >= this.ghostRecordInterval) {
      this.ghostRecordTimer -= this.ghostRecordInterval;
      this.ghostRecording.push({
        time: this.runTime,
        position: car.position.clone(),
        rotation: car.yaw,
      });
    }

    if (closest.index >= this.track.sampleCount - this.finishZoneSize) {
      this.isFinished = true;
      this.runFinishedThisFrame = true;
      this.totalDriftAtEnd = totalDriftPoints;
      this._calculateRewards(totalDriftPoints);

      if (this.bestRunTime === null || this.runTime < this.bestRunTime) {
        this.bestRunTime = this.runTime;
        this.track.bestLapTime = this.runTime;
        this.track.ghostData = [...this.ghostRecording];
        this.newBestThisRun = true;
      }
    }
  }

  _calculateRewards(totalDriftPoints) {
    const trackMult = this.track.baseMoneyMultiplier;
    const carMult = 1.0;

    const base = totalDriftPoints;
    this.xpEarned = Math.floor(base * trackMult);
    this.moneyEarned = Math.floor(base * trackMult * carMult);

    const trackLength = this.track.getTrackLength();
    const avgSpeed = trackLength / this.runTime;
    if (avgSpeed > 15) {
      const speedBonus = Math.floor(avgSpeed * 3);
      this.xpEarned += speedBonus;
      this.moneyEarned += speedBonus;
    }

    if (this.bestRunTime !== null && this.runTime < this.bestRunTime) {
      const bestBonus = Math.floor(50 * trackMult);
      this.xpEarned += bestBonus;
      this.moneyEarned += bestBonus;
    }
  }

  reset() {
    this.isRunning = false;
    this.isFinished = false;
    this.runTime = 0;
    this.trackProgress = 0;
    this.ghostRecording = [];
    this.ghostRecordTimer = 0;
    this.runStartedThisFrame = false;
    this.runFinishedThisFrame = false;
    this.newBestThisRun = false;
    this.xpEarned = 0;
    this.moneyEarned = 0;
    this.totalDriftAtEnd = 0;
  }

  getFormattedTime() {
    return this._formatTime(this.runTime);
  }

  getFormattedBestTime() {
    return this.bestRunTime !== null ? this._formatTime(this.bestRunTime) : '--:--.---';
  }

  _formatTime(t) {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
}
