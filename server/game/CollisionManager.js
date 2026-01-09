class CollisionManager {
  constructor() {
    this.collisionCooldown = new Map();
    this.COOLDOWN_TIME = 500; // 0.5초로 줄여서 더 자주 충돌
    this.MIN_DAMAGE = 15;
    this.MAX_DAMAGE = 35;
  }

  checkCollisions(animals, onDamage) {
    const results = [];
    const aliveAnimals = animals.filter(a => a.isAlive);

    for (let i = 0; i < aliveAnimals.length; i++) {
      for (let j = i + 1; j < aliveAnimals.length; j++) {
        const a1 = aliveAnimals[i];
        const a2 = aliveAnimals[j];

        if (this.isColliding(a1, a2) && !this.isOnCooldown(a1, a2)) {
          const result = this.processCollision(a1, a2, onDamage);
          if (result) {
            results.push(result);
          }
          this.setCooldown(a1, a2);
          this.bounceAnimals(a1, a2);
        }
      }
    }

    return results;
  }

  processCollision(a1, a2, onDamage) {
    // 기본 랜덤 데미지
    let damage1 = this.getRandomDamage();
    let damage2 = this.getRandomDamage();

    // 데미지 버프 적용
    if (a2.damageBuff) {
      damage1 *= a2.damageBuff;
      a2.damageBuff = null; // 1회용
    }
    if (a1.damageBuff) {
      damage2 *= a1.damageBuff;
      a1.damageBuff = null; // 1회용
    }

    // 쉴드 적용
    if (a1.shield) {
      damage1 *= (1 - a1.shield);
      a1.shield = null; // 1회용
    }
    if (a2.shield) {
      damage2 *= (1 - a2.shield);
      a2.shield = null; // 1회용
    }

    damage1 = Math.floor(damage1);
    damage2 = Math.floor(damage2);

    a1.takeDamage(damage1);
    a2.takeDamage(damage2);

    // 데미지 콜백 호출
    if (onDamage) {
      onDamage({
        animal1: { id: a1.id, damage: damage1, hp: a1.hp, maxHp: a1.maxHp },
        animal2: { id: a2.id, damage: damage2, hp: a2.hp, maxHp: a2.maxHp }
      });
    }

    // 둘 중 하나가 죽었는지 확인
    if (a1.isDead() || a2.isDead()) {
      let winner, loser;

      if (a1.isDead() && a2.isDead()) {
        // 둘 다 죽으면 HP가 더 많이 남은 쪽이 승리 (같으면 랜덤)
        winner = a1.hp >= a2.hp ? (Math.random() < 0.5 ? a1 : a2) : a2;
        loser = winner === a1 ? a2 : a1;
        winner.hp = 1; // 승자는 HP 1로 부활
      } else {
        winner = a1.isDead() ? a2 : a1;
        loser = a1.isDead() ? a1 : a2;
      }

      loser.isAlive = false;

      return {
        type: 'death',
        winner: winner,
        loser: loser
      };
    }

    return null;
  }

  getRandomDamage() {
    return Math.floor(Math.random() * (this.MAX_DAMAGE - this.MIN_DAMAGE + 1)) + this.MIN_DAMAGE;
  }

  isColliding(a1, a2) {
    const dx = a1.x - a2.x;
    const dy = a1.y - a2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (a1.size + a2.size) / 2;

    return distance < minDistance;
  }

  bounceAnimals(a1, a2) {
    const dx = a2.x - a1.x;
    const dy = a2.y - a1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const nx = dx / dist;
    const ny = dy / dist;

    a1.vx = -nx * a1.maxSpeed * 2;
    a1.vy = -ny * a1.maxSpeed * 2;
    a2.vx = nx * a2.maxSpeed * 2;
    a2.vy = ny * a2.maxSpeed * 2;

    // 겹침 해제
    const overlap = (a1.size + a2.size) / 2 - dist;
    if (overlap > 0) {
      a1.x -= nx * overlap / 2;
      a1.y -= ny * overlap / 2;
      a2.x += nx * overlap / 2;
      a2.y += ny * overlap / 2;
    }
  }

  isOnCooldown(a1, a2) {
    const key = this.getCooldownKey(a1, a2);
    const cooldownEnd = this.collisionCooldown.get(key);
    return cooldownEnd && Date.now() < cooldownEnd;
  }

  setCooldown(a1, a2) {
    const key = this.getCooldownKey(a1, a2);
    this.collisionCooldown.set(key, Date.now() + this.COOLDOWN_TIME);
  }

  getCooldownKey(a1, a2) {
    const ids = [a1.id, a2.id].sort((a, b) => a - b);
    return `${ids[0]}-${ids[1]}`;
  }

  reset() {
    this.collisionCooldown.clear();
  }
}

module.exports = CollisionManager;
