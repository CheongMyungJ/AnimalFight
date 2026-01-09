const Animal = require('./Animal');
const CollisionManager = require('./CollisionManager');
const TimingController = require('./TimingController');
const config = require('../config/gameConfig');

class GameEngine {
  constructor(roomId, onPositionUpdate, onAnimalEaten, onGameEnd, onDamage, onItemSpawn, onItemPickup) {
    this.roomId = roomId;
    this.animals = [];
    this.items = [];
    this.itemIdCounter = 0;
    this.timingController = new TimingController();
    this.collisionManager = new CollisionManager();
    this.gameLoop = null;
    this.itemSpawnTimer = null;
    this.isRunning = false;
    this.lastUpdateTime = null;

    this.onPositionUpdate = onPositionUpdate || (() => {});
    this.onAnimalEaten = onAnimalEaten || (() => {});
    this.onGameEnd = onGameEnd || (() => {});
    this.onDamage = onDamage || (() => {});
    this.onItemSpawn = onItemSpawn || (() => {});
    this.onItemPickup = onItemPickup || (() => {});
  }

  initializeGame() {
    this.animals = [];
    this.items = [];
    this.itemIdCounter = 0;
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

  spawnItem() {
    if (this.items.length >= config.ITEM_MAX_COUNT) return;

    const padding = 50;
    const x = padding + Math.random() * (config.CANVAS.WIDTH - padding * 2);
    const y = padding + Math.random() * (config.CANVAS.HEIGHT - padding * 2);

    const itemType = config.ITEMS[Math.floor(Math.random() * config.ITEMS.length)];

    const item = {
      id: this.itemIdCounter++,
      type: itemType.type,
      name: itemType.name,
      emoji: itemType.emoji,
      effect: itemType.effect,
      x: x,
      y: y,
      size: config.ITEM_SIZE
    };

    this.items.push(item);
    this.onItemSpawn(item);
  }

  checkItemCollisions() {
    const itemSize = config.ITEM_SIZE;

    this.animals.forEach(animal => {
      if (!animal.isAlive) return;

      this.items = this.items.filter(item => {
        const dx = animal.x - item.x;
        const dy = animal.y - item.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (animal.size + itemSize) / 2;

        if (distance < minDistance) {
          this.applyItemEffect(animal, item);
          this.onItemPickup({
            animalId: animal.id,
            animalName: animal.name,
            animalEmoji: animal.emoji,
            item: item
          });
          return false; // 아이템 제거
        }
        return true;
      });
    });
  }

  applyItemEffect(animal, item) {
    switch (item.type) {
      case 'health':
        animal.hp = Math.min(animal.maxHp, animal.hp + item.effect.hp);
        break;
      case 'speed':
        animal.speedBuff = {
          multiplier: item.effect.speedMultiplier,
          endTime: Date.now() + item.effect.duration
        };
        break;
      case 'damage':
        animal.damageBuff = item.effect.damageMultiplier;
        break;
      case 'shield':
        animal.shield = item.effect.damageReduction;
        break;
    }
  }

  start() {
    this.initializeGame();
    this.timingController.start();
    this.isRunning = true;
    this.lastUpdateTime = Date.now();

    this.gameLoop = setInterval(() => this.update(), config.POSITION_UPDATE_RATE);

    // 아이템 스폰 타이머
    this.itemSpawnTimer = setInterval(() => {
      if (this.isRunning) {
        this.spawnItem();
      }
    }, config.ITEM_SPAWN_INTERVAL);

    // 첫 아이템 즉시 스폰
    setTimeout(() => this.spawnItem(), 2000);
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

        // 스피드 버프 적용
        let finalSpeedMult = speedMultiplier;
        if (animal.speedBuff && now < animal.speedBuff.endTime) {
          finalSpeedMult *= animal.speedBuff.multiplier;
        } else if (animal.speedBuff) {
          animal.speedBuff = null; // 버프 만료
        }
        animal.setSpeed(finalSpeedMult);
      }
    });

    // 아이템 충돌 체크
    this.checkItemCollisions();

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
    if (this.itemSpawnTimer) {
      clearInterval(this.itemSpawnTimer);
      this.itemSpawnTimer = null;
    }
  }

  getState() {
    return {
      animals: this.animals.map(a => a.toJSON()),
      items: this.items,
      isRunning: this.isRunning,
      elapsed: this.timingController.getElapsedTime(),
      remainingCount: this.animals.filter(a => a.isAlive).length
    };
  }
}

module.exports = GameEngine;
