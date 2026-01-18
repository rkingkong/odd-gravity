// collectibles.js - Coins, Gems & Combo System for Odd Gravity
// Drop this file into /opt/obc/client/src/

export const COLLECTIBLE_TYPES = {
  COIN: {
    id: 'coin',
    name: 'Coin',
    emoji: '🪙',
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.4)',
    value: 1,
    size: 18,
    rarity: 0.7,
  },
  SILVER_COIN: {
    id: 'silver',
    name: 'Silver Coin',
    emoji: '🥈',
    color: '#C0C0C0',
    glowColor: 'rgba(192, 192, 192, 0.4)',
    value: 3,
    size: 20,
    rarity: 0.2,
  },
  GEM: {
    id: 'gem',
    name: 'Gem',
    emoji: '💎',
    color: '#00CED1',
    glowColor: 'rgba(0, 206, 209, 0.5)',
    value: 10,
    size: 22,
    rarity: 0.08,
  },
  STAR: {
    id: 'star',
    name: 'Star',
    emoji: '⭐',
    color: '#FFE066',
    glowColor: 'rgba(255, 224, 102, 0.5)',
    value: 5,
    size: 24,
    rarity: 0.02, // Rare!
  },
};

export const COLLECTIBLE_LIST = Object.values(COLLECTIBLE_TYPES);

// Collectible spawning config
export const COLLECTIBLE_CONFIG = {
  SPAWN_CHANCE_PER_OBSTACLE: 0.4, // 40% chance to spawn coins near obstacle
  CLUSTER_SIZE_MIN: 1,
  CLUSTER_SIZE_MAX: 5,
  CLUSTER_SPREAD: 30,
  COLLECT_RADIUS: 30,
  MAGNET_RADIUS: 150,
  MAGNET_SPEED: 400,
  NEAR_MISS_DISTANCE: 50, // How close for near-miss bonus
  NEAR_MISS_BONUS: 2,
};

// Combo system config
export const COMBO_CONFIG = {
  COMBO_WINDOW_MS: 1500, // Time to maintain combo
  MAX_MULTIPLIER: 10,
  COMBO_THRESHOLDS: [
    { count: 3, message: 'Nice!', color: '#FFD700' },
    { count: 5, message: 'Great!', color: '#FF8C00' },
    { count: 8, message: 'Amazing!', color: '#FF4500' },
    { count: 12, message: 'INCREDIBLE!', color: '#FF1493' },
    { count: 20, message: '🔥 ON FIRE! 🔥', color: '#FF0000' },
  ],
};

// Select collectible type by rarity
function selectCollectibleType() {
  const totalWeight = COLLECTIBLE_LIST.reduce((sum, c) => sum + c.rarity, 0);
  let random = Math.random() * totalWeight;
  
  for (const collectible of COLLECTIBLE_LIST) {
    random -= collectible.rarity;
    if (random <= 0) return collectible;
  }
  return COLLECTIBLE_TYPES.COIN;
}

// Create a single collectible
export function createCollectible(x, y, type = null) {
  const collectibleType = type || selectCollectibleType();
  
  return {
    type: collectibleType,
    x,
    y,
    baseY: y,
    size: collectibleType.size,
    rotation: Math.random() * Math.PI * 2,
    collected: false,
    spawnTime: Date.now(),
    floatPhase: Math.random() * Math.PI * 2,
  };
}

// Create cluster of collectibles (often placed near gaps)
export function createCollectibleCluster(gapCenterX, gapCenterY, obstacleSpeed) {
  const count = Math.floor(
    Math.random() * (COLLECTIBLE_CONFIG.CLUSTER_SIZE_MAX - COLLECTIBLE_CONFIG.CLUSTER_SIZE_MIN + 1)
  ) + COLLECTIBLE_CONFIG.CLUSTER_SIZE_MIN;
  
  const collectibles = [];
  const spread = COLLECTIBLE_CONFIG.CLUSTER_SPREAD;
  
  // Different patterns
  const pattern = Math.random();
  
  if (pattern < 0.3) {
    // Horizontal line
    for (let i = 0; i < count; i++) {
      collectibles.push(createCollectible(
        gapCenterX + (i - count / 2) * spread,
        gapCenterY
      ));
    }
  } else if (pattern < 0.6) {
    // Vertical line (in the gap)
    for (let i = 0; i < count; i++) {
      collectibles.push(createCollectible(
        gapCenterX,
        gapCenterY + (i - count / 2) * spread * 0.8
      ));
    }
  } else if (pattern < 0.8) {
    // Arc/curve
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI - Math.PI / 2;
      collectibles.push(createCollectible(
        gapCenterX + Math.cos(angle) * spread * 1.5,
        gapCenterY + Math.sin(angle) * spread
      ));
    }
  } else {
    // Diamond
    const positions = [
      [0, -1], [-1, 0], [1, 0], [0, 1], [0, 0]
    ];
    for (let i = 0; i < Math.min(count, positions.length); i++) {
      collectibles.push(createCollectible(
        gapCenterX + positions[i][0] * spread,
        gapCenterY + positions[i][1] * spread
      ));
    }
  }
  
  // Add speed to each
  collectibles.forEach(c => {
    c.speed = obstacleSpeed;
  });
  
  return collectibles;
}

