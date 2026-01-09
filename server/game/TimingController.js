const config = require('../config/gameConfig');

class TimingController {
  constructor() {
    this.TARGET_MIN = config.TARGET_DURATION_MIN;
    this.TARGET_MAX = config.TARGET_DURATION_MAX;
    this.startTime = null;
    this.targetEndTime = null;
    this.animalsRemaining = 8;
    this.eliminationSchedule = [];
    this.lastEliminationTime = null;
  }

  start() {
    this.startTime = Date.now();
    this.targetEndTime = this.startTime +
      this.TARGET_MIN +
      Math.random() * (this.TARGET_MAX - this.TARGET_MIN);

    this.animalsRemaining = 8;
    this.scheduleEliminations();
    this.lastEliminationTime = this.startTime;
  }

  scheduleEliminations() {
    const totalDuration = this.targetEndTime - this.startTime;
    const eliminations = 7;
    this.eliminationSchedule = [];

    for (let i = 0; i < eliminations; i++) {
      const baseTime = (totalDuration / eliminations) * (i + 1);
      const variation = (Math.random() - 0.5) * 0.3 * (totalDuration / eliminations);
      this.eliminationSchedule.push(this.startTime + baseTime + variation);
    }

    this.eliminationSchedule.sort((a, b) => a - b);
  }

  getElapsedTime() {
    return Date.now() - this.startTime;
  }

  getProgress() {
    const elapsed = this.getElapsedTime();
    const totalDuration = this.targetEndTime - this.startTime;
    return Math.min(1, elapsed / totalDuration);
  }

  shouldTriggerEat() {
    if (this.animalsRemaining <= 1) return false;

    const now = Date.now();
    const nextScheduledElim = this.eliminationSchedule[0];

    if (!nextScheduledElim) return false;

    const timeSinceLastElim = now - this.lastEliminationTime;
    const timeUntilScheduled = nextScheduledElim - now;

    if (timeUntilScheduled < -3000) {
      return true;
    }

    if (timeUntilScheduled < 0) {
      return Math.random() < 0.7;
    }

    if (timeUntilScheduled < 2000 && timeSinceLastElim > 3000) {
      return Math.random() < 0.4;
    }

    return Math.random() < 0.15;
  }

  onElimination() {
    this.animalsRemaining--;
    this.eliminationSchedule.shift();
    this.lastEliminationTime = Date.now();
  }

  getCenterBias() {
    const progress = this.getProgress();
    return 0.2 + progress * 0.5;
  }

  getSpeedMultiplier() {
    const progress = this.getProgress();
    return 1 + progress * 0.5;
  }

  shouldForceCollision() {
    if (this.animalsRemaining <= 1) return false;

    const now = Date.now();
    const nextScheduledElim = this.eliminationSchedule[0];

    if (!nextScheduledElim) return false;

    return now > nextScheduledElim + 5000;
  }

  reset() {
    this.startTime = null;
    this.targetEndTime = null;
    this.animalsRemaining = 8;
    this.eliminationSchedule = [];
    this.lastEliminationTime = null;
  }
}

module.exports = TimingController;
