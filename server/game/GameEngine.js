const Animal = require('./Animal');
const CollisionManager = require('./CollisionManager');
const TimingController = require('./TimingController');
const config = require('../config/gameConfig');

class GameEngine {
  constructor(roomId, onPositionUpdate, onAnimalEaten, onGameEnd, onDamage) {
    this.roomId = roomId;
    this.animals = [];
    this.timingController = new TimingController();
    this.collisionManager = new CollisionManager();
    this.gameLoop = null;
    this.isRunning = false;
    this.lastUpdateTime = null;

    this.onPositionUpdate = onPositionUpdate || (() => {});
    this.onAnimalEaten = onAnimalEaten || (() => {});
    this.onGameEnd = onGameEnd || (() => {});
    this.onDamage = onDamage || (() => {});
  }

  initializeGame() {
    this.animals = [];
    const centerX = config.CANVAS.WIDTH / 2;
    const centerY = config.CANVAS.HEIGHT / 2;
    const radius = 180;

    config.ANIMALS.forEach((animalData, index) => {
      const angle = (index / 8) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const animal = new Animal(
        animalData.id,
        animalData.type,
        animalData.name,
        animalData.emoji,
        x,
        y
      );

      animal.changeDirection({
        width: config.CANVAS.WIDTH,
        height: config.CANVAS.HEIGHT
      });

      this.animals.push(animal);
    });

    this.collisionManager.reset();
    this.timingController.reset();
  }

  start() {
    this.initializeGame();
    this.timingController.start();
    this.isRunning = true;
    this.lastUpdateTime = Date.now();

    this.gameLoop = setInterval(() => this.update(), config.POSITION_UPDATE_RATE);
  }

  update() {
    if (!this.isRunning) return;

    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    const bounds = {
      width: config.CANVAS.WIDTH,
      height: config.CANVAS.HEIGHT
    };

    const centerBias = this.timingController.getCenterBias();
    const speedMultiplier = this.timingController.getSpeedMultiplier();

    this.animals.forEach(animal => {
      if (animal.isAlive) {
        animal.centerBias = centerBias;
        animal.update(deltaTime, bounds);
        animal.setSpeed(speedMultiplier);
      }
    });

    if (this.timingController.shouldForceCollision()) {
      this.forceCollision();
    }

    // 충돌 체크 및 체력 감소 처리
    const collisionResults = this.collisionManager.checkCollisions(
      this.animals,
      (damageInfo) => {
        // 데미지 이벤트 전송
        this.onDamage(damageInfo);
      }
    );

    // 사망 이벤트 처리
    collisionResults.forEach(result => {
      if (result.type === 'death') {
        this.timingController.onElimination();

        this.onAnimalEaten({
          winner: result.winner.toJSON(),
          loser: result.loser.toJSON(),
          remainingCount: this.animals.filter(a => a.isAlive).length
        });
      }
    });

    const positions = this.animals.map(a => a.toJSON());
    this.onPositionUpdate(positions);

    const aliveAnimals = this.animals.filter(a => a.isAlive);
    if (aliveAnimals.length === 1) {
      this.endGame(aliveAnimals[0]);
    }
  }

  forceCollision() {
    const alive = this.animals.filter(a => a.isAlive);
    if (alive.length < 2) return;

    let minDist = Infinity;
    let pair = null;

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const dx = alive[i].x - alive[j].x;
        const dy = alive[i].y - alive[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          pair = [alive[i], alive[j]];
        }
      }
    }

    if (pair) {
      const [a1, a2] = pair;
      const dx = a2.x - a1.x;
      const dy = a2.y - a1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      a1.vx = (dx / dist) * a1.maxSpeed * 2;
      a1.vy = (dy / dist) * a1.maxSpeed * 2;
      a2.vx = (-dx / dist) * a2.maxSpeed * 2;
      a2.vy = (-dy / dist) * a2.maxSpeed * 2;
    }
  }

  endGame(winner) {
    this.isRunning = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }

    this.onGameEnd({
      winner: winner.toJSON(),
      duration: Date.now() - this.timingController.startTime
    });
  }

  stop() {
    this.isRunning = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  getState() {
    return {
      animals: this.animals.map(a => a.toJSON()),
      isRunning: this.isRunning,
      elapsed: this.timingController.getElapsedTime(),
      remainingCount: this.animals.filter(a => a.isAlive).length
    };
  }
}

module.exports = GameEngine;