// Draw collectible
export function drawCollectible(ctx, collectible, time) {
  if (collectible.collected) return;
  
  const { type, x, size, floatPhase } = collectible;
  const floatOffset = Math.sin(time * 0.004 + floatPhase) * 5;
  const y = collectible.y + floatOffset;
  
  ctx.save();
  
  // Glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.3);
  gradient.addColorStop(0, type.glowColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Spinning animation for coins
  const scaleX = Math.cos(time * 0.005 + floatPhase);
  ctx.translate(x, y);
  ctx.scale(Math.abs(scaleX) * 0.3 + 0.7, 1);
  
  // Main body
  ctx.fillStyle = type.color;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(-size * 0.3, -size * 0.3, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Emoji (drawn separately to avoid scaling)
  ctx.save();
  ctx.font = `${size * 0.9}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type.emoji, x, y);
  ctx.restore();
}

// Collection particle effect
export function createCollectParticles(x, y, color) {
  const particles = [];
  const count = 8;
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * 100 + (Math.random() - 0.5) * 50,
      vy: Math.sin(angle) * 100 + (Math.random() - 0.5) * 50,
      life: 1,
      color,
      size: 4 + Math.random() * 4,
    });
  }
  
  return particles;
}

// Combo Manager
export class ComboManager {
  constructor() {
    this.count = 0;
    this.multiplier = 1;
    this.lastCollectTime = 0;
    this.displayMessage = null;
    this.displayMessageTime = 0;
  }
  
  reset() {
    this.count = 0;
    this.multiplier = 1;
    this.lastCollectTime = 0;
    this.displayMessage = null;
  }
  
  addCollect() {
    const now = Date.now();
    
    // Check if combo continues
    if (now - this.lastCollectTime > COMBO_CONFIG.COMBO_WINDOW_MS) {
      this.count = 0;
      this.multiplier = 1;
    }
    
    this.count++;
    this.lastCollectTime = now;
    
    // Update multiplier (every 2 in combo adds +1 multiplier)
    this.multiplier = Math.min(
      1 + Math.floor(this.count / 2),
      COMBO_CONFIG.MAX_MULTIPLIER
    );
    
    // Check for milestone messages
    for (let i = COMBO_CONFIG.COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = COMBO_CONFIG.COMBO_THRESHOLDS[i];
      if (this.count === threshold.count) {
        this.displayMessage = threshold;
        this.displayMessageTime = now;
        break;
      }
    }
    
    return this.multiplier;
  }
  
  update() {
    const now = Date.now();
    
    // Decay combo if timed out
    if (now - this.lastCollectTime > COMBO_CONFIG.COMBO_WINDOW_MS && this.count > 0) {
      this.count = 0;
      this.multiplier = 1;
    }
    
    // Clear display message after 1.5s
    if (this.displayMessage && now - this.displayMessageTime > 1500) {
      this.displayMessage = null;
    }
  }
  
  getTimeRemaining() {
    if (this.count === 0) return 0;
    const elapsed = Date.now() - this.lastCollectTime;
    return Math.max(0, COMBO_CONFIG.COMBO_WINDOW_MS - elapsed);
  }
}

// Main Collectibles Manager
export class CollectiblesManager {
  constructor() {
    this.collectibles = [];
    this.particles = [];
    this.combo = new ComboManager();
    this.totalCoins = 0; // Lifetime coins
    this.sessionCoins = 0; // This run
    this.nearMisses = 0;
  }
  
  reset() {
    this.collectibles = [];
    this.particles = [];
    this.combo.reset();
    this.sessionCoins = 0;
    this.nearMisses = 0;
  }
  
  spawnAtGap(gapCenterX, gapCenterY, obstacleSpeed) {
    if (Math.random() < COLLECTIBLE_CONFIG.SPAWN_CHANCE_PER_OBSTACLE) {
      const cluster = createCollectibleCluster(gapCenterX, gapCenterY, obstacleSpeed);
      this.collectibles.push(...cluster);
    }
  }
  
  update(dt, playerX, playerY, playerRadius, hasMagnet) {
    this.combo.update();
    
    // Update collectible positions
    for (const c of this.collectibles) {
      c.x -= c.speed * dt;
      
      // Magnet effect
      if (hasMagnet && !c.collected) {
        const dx = playerX - c.x;
        const dy = playerY - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < COLLECTIBLE_CONFIG.MAGNET_RADIUS) {
          const force = COLLECTIBLE_CONFIG.MAGNET_SPEED * dt * (1 - dist / COLLECTIBLE_CONFIG.MAGNET_RADIUS);
          c.x += (dx / dist) * force;
          c.y += (dy / dist) * force;
        }
      }
    }
    
    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // Gravity
      p.life -= dt * 2;
    }
    
    // Remove dead particles and off-screen collectibles
    this.particles = this.particles.filter(p => p.life > 0);
    this.collectibles = this.collectibles.filter(c => c.x > -50 && !c.collected);
  }
  
  checkCollisions(playerX, playerY, playerRadius) {
    let collected = [];
    
    for (const c of this.collectibles) {
      if (c.collected) continue;
      
      const dx = c.x - playerX;
      const dy = c.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < playerRadius + COLLECTIBLE_CONFIG.COLLECT_RADIUS) {
        c.collected = true;
        const multiplier = this.combo.addCollect();
        const value = c.type.value * multiplier;
        
        this.sessionCoins += value;
        this.totalCoins += value;
        
        // Create particles
        this.particles.push(...createCollectParticles(c.x, c.y, c.type.color));
        
        collected.push({
          type: c.type,
          value,
          multiplier,
          x: c.x,
          y: c.y,
        });
      }
    }
    
    return collected;
  }
  
  // Check near-miss with obstacles
  checkNearMiss(playerX, playerY, obstacleEdgeX, obstacleEdgeY) {
    const dx = playerX - obstacleEdgeX;
    const dy = playerY - obstacleEdgeY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < COLLECTIBLE_CONFIG.NEAR_MISS_DISTANCE && dist > 10) {
      this.nearMisses++;
      this.sessionCoins += COLLECTIBLE_CONFIG.NEAR_MISS_BONUS;
      this.totalCoins += COLLECTIBLE_CONFIG.NEAR_MISS_BONUS;
      return true;
    }
    return false;
  }
  
  draw(ctx, time) {
    // Draw collectibles
    for (const c of this.collectibles) {
      drawCollectible(ctx, c, time);
    }
    
    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  
  drawHUD(ctx, canvasWidth) {
    ctx.save();
    
    // Coin counter (top left area, below score)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(15, 70, 100, 35, 10);
    ctx.fill();
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.fillText(`🪙 ${this.sessionCoins}`, 25, 94);
    
    // Combo indicator
    if (this.combo.count >= 2) {
      const comboWidth = 80;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(15, 110, comboWidth, 30, 8);
      ctx.fill();
      
      // Combo timer bar
      const timeRatio = this.combo.getTimeRemaining() / COMBO_CONFIG.COMBO_WINDOW_MS;
      ctx.fillStyle = `hsl(${40 + this.combo.multiplier * 10}, 100%, 50%)`;
      ctx.beginPath();
      ctx.roundRect(15, 110, comboWidth * timeRatio, 30, 8);
      ctx.fill();
      
      // Combo text
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`x${this.combo.multiplier}`, 55, 130);
    }
    
    // Combo message
    if (this.combo.displayMessage) {
      const msg = this.combo.displayMessage;
      const elapsed = Date.now() - this.combo.displayMessageTime;
      const scale = 1 + Math.sin(elapsed * 0.02) * 0.1;
      const alpha = Math.max(0, 1 - elapsed / 1500);
      
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${32 * scale}px Arial`;
      ctx.fillStyle = msg.color;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(msg.message, canvasWidth / 2, 200);
      ctx.fillText(msg.message, canvasWidth / 2, 200);
      ctx.globalAlpha = 1;
    }
    
    ctx.restore();
  }
}

// Floating text for collected coins
export class FloatingTextManager {
  constructor() {
    this.texts = [];
  }
  
  add(x, y, text, color = '#FFD700') {
    this.texts.push({
      x,
      y,
      text,
      color,
      life: 1,
      vy: -60,
    });
  }
  
  update(dt) {
    for (const t of this.texts) {
      t.y += t.vy * dt;
      t.vy *= 0.95;
      t.life -= dt * 1.5;
    }
    this.texts = this.texts.filter(t => t.life > 0);
  }
  
  draw(ctx) {
    for (const t of this.texts) {
      ctx.globalAlpha = t.life;
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

export default CollectiblesManager;