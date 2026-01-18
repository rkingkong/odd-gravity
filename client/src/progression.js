// progression.js - Unlocks, Currency & Progression for Odd Gravity
// Drop this file into /opt/obc/client/src/

// Player skins (unlockable)
export const PLAYER_SKINS = [
  { id: 'default', name: 'Classic', color: '#FF6B6B', cost: 0, unlocked: true },
  { id: 'blue', name: 'Ocean', color: '#4ECDC4', cost: 50 },
  { id: 'gold', name: 'Golden', color: '#FFD700', cost: 100 },
  { id: 'purple', name: 'Mystic', color: '#9B59B6', cost: 150 },
  { id: 'neon', name: 'Neon', color: '#00FF88', cost: 200, glow: true },
  { id: 'fire', name: 'Fire', color: '#FF4500', cost: 300, trail: 'fire' },
  { id: 'ice', name: 'Ice', color: '#00BFFF', cost: 300, trail: 'ice' },
  { id: 'rainbow', name: 'Rainbow', color: 'rainbow', cost: 500, special: true },
  { id: 'ghost', name: 'Ghost', color: 'rgba(255,255,255,0.7)', cost: 400, transparent: true },
  { id: 'pixel', name: 'Pixel', color: '#8B4513', cost: 350, shape: 'square' },
];

// Trail effects
export const TRAIL_EFFECTS = [
  { id: 'none', name: 'None', cost: 0, unlocked: true },
  { id: 'dots', name: 'Dots', cost: 75 },
  { id: 'line', name: 'Line Trail', cost: 100 },
  { id: 'sparkle', name: 'Sparkles', cost: 200 },
  { id: 'fire', name: 'Fire Trail', cost: 350 },
  { id: 'ice', name: 'Ice Trail', cost: 350 },
  { id: 'rainbow', name: 'Rainbow Trail', cost: 500 },
  { id: 'stars', name: 'Star Trail', cost: 400 },
];

// Mode unlock costs (modes start locked, unlock with coins)
export const MODE_UNLOCKS = {
  classic: { cost: 0, unlocked: true },
  oddgravity: { cost: 0, unlocked: true },
  bouncy: { cost: 100 },
  inverted: { cost: 150 },
  flux: { cost: 200 },
  pulse: { cost: 300 },
  chaotic: { cost: 400 },
};

// XP and level system
export const LEVEL_CONFIG = {
  BASE_XP: 100,        // XP needed for level 2
  XP_MULTIPLIER: 1.5,  // Each level needs 1.5x more XP
  MAX_LEVEL: 50,
  
  // XP earned per action
  XP_PER_SCORE: 10,
  XP_PER_COIN: 2,
  XP_PER_OBSTACLE: 5,
  XP_PER_POWERUP: 15,
  XP_BONUS_DAILY: 50,  // Bonus for completing daily mission
};

// Calculate XP needed for a level
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(LEVEL_CONFIG.BASE_XP * Math.pow(LEVEL_CONFIG.XP_MULTIPLIER, level - 2));
}

// Calculate total XP needed to reach a level
export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

// Level rewards (what you get at each level)
export const LEVEL_REWARDS = {
  5: { coins: 50, unlock: 'blue' },
  10: { coins: 100, unlock: 'dots' },
  15: { coins: 150, unlock: 'purple' },
  20: { coins: 200, unlock: 'sparkle' },
  25: { coins: 300, unlock: 'neon' },
  30: { coins: 400, unlock: 'fire' },
  35: { coins: 500, unlock: 'ice' },
  40: { coins: 600, unlock: 'stars' },
  45: { coins: 750, unlock: 'ghost' },
  50: { coins: 1000, unlock: 'rainbow' },
};

// Main progression manager
export class ProgressionManager {
  constructor() {
    this.coins = 0;
    this.xp = 0;
    this.level = 1;
    
    this.unlockedSkins = new Set(['default']);
    this.unlockedTrails = new Set(['none']);
    this.unlockedModes = new Set(['classic', 'oddgravity']);
    
    this.equippedSkin = 'default';
    this.equippedTrail = 'none';
    
    this.stats = {
      totalGames: 0,
      totalScore: 0,
      totalCoins: 0,
      totalTimePlayedSec: 0,
      highScore: 0,
      longestCombo: 0,
    };
  }
  
  load() {
    try {
      const saved = localStorage.getItem('oddGravity_progression');
      if (saved) {
        const data = JSON.parse(saved);
        this.coins = data.coins || 0;
        this.xp = data.xp || 0;
        this.level = data.level || 1;
        this.unlockedSkins = new Set(data.unlockedSkins || ['default']);
        this.unlockedTrails = new Set(data.unlockedTrails || ['none']);
        this.unlockedModes = new Set(data.unlockedModes || ['classic', 'oddgravity']);
        this.equippedSkin = data.equippedSkin || 'default';
        this.equippedTrail = data.equippedTrail || 'none';
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (e) {
      console.warn('Failed to load progression:', e);
    }
  }
  
  save() {
    try {
      localStorage.setItem('oddGravity_progression', JSON.stringify({
        coins: this.coins,
        xp: this.xp,
        level: this.level,
        unlockedSkins: [...this.unlockedSkins],
        unlockedTrails: [...this.unlockedTrails],
        unlockedModes: [...this.unlockedModes],
        equippedSkin: this.equippedSkin,
        equippedTrail: this.equippedTrail,
        stats: this.stats,
      }));
    } catch (e) {
      console.warn('Failed to save progression:', e);
    }
  }
  
  // Add coins
  addCoins(amount) {
    this.coins += amount;
    this.stats.totalCoins += amount;
    this.save();
    return this.coins;
  }
  
  // Spend coins (returns true if successful)
  spendCoins(amount) {
    if (this.coins >= amount) {
      this.coins -= amount;
      this.save();
      return true;
    }
    return false;
  }
  
  // Add XP and check for level up
  addXP(amount) {
    this.xp += amount;
    const results = { xpGained: amount, leveledUp: false, newLevel: this.level, rewards: null };
    
    // Check for level up
    while (this.level < LEVEL_CONFIG.MAX_LEVEL) {
      const needed = totalXpForLevel(this.level + 1);
      if (this.xp >= needed) {
        this.level++;
        results.leveledUp = true;
        results.newLevel = this.level;
        
        // Check for level rewards
        if (LEVEL_REWARDS[this.level]) {
          const reward = LEVEL_REWARDS[this.level];
          results.rewards = reward;
          this.coins += reward.coins;
          
          // Auto-unlock reward item
          if (reward.unlock) {
            const skin = PLAYER_SKINS.find(s => s.id === reward.unlock);
            if (skin) this.unlockedSkins.add(reward.unlock);
            
            const trail = TRAIL_EFFECTS.find(t => t.id === reward.unlock);
            if (trail) this.unlockedTrails.add(reward.unlock);
          }
        }
      } else {
        break;
      }
    }
    
    this.save();
    return results;
  }
  
  // Calculate XP from a game
  calculateGameXP(score, coins, obstacles, powerups) {
    return (
      score * LEVEL_CONFIG.XP_PER_SCORE +
      coins * LEVEL_CONFIG.XP_PER_COIN +
      obstacles * LEVEL_CONFIG.XP_PER_OBSTACLE +
      powerups * LEVEL_CONFIG.XP_PER_POWERUP
    );
  }
  
  // Get current level progress
  getLevelProgress() {
    const currentLevelXP = totalXpForLevel(this.level);
    const nextLevelXP = totalXpForLevel(this.level + 1);
    const xpInLevel = this.xp - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    
    return {
      level: this.level,
      xp: this.xp,
      xpInLevel,
      xpNeeded,
      progress: xpNeeded > 0 ? xpInLevel / xpNeeded : 1,
    };
  }
  
  // Purchase skin
  purchaseSkin(skinId) {
    const skin = PLAYER_SKINS.find(s => s.id === skinId);
    if (!skin) return { success: false, error: 'Skin not found' };
    if (this.unlockedSkins.has(skinId)) return { success: false, error: 'Already owned' };
    if (this.coins < skin.cost) return { success: false, error: 'Not enough coins' };
    
    this.spendCoins(skin.cost);
    this.unlockedSkins.add(skinId);
    this.save();
    return { success: true, skin };
  }
  
  // Purchase trail
  purchaseTrail(trailId) {
    const trail = TRAIL_EFFECTS.find(t => t.id === trailId);
    if (!trail) return { success: false, error: 'Trail not found' };
    if (this.unlockedTrails.has(trailId)) return { success: false, error: 'Already owned' };
    if (this.coins < trail.cost) return { success: false, error: 'Not enough coins' };
    
    this.spendCoins(trail.cost);
    this.unlockedTrails.add(trailId);
    this.save();
    return { success: true, trail };
  }
  
  // Unlock game mode
  purchaseMode(modeId) {
    const mode = MODE_UNLOCKS[modeId];
    if (!mode) return { success: false, error: 'Mode not found' };
    if (this.unlockedModes.has(modeId)) return { success: false, error: 'Already unlocked' };
    if (this.coins < mode.cost) return { success: false, error: 'Not enough coins' };
    
    this.spendCoins(mode.cost);
    this.unlockedModes.add(modeId);
    this.save();
    return { success: true, modeId };
  }
  
  // Equip skin
  equipSkin(skinId) {
    if (!this.unlockedSkins.has(skinId)) return false;
    this.equippedSkin = skinId;
    this.save();
    return true;
  }
  
  // Equip trail
  equipTrail(trailId) {
    if (!this.unlockedTrails.has(trailId)) return false;
    this.equippedTrail = trailId;
    this.save();
    return true;
  }
  
  // Get current skin data
  getCurrentSkin() {
    return PLAYER_SKINS.find(s => s.id === this.equippedSkin) || PLAYER_SKINS[0];
  }
  
  // Get current trail data
  getCurrentTrail() {
    return TRAIL_EFFECTS.find(t => t.id === this.equippedTrail) || TRAIL_EFFECTS[0];
  }
  
  // Update stats after game
  updateGameStats(score, coins, timePlayed, combo) {
    this.stats.totalGames++;
    this.stats.totalScore += score;
    this.stats.totalCoins += coins;
    this.stats.totalTimePlayedSec += timePlayed;
    this.stats.highScore = Math.max(this.stats.highScore, score);
    this.stats.longestCombo = Math.max(this.stats.longestCombo, combo);
    this.save();
  }
  
  // Get shop data for UI
  getShopData() {
    return {
      coins: this.coins,
      skins: PLAYER_SKINS.map(s => ({
        ...s,
        owned: this.unlockedSkins.has(s.id),
        equipped: this.equippedSkin === s.id,
        canAfford: this.coins >= s.cost,
      })),
      trails: TRAIL_EFFECTS.map(t => ({
        ...t,
        owned: this.unlockedTrails.has(t.id),
        equipped: this.equippedTrail === t.id,
        canAfford: this.coins >= t.cost,
      })),
      modes: Object.entries(MODE_UNLOCKS).map(([id, data]) => ({
        id,
        ...data,
        unlocked: this.unlockedModes.has(id),
        canAfford: this.coins >= data.cost,
      })),
    };
  }
}

// Trail renderer
export class TrailRenderer {
  constructor() {
    this.particles = [];
    this.positions = []; // Recent positions for line trail
    this.maxPositions = 20;
  }
  
  reset() {
    this.particles = [];
    this.positions = [];
  }
  
  update(x, y, trailId, dt) {
    // Store position for line trails
    this.positions.unshift({ x, y, age: 0 });
    if (this.positions.length > this.maxPositions) {
      this.positions.pop();
    }
    
    // Age positions
    this.positions.forEach(p => p.age += dt);
    
    // Generate particles based on trail type
    if (trailId === 'dots' && Math.random() < 0.3) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 0.5,
        color: '#FFF',
        size: 3,
      });
    }
    
    if (trailId === 'sparkle' && Math.random() < 0.4) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 0.8,
        color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`,
        size: 2 + Math.random() * 3,
        sparkle: true,
      });
    }
    
    if (trailId === 'fire' && Math.random() < 0.5) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -50 - Math.random() * 50,
        life: 0.6,
        color: `hsl(${Math.random() * 30 + 10}, 100%, 50%)`,
        size: 4 + Math.random() * 4,
      });
    }
    
    if (trailId === 'ice' && Math.random() < 0.4) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 20,
        vy: Math.random() * 30,
        life: 0.7,
        color: `hsl(${190 + Math.random() * 20}, 80%, 70%)`,
        size: 2 + Math.random() * 3,
      });
    }
    
    if (trailId === 'stars' && Math.random() < 0.3) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 1,
        color: '#FFD700',
        size: 5,
        star: true,
      });
    }
    
    if (trailId === 'rainbow') {
      this.particles.push({
        x, y,
        vx: 0,
        vy: 0,
        life: 0.5,
        hue: (Date.now() * 0.1) % 360,
        size: 8,
        rainbow: true,
      });
    }
    
    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 2;
    }
    
    this.particles = this.particles.filter(p => p.life > 0);
  }
  
  draw(ctx, trailId) {
    // Draw line trail
    if (trailId === 'line' && this.positions.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.positions[0].x, this.positions[0].y);
      for (let i = 1; i < this.positions.length; i++) {
        ctx.lineTo(this.positions[i].x, this.positions[i].y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Draw rainbow line
    if (trailId === 'rainbow' && this.positions.length > 1) {
      for (let i = 0; i < this.positions.length - 1; i++) {
        const p1 = this.positions[i];
        const p2 = this.positions[i + 1];
        const hue = ((Date.now() * 0.1) + i * 15) % 360;
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${1 - i / this.positions.length})`;
        ctx.lineWidth = 6 - i * 0.2;
        ctx.stroke();
      }
    }
    
    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      
      if (p.star) {
        // Draw star shape
        ctx.fillStyle = p.color;
        drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.5);
      } else if (p.rainbow) {
        ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.sparkle) {
        ctx.fillStyle = p.color;
        // Twinkling effect
        const twinkle = Math.sin(Date.now() * 0.02 + p.x) * 0.5 + 0.5;
        ctx.globalAlpha = p.life * twinkle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  }
}

