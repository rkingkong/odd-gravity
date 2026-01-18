// powerups.js - Power-up System for Odd Gravity
// Drop this file into /opt/obc/client/src/

export const POWERUP_TYPES = {
  SHIELD: {
    id: 'shield',
    name: 'Shield',
    emoji: '🛡️',
    color: '#00BFFF',
    glowColor: 'rgba(0, 191, 255, 0.5)',
    duration: 0, // Instant - one free hit
    description: 'Survive one hit',
    rarity: 0.3, // 30% of powerup spawns
  },
  SHRINK: {
    id: 'shrink',
    name: 'Shrink',
    emoji: '🔬',
    color: '#FF69B4',
    glowColor: 'rgba(255, 105, 180, 0.5)',
    duration: 5000,
    description: 'Become tiny for 5s',
    rarity: 0.2,
  },
  SLOWMO: {
    id: 'slowmo',
    name: 'Slow-Mo',
    emoji: '⏱️',
    color: '#9370DB',
    glowColor: 'rgba(147, 112, 219, 0.5)',
    duration: 4000,
    description: 'Slow time for 4s',
    rarity: 0.15,
  },
  GHOST: {
    id: 'ghost',
    name: 'Ghost',
    emoji: '👻',
    color: '#E6E6FA',
    glowColor: 'rgba(230, 230, 250, 0.6)',
    duration: 3000,
    description: 'Phase through obstacles',
    rarity: 0.1,
  },
  MAGNET: {
    id: 'magnet',
    name: 'Magnet',
    emoji: '🧲',
    color: '#FF4500',
    glowColor: 'rgba(255, 69, 0, 0.5)',
    duration: 6000,
    description: 'Attract coins for 6s',
    rarity: 0.15,
  },
  GRAVITY_LOCK: {
    id: 'gravity_lock',
    name: 'Gravity Lock',
    emoji: '🔒',
    color: '#32CD32',
    glowColor: 'rgba(50, 205, 50, 0.5)',
    duration: 5000,
    description: 'No forced flips for 5s',
    rarity: 0.1,
  },
};

// Get powerup type list for spawning
export const POWERUP_LIST = Object.values(POWERUP_TYPES);

// Spawn settings
export const POWERUP_CONFIG = {
  BASE_SPAWN_CHANCE: 0.08, // 8% chance per obstacle passed
  MIN_SPAWN_INTERVAL: 8000, // At least 8s between powerups
  POWERUP_SIZE: 28,
  POWERUP_SPEED_MULT: 0.7, // Powerups move slower than obstacles
  COLLECT_RADIUS: 40,
  FLOAT_AMPLITUDE: 8, // Bobbing animation
  FLOAT_SPEED: 0.003,
};

// Select random powerup based on rarity weights
export function selectRandomPowerup() {
  const totalWeight = POWERUP_LIST.reduce((sum, p) => sum + p.rarity, 0);
  let random = Math.random() * totalWeight;
  
  for (const powerup of POWERUP_LIST) {
    random -= powerup.rarity;
    if (random <= 0) return powerup;
  }
  return POWERUP_LIST[0];
}

// Create a new powerup instance
export function createPowerup(canvasWidth, canvasHeight, obstacleSpeed) {
  const type = selectRandomPowerup();
  const size = POWERUP_CONFIG.POWERUP_SIZE;
  
  return {
    type,
    x: canvasWidth + size,
    y: Math.random() * (canvasHeight - 200) + 100, // Avoid edges
    baseY: 0, // Set after y is determined
    size,
    speed: obstacleSpeed * POWERUP_CONFIG.POWERUP_SPEED_MULT,
    rotation: 0,
    spawnTime: Date.now(),
    collected: false,
  };
}

// Draw powerup on canvas
export function drawPowerup(ctx, powerup, time) {
  if (powerup.collected) return;
  
  const { type, x, size } = powerup;
  const floatOffset = Math.sin(time * POWERUP_CONFIG.FLOAT_SPEED) * POWERUP_CONFIG.FLOAT_AMPLITUDE;
  const y = powerup.y + floatOffset;
  
  ctx.save();
  
  // Outer glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
  gradient.addColorStop(0, type.glowColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner circle
  ctx.fillStyle = type.color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  
  // White highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // Emoji icon
  ctx.font = `${size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type.emoji, x, y);
  
  ctx.restore();
}

// Check collision with player
export function checkPowerupCollision(powerup, playerX, playerY, playerRadius) {
  if (powerup.collected) return false;
  
  const dx = powerup.x - playerX;
  const dy = powerup.y - playerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance < playerRadius + POWERUP_CONFIG.COLLECT_RADIUS;
}

// Active powerup state manager
export class PowerupManager {
  constructor() {
    this.activePowerups = {}; // { powerupId: { type, endTime, ... } }
    this.hasShield = false;
    this.spawnedPowerups = []; // Powerups floating on screen
    this.lastSpawnTime = 0;
  }
  
  reset() {
    this.activePowerups = {};
    this.hasShield = false;
    this.spawnedPowerups = [];
    this.lastSpawnTime = 0;
  }
  
  activate(powerupType) {
    const now = Date.now();
    
    if (powerupType.id === 'shield') {
      this.hasShield = true;
      return { activated: true, message: '🛡️ Shield Active!' };
    }
    
    this.activePowerups[powerupType.id] = {
      type: powerupType,
      endTime: now + powerupType.duration,
      startTime: now,
    };
    
    return { 
      activated: true, 
      message: `${powerupType.emoji} ${powerupType.name}!` 
    };
  }
  
  useShield() {
    if (this.hasShield) {
      this.hasShield = false;
      return true;
    }
    return false;
  }
  
  isActive(powerupId) {
    if (powerupId === 'shield') return this.hasShield;
    
    const active = this.activePowerups[powerupId];
    if (!active) return false;
    
    if (Date.now() > active.endTime) {
      delete this.activePowerups[powerupId];
      return false;
    }
    return true;
  }
  
  getTimeRemaining(powerupId) {
    const active = this.activePowerups[powerupId];
    if (!active) return 0;
    return Math.max(0, active.endTime - Date.now());
  }
  
  getActiveList() {
    const now = Date.now();
    const active = [];
    
    if (this.hasShield) {
      active.push({ type: POWERUP_TYPES.SHIELD, remaining: Infinity });
    }
    
    for (const [id, data] of Object.entries(this.activePowerups)) {
      const remaining = data.endTime - now;
      if (remaining > 0) {
        active.push({ type: data.type, remaining });
      }
    }
    
    return active;
  }
  
  update() {
    const now = Date.now();
    for (const [id, data] of Object.entries(this.activePowerups)) {
      if (now > data.endTime) {
        delete this.activePowerups[id];
      }
    }
  }
  
  // Spawn management
  trySpawn(canvasWidth, canvasHeight, obstacleSpeed, score) {
    const now = Date.now();
    
    // Don't spawn too frequently
    if (now - this.lastSpawnTime < POWERUP_CONFIG.MIN_SPAWN_INTERVAL) {
      return null;
    }
    
    // Higher chance at higher scores
    const scoreBonus = Math.min(score / 100, 0.1);
    const spawnChance = POWERUP_CONFIG.BASE_SPAWN_CHANCE + scoreBonus;
    
    if (Math.random() < spawnChance) {
      const powerup = createPowerup(canvasWidth, canvasHeight, obstacleSpeed);
      this.spawnedPowerups.push(powerup);
      this.lastSpawnTime = now;
      return powerup;
    }
    
    return null;
  }
  
  updateSpawned(dt, canvasWidth) {
    for (const powerup of this.spawnedPowerups) {
      powerup.x -= powerup.speed * dt;
    }
    
    // Remove off-screen powerups
    this.spawnedPowerups = this.spawnedPowerups.filter(
      p => p.x > -50 && !p.collected
    );
  }
  
  checkCollisions(playerX, playerY, playerRadius) {
    for (const powerup of this.spawnedPowerups) {
      if (checkPowerupCollision(powerup, playerX, playerY, playerRadius)) {
        powerup.collected = true;
        return this.activate(powerup.type);
      }
    }
    return null;
  }
  
  draw(ctx, time) {
    for (const powerup of this.spawnedPowerups) {
      drawPowerup(ctx, powerup, time);
    }
  }
  
  // Get current modifiers for game logic
  getModifiers() {
    return {
      playerScale: this.isActive('shrink') ? 0.5 : 1.0,
      timeScale: this.isActive('slowmo') ? 0.4 : 1.0,
      isGhost: this.isActive('ghost'),
      hasMagnet: this.isActive('magnet'),
      gravityLocked: this.isActive('gravity_lock'),
      hasShield: this.hasShield,
    };
  }
}

// Draw active powerup indicators (HUD)
export function drawPowerupHUD(ctx, powerupManager, canvasWidth) {
  const active = powerupManager.getActiveList();
  if (active.length === 0) return;
  
  ctx.save();
  
  const startX = canvasWidth - 60;
  let y = 100;
  
  for (const { type, remaining } of active) {
    // Background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(startX - 40, y - 15, 80, 30, 15);
    ctx.fill();
    
    // Icon
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(type.emoji, startX - 30, y + 6);
    
    // Timer bar (if not shield)
    if (remaining !== Infinity && type.duration > 0) {
      const progress = remaining / type.duration;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(startX - 5, y - 5, 40, 10);
      ctx.fillStyle = type.color;
      ctx.fillRect(startX - 5, y - 5, 40 * progress, 10);
    } else {
      // Shield indicator
      ctx.fillStyle = type.color;
      ctx.font = '12px Arial';
      ctx.fillText('READY', startX, y + 4);
    }
    
    y += 40;
  }
  
  ctx.restore();
}

export default PowerupManager;