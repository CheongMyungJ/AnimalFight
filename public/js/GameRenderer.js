class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animals = [];
    this.animationId = null;
    this.eatAnimations = [];
    this.damageAnimations = [];
    this.images = {};
    this.imagesLoaded = false;
  }

  async loadImages() {
    const animalTypes = ['lion', 'tiger', 'bear', 'wolf', 'eagle', 'shark', 'snake', 'crocodile'];

    const loadPromises = animalTypes.map(type => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.images[type] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load image for ${type}, will use emoji fallback`);
          resolve();
        };
        img.src = `/assets/images/animals/${type}.svg`;
      });
    });

    await Promise.all(loadPromises);
    this.imagesLoaded = true;
    console.log('Animal images loaded');
  }

  updateAnimals(positions) {
    this.animals = positions;
  }

  async startRendering() {
    if (!this.imagesLoaded) {
      await this.loadImages();
    }

    const render = () => {
      this.render();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  stopRendering() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  render() {
    this.clearCanvas();
    this.drawBackground();
    this.drawAnimals();
    this.drawDamageAnimations();
    this.drawEatAnimations();
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#2d5016');
    gradient.addColorStop(1, '#1a3d0c');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }
    for (let i = 0; i < this.canvas.height; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }
  }

  drawAnimals() {
    this.animals.forEach(animal => {
      if (animal.isAlive) {
        this.drawAnimal(animal);
      }
    });
  }

  drawAnimal(animal) {
    const { x, y, type, emoji, name } = animal;
    const hp = animal.hp !== undefined ? animal.hp : 100;
    const maxHp = animal.maxHp !== undefined ? animal.maxHp : 100;
    const size = 60;

    this.ctx.save();

    // Shadow
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;

    // White circle background
    this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Draw image or emoji fallback
    const img = this.images[type];
    if (img) {
      this.ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
      // Emoji fallback
      this.ctx.font = `${size - 10}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(emoji, x, y);
    }

    // Health bar
    const hpBarWidth = 50;
    const hpBarHeight = 8;
    const hpBarX = x - hpBarWidth / 2;
    const hpBarY = y - size / 2 - 15;
    const hpPercent = hp / maxHp;

    // Background (black)
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(hpBarX - 1, hpBarY - 1, hpBarWidth + 2, hpBarHeight + 2);

    // Background (dark red)
    this.ctx.fillStyle = '#4a0000';
    this.ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    // Health (gradient from green to red based on HP)
    let hpColor;
    if (hpPercent > 0.6) {
      hpColor = '#2ecc71'; // Green
    } else if (hpPercent > 0.3) {
      hpColor = '#f39c12'; // Orange
    } else {
      hpColor = '#e74c3c'; // Red
    }
    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

    // HP text
    this.ctx.font = 'bold 10px Arial';
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${hp}/${maxHp}`, x, hpBarY + hpBarHeight - 1);

    // Name label
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'center';
    this.ctx.strokeText(name, x, y + size / 2 + 12);
    this.ctx.fillText(name, x, y + size / 2 + 12);

    this.ctx.restore();
  }

  addDamageAnimation(animalId, damage) {
    const animal = this.animals.find(a => a.id === animalId);
    if (animal) {
      this.damageAnimations.push({
        x: animal.x,
        y: animal.y,
        damage: damage,
        opacity: 1,
        offsetY: 0,
        startTime: Date.now()
      });
    }
  }

  drawDamageAnimations() {
    const now = Date.now();

    this.damageAnimations = this.damageAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      const duration = 800;

      if (elapsed > duration) return false;

      const progress = elapsed / duration;
      anim.opacity = 1 - progress;
      anim.offsetY = -30 * progress;

      this.ctx.save();
      this.ctx.globalAlpha = anim.opacity;
      this.ctx.font = 'bold 18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#ff4444';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 3;

      const text = `-${anim.damage}`;
      this.ctx.strokeText(text, anim.x, anim.y + anim.offsetY - 40);
      this.ctx.fillText(text, anim.x, anim.y + anim.offsetY - 40);
      this.ctx.restore();

      return true;
    });
  }

  addEatAnimation(winner, loser) {
    this.eatAnimations.push({
      winnerType: winner.type,
      loserType: loser.type,
      x: loser.x,
      y: loser.y,
      opacity: 1,
      scale: 1,
      startTime: Date.now()
    });
  }

  drawEatAnimations() {
    const now = Date.now();

    this.eatAnimations = this.eatAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      const duration = 1000;

      if (elapsed > duration) return false;

      const progress = elapsed / duration;
      anim.opacity = 1 - progress;
      anim.scale = 1 + progress * 0.5;

      this.ctx.save();
      this.ctx.globalAlpha = anim.opacity;
      this.ctx.translate(anim.x, anim.y);
      this.ctx.scale(anim.scale, anim.scale);

      // Explosion effect
      this.ctx.font = '40px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('💥', 0, 0);

      this.ctx.restore();

      return true;
    });
  }

  showWinner(winner) {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Crown
    this.ctx.font = '80px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('👑', centerX, centerY - 100);

    // Winner image or emoji
    const img = this.images[winner.type];
    if (img) {
      this.ctx.drawImage(img, centerX - 60, centerY - 60, 120, 120);
    } else {
      this.ctx.font = '100px Arial';
      this.ctx.fillText(winner.emoji, centerX, centerY);
    }

    // Winner text
    this.ctx.font = 'bold 36px Arial';
    this.ctx.fillStyle = '#f39c12';
    this.ctx.fillText(winner.name + ' 승리!', centerX, centerY + 100);

    this.ctx.restore();
  }
}

window.GameRenderer = GameRenderer;
