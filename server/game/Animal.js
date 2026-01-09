const config = require('../config/gameConfig');

class Animal {
  constructor(id, type, name, emoji, x, y) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.emoji = emoji;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isAlive = true;
    this.size = config.CANVAS.ANIMAL_SIZE;
    this.maxSpeed = 5;
    this.directionChangeTimer = 0;
    this.centerBias = 0.3;

    // 체력 시스템
    this.maxHp = 100;
    this.hp = 100;
  }

  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
    return this.hp <= 0;
  }

  isDead() {
    return this.hp <= 0;
  }

  update(deltaTime, bounds) {
    if (!this.isAlive) return;

    this.directionChangeTimer -= deltaTime;

    if (this.directionChangeTimer <= 0) {
      this.changeDirection(bounds);
    }

    this.x += this.vx;
    this.y += this.vy;

    this.handleBoundaryCollision(bounds);
  }

  changeDirection(bounds) {
    const angle = Math.random() * Math.PI * 2;
    const speed = this.maxSpeed * (0.5 + Math.random() * 0.5);

    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const toCenterX = centerX - this.x;
    const toCenterY = centerY - this.y;
    const dist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY) || 1;

    this.vx = Math.cos(angle) * speed * (1 - this.centerBias) +
              (toCenterX / dist) * speed * this.centerBias;
    this.vy = Math.sin(angle) * speed * (1 - this.centerBias) +
              (toCenterY / dist) * speed * this.centerBias;

    this.directionChangeTimer = 500 + Math.random() * 1500;
  }

  handleBoundaryCollision(bounds) {
    const halfSize = this.size / 2;

    if (this.x < halfSize) {
      this.x = halfSize;
      this.vx *= -1;
    } else if (this.x > bounds.width - halfSize) {
      this.x = bounds.width - halfSize;
      this.vx *= -1;
    }

    if (this.y < halfSize) {
      this.y = halfSize;
      this.vy *= -1;
    } else if (this.y > bounds.height - halfSize) {
      this.y = bounds.height - halfSize;
      this.vy *= -1;
    }
  }

  setSpeed(multiplier) {
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      this.vx = (this.vx / currentSpeed) * this.maxSpeed * multiplier;
      this.vy = (this.vy / currentSpeed) * this.maxSpeed * multiplier;
    }
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      emoji: this.emoji,
      x: this.x,
      y: this.y,
      isAlive: this.isAlive,
      hp: this.hp,
      maxHp: this.maxHp
    };
  }
}

module.exports = Animal;