// Helper to draw star shape
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// Rainbow color generator for rainbow skin
export function getRainbowColor(time) {
  const hue = (time * 0.1) % 360;
  return `hsl(${hue}, 100%, 60%)`;
}

// Draw player with skin
export function drawPlayerWithSkin(ctx, x, y, radius, skin, time) {
  ctx.save();
  
  let color = skin.color;
  
  // Rainbow skin
  if (skin.color === 'rainbow') {
    color = getRainbowColor(time);
  }
  
  // Glow effect for neon skin
  if (skin.glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
  }
  
  // Transparent skin
  if (skin.transparent) {
    ctx.globalAlpha = 0.7;
  }
  
  // Square/pixel skin
  if (skin.shape === 'square') {
    ctx.fillStyle = color;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    
    // Pixel detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x - radius + 4, y - radius + 4, radius * 0.6, radius * 0.6);
  } else {
    // Normal circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

// Draw XP bar in HUD
export function drawXPBar(ctx, progression, canvasWidth) {
  const progress = progression.getLevelProgress();
  
  ctx.save();
  
  const barWidth = 150;
  const barHeight = 8;
  const x = canvasWidth - barWidth - 20;
  const y = 50;
  
  // Level badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.arc(x - 15, y + 4, 18, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(progress.level, x - 15, y + 8);
  
  // XP bar background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(x, y, barWidth, barHeight, 4);
  ctx.fill();
  
  // XP bar fill
  const gradient = ctx.createLinearGradient(x, 0, x + barWidth, 0);
  gradient.addColorStop(0, '#4CAF50');
  gradient.addColorStop(1, '#8BC34A');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(x, y, barWidth * progress.progress, barHeight, 4);
  ctx.fill();
  
  ctx.restore();
}

export default ProgressionManager;