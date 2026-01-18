// missions.js - Missions & Daily Challenges for Odd Gravity
// Drop this file into /opt/obc/client/src/

// Mission types
export const MISSION_TYPES = {
  SCORE: 'score',           // Reach a score
  COINS: 'coins',           // Collect coins
  SURVIVE: 'survive',       // Survive X seconds
  OBSTACLES: 'obstacles',   // Pass X obstacles
  COMBO: 'combo',           // Achieve X combo
  POWERUPS: 'powerups',     // Collect X powerups
  NEAR_MISS: 'nearmiss',    // Get X near misses
  NO_POWERUP: 'nopowerup',  // Score without powerups
  SINGLE_LIFE: 'singlelife', // Don't use shield
  MODE_SPECIFIC: 'mode',    // Complete in specific mode
};

// Mission templates (used to generate random missions)
export const MISSION_TEMPLATES = [
  // Easy missions
  { type: MISSION_TYPES.SCORE, target: 10, reward: 5, difficulty: 'easy', desc: 'Score {target} points' },
  { type: MISSION_TYPES.COINS, target: 10, reward: 5, difficulty: 'easy', desc: 'Collect {target} coins' },
  { type: MISSION_TYPES.SURVIVE, target: 30, reward: 5, difficulty: 'easy', desc: 'Survive {target} seconds' },
  { type: MISSION_TYPES.OBSTACLES, target: 15, reward: 5, difficulty: 'easy', desc: 'Pass {target} obstacles' },
  
  // Medium missions
  { type: MISSION_TYPES.SCORE, target: 30, reward: 15, difficulty: 'medium', desc: 'Score {target} points' },
  { type: MISSION_TYPES.COINS, target: 30, reward: 15, difficulty: 'medium', desc: 'Collect {target} coins' },
  { type: MISSION_TYPES.COMBO, target: 5, reward: 20, difficulty: 'medium', desc: 'Achieve {target}x combo' },
  { type: MISSION_TYPES.SURVIVE, target: 60, reward: 15, difficulty: 'medium', desc: 'Survive {target} seconds' },
  { type: MISSION_TYPES.POWERUPS, target: 3, reward: 15, difficulty: 'medium', desc: 'Collect {target} powerups' },
  { type: MISSION_TYPES.NEAR_MISS, target: 5, reward: 20, difficulty: 'medium', desc: 'Get {target} near misses' },
  
  // Hard missions
  { type: MISSION_TYPES.SCORE, target: 50, reward: 30, difficulty: 'hard', desc: 'Score {target} points' },
  { type: MISSION_TYPES.COMBO, target: 10, reward: 40, difficulty: 'hard', desc: 'Achieve {target}x combo' },
  { type: MISSION_TYPES.SURVIVE, target: 120, reward: 35, difficulty: 'hard', desc: 'Survive {target} seconds' },
  { type: MISSION_TYPES.NO_POWERUP, target: 30, reward: 50, difficulty: 'hard', desc: 'Score {target} without powerups' },
  
  // Expert missions
  { type: MISSION_TYPES.SCORE, target: 100, reward: 75, difficulty: 'expert', desc: 'Score {target} points' },
  { type: MISSION_TYPES.COMBO, target: 15, reward: 80, difficulty: 'expert', desc: 'Achieve {target}x combo' },
  { type: MISSION_TYPES.COINS, target: 100, reward: 60, difficulty: 'expert', desc: 'Collect {target} coins' },
];

// Mode-specific mission variants
export const MODE_MISSIONS = [
  { mode: 'chaotic', desc: 'Score {target} in Chaotic mode', targetMult: 0.7, rewardMult: 1.5 },
  { mode: 'bouncy', desc: 'Score {target} in Bouncy mode', targetMult: 0.8, rewardMult: 1.3 },
  { mode: 'inverted', desc: 'Score {target} in Inverted mode', targetMult: 0.9, rewardMult: 1.2 },
  { mode: 'flux', desc: 'Survive {target}s in Flux mode', targetMult: 0.8, rewardMult: 1.4 },
  { mode: 'pulse', desc: 'Score {target} in Pulse mode', targetMult: 0.6, rewardMult: 1.6 },
];

// Difficulty colors
export const DIFFICULTY_COLORS = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
  expert: '#9C27B0',
};

// Generate a seeded random number (for daily consistency)
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Get today's date seed
function getTodaySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

// Generate daily missions (same for everyone each day)
export function generateDailyMissions() {
  const seed = getTodaySeed();
  const missions = [];
  
  // 1 Easy, 2 Medium, 1 Hard daily mission
  const difficulties = ['easy', 'medium', 'medium', 'hard'];
  
  for (let i = 0; i < difficulties.length; i++) {
    const diff = difficulties[i];
    const templates = MISSION_TEMPLATES.filter(m => m.difficulty === diff);
    const template = templates[Math.floor(seededRandom(seed + i * 100) * templates.length)];
    
    // Possibly make it mode-specific (30% chance for medium+)
    let mission = { ...template };
    if (diff !== 'easy' && seededRandom(seed + i * 200) < 0.3) {
      const modeVar = MODE_MISSIONS[Math.floor(seededRandom(seed + i * 300) * MODE_MISSIONS.length)];
      mission.mode = modeVar.mode;
      mission.target = Math.floor(mission.target * modeVar.targetMult);
      mission.reward = Math.floor(mission.reward * modeVar.rewardMult);
      mission.desc = modeVar.desc.replace('{target}', mission.target);
    } else {
      mission.desc = mission.desc.replace('{target}', mission.target);
    }
    
    mission.id = `daily_${seed}_${i}`;
    mission.isDaily = true;
    missions.push(mission);
  }
  
  return missions;
}

// Achievement definitions (permanent unlocks)
export const ACHIEVEMENTS = [
  // Score milestones
  { id: 'score_25', name: 'Getting Started', desc: 'Score 25 points', icon: '🎯', reward: 10, check: (s) => s.highScore >= 25 },
  { id: 'score_50', name: 'Warming Up', desc: 'Score 50 points', icon: '🔥', reward: 25, check: (s) => s.highScore >= 50 },
  { id: 'score_100', name: 'Century', desc: 'Score 100 points', icon: '💯', reward: 50, check: (s) => s.highScore >= 100 },
  { id: 'score_200', name: 'Double Century', desc: 'Score 200 points', icon: '🏆', reward: 100, check: (s) => s.highScore >= 200 },
  
  // Coin milestones
  { id: 'coins_100', name: 'Coin Collector', desc: 'Collect 100 total coins', icon: '🪙', reward: 20, check: (s) => s.totalCoins >= 100 },
  { id: 'coins_500', name: 'Treasure Hunter', desc: 'Collect 500 total coins', icon: '💰', reward: 50, check: (s) => s.totalCoins >= 500 },
  { id: 'coins_1000', name: 'Rich!', desc: 'Collect 1000 total coins', icon: '🤑', reward: 100, check: (s) => s.totalCoins >= 1000 },
  
  // Games played
  { id: 'games_10', name: 'Regular', desc: 'Play 10 games', icon: '🎮', reward: 15, check: (s) => s.gamesPlayed >= 10 },
  { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games', icon: '🎯', reward: 40, check: (s) => s.gamesPlayed >= 50 },
  { id: 'games_100', name: 'Addicted', desc: 'Play 100 games', icon: '🤩', reward: 75, check: (s) => s.gamesPlayed >= 100 },
  
  // Combo achievements
  { id: 'combo_5', name: 'Combo Starter', desc: 'Get a 5x combo', icon: '⚡', reward: 15, check: (s) => s.maxCombo >= 5 },
  { id: 'combo_10', name: 'Combo Master', desc: 'Get a 10x combo', icon: '⚡', reward: 35, check: (s) => s.maxCombo >= 10 },
  { id: 'combo_15', name: 'Combo Legend', desc: 'Get a 15x combo', icon: '🌟', reward: 75, check: (s) => s.maxCombo >= 15 },
  
  // Mode-specific
  { id: 'chaos_50', name: 'Chaos Controller', desc: 'Score 50 in Chaotic mode', icon: '🌀', reward: 50, check: (s) => (s.modeHighScores?.chaotic || 0) >= 50 },
  { id: 'bouncy_100', name: 'Bouncy Master', desc: 'Score 100 in Bouncy mode', icon: '🏀', reward: 60, check: (s) => (s.modeHighScores?.bouncy || 0) >= 100 },
  { id: 'inverted_75', name: 'Upside Down', desc: 'Score 75 in Inverted mode', icon: '🙃', reward: 55, check: (s) => (s.modeHighScores?.inverted || 0) >= 75 },
  
  // Special
  { id: 'near_miss_10', name: 'Daredevil', desc: 'Get 10 near misses in one game', icon: '😱', reward: 40, check: (s) => s.maxNearMisses >= 10 },
  { id: 'powerup_all', name: 'Power Collector', desc: 'Collect every powerup type', icon: '🌈', reward: 50, check: (s) => s.powerupsCollected?.size >= 6 },
  { id: 'all_modes', name: 'Mode Explorer', desc: 'Play every game mode', icon: '🗺️', reward: 30, check: (s) => s.modesPlayed?.size >= 7 },
];

// Mission progress tracker
export class MissionTracker {
  constructor() {
    this.activeMissions = [];
    this.completedToday = new Set();
    this.currentProgress = {};
    this.lastDailyDate = null;
  }
  
  // Load from localStorage
  load() {
    try {
      const saved = localStorage.getItem('oddGravity_missions');
      if (saved) {
        const data = JSON.parse(saved);
        this.completedToday = new Set(data.completedToday || []);
        this.lastDailyDate = data.lastDailyDate;
      }
    } catch (e) {
      console.warn('Failed to load missions:', e);
    }
    
    this.refreshDailyMissions();
  }
  
  // Save to localStorage
  save() {
    try {
      localStorage.setItem('oddGravity_missions', JSON.stringify({
        completedToday: [...this.completedToday],
        lastDailyDate: this.lastDailyDate,
      }));
    } catch (e) {
      console.warn('Failed to save missions:', e);
    }
  }
  
  // Check if we need new daily missions
  refreshDailyMissions() {
    const today = getTodaySeed();
    
    if (this.lastDailyDate !== today) {
      // New day! Reset daily progress
      this.completedToday.clear();
      this.lastDailyDate = today;
      this.save();
    }
    
    // Generate today's missions
    this.activeMissions = generateDailyMissions().filter(
      m => !this.completedToday.has(m.id)
    );
  }
  
  // Start tracking a new game
  startGame(mode) {
    this.currentProgress = {
      mode,
      score: 0,
      coins: 0,
      maxCombo: 0,
      time: 0,
      obstacles: 0,
      powerups: 0,
      nearMisses: 0,
      usedPowerup: false,
      usedShield: false,
    };
  }
  
  // Update progress during game
  updateProgress(updates) {
    Object.assign(this.currentProgress, updates);
  }
  
  // Check completed missions at game end
  checkCompletions() {
    const completed = [];
    const progress = this.currentProgress;
    
    for (const mission of this.activeMissions) {
      if (this.completedToday.has(mission.id)) continue;
      
      // Check mode requirement
      if (mission.mode && mission.mode !== progress.mode) continue;
      
      let isComplete = false;
      
      switch (mission.type) {
        case MISSION_TYPES.SCORE:
          isComplete = progress.score >= mission.target;
          break;
        case MISSION_TYPES.COINS:
          isComplete = progress.coins >= mission.target;
          break;
        case MISSION_TYPES.SURVIVE:
          isComplete = progress.time >= mission.target;
          break;
        case MISSION_TYPES.OBSTACLES:
          isComplete = progress.obstacles >= mission.target;
          break;
        case MISSION_TYPES.COMBO:
          isComplete = progress.maxCombo >= mission.target;
          break;
        case MISSION_TYPES.POWERUPS:
          isComplete = progress.powerups >= mission.target;
          break;
        case MISSION_TYPES.NEAR_MISS:
          isComplete = progress.nearMisses >= mission.target;
          break;
        case MISSION_TYPES.NO_POWERUP:
          isComplete = progress.score >= mission.target && !progress.usedPowerup;
          break;
        case MISSION_TYPES.SINGLE_LIFE:
          isComplete = progress.score >= mission.target && !progress.usedShield;
          break;
      }
      
      if (isComplete) {
        this.completedToday.add(mission.id);
        completed.push(mission);
      }
    }
    
    if (completed.length > 0) {
      this.save();
      // Remove completed from active
      this.activeMissions = this.activeMissions.filter(
        m => !this.completedToday.has(m.id)
      );
    }
    
    return completed;
  }
  
  // Get progress towards each mission
  getMissionProgress() {
    const progress = this.currentProgress;
    
    return this.activeMissions.map(mission => {
      let current = 0;
      
      switch (mission.type) {
        case MISSION_TYPES.SCORE:
        case MISSION_TYPES.NO_POWERUP:
        case MISSION_TYPES.SINGLE_LIFE:
          current = progress.score;
          break;
        case MISSION_TYPES.COINS:
          current = progress.coins;
          break;
        case MISSION_TYPES.SURVIVE:
          current = Math.floor(progress.time);
          break;
        case MISSION_TYPES.OBSTACLES:
          current = progress.obstacles;
          break;
        case MISSION_TYPES.COMBO:
          current = progress.maxCombo;
          break;
        case MISSION_TYPES.POWERUPS:
          current = progress.powerups;
          break;
        case MISSION_TYPES.NEAR_MISS:
          current = progress.nearMisses;
          break;
      }
      
      return {
        ...mission,
        current,
        progress: Math.min(1, current / mission.target),
      };
    });
  }
}

// Achievement tracker
export class AchievementTracker {
  constructor() {
    this.unlocked = new Set();
    this.stats = {
      highScore: 0,
      totalCoins: 0,
      gamesPlayed: 0,
      maxCombo: 0,
      maxNearMisses: 0,
      modeHighScores: {},
      modesPlayed: new Set(),
      powerupsCollected: new Set(),
    };
  }
  
  load() {
    try {
      const saved = localStorage.getItem('oddGravity_achievements');
      if (saved) {
        const data = JSON.parse(saved);
        this.unlocked = new Set(data.unlocked || []);
        this.stats = {
          ...this.stats,
          ...data.stats,
          modesPlayed: new Set(data.stats?.modesPlayed || []),
          powerupsCollected: new Set(data.stats?.powerupsCollected || []),
        };
      }
    } catch (e) {
      console.warn('Failed to load achievements:', e);
    }
  }
  
  save() {
    try {
      localStorage.setItem('oddGravity_achievements', JSON.stringify({
        unlocked: [...this.unlocked],
        stats: {
          ...this.stats,
          modesPlayed: [...this.stats.modesPlayed],
          powerupsCollected: [...this.stats.powerupsCollected],
        },
      }));
    } catch (e) {
      console.warn('Failed to save achievements:', e);
    }
  }
  
  updateStats(gameResult) {
    const { score, coins, mode, maxCombo, nearMisses, powerupsUsed } = gameResult;
    
    this.stats.gamesPlayed++;
    this.stats.totalCoins += coins;
    this.stats.highScore = Math.max(this.stats.highScore, score);
    this.stats.maxCombo = Math.max(this.stats.maxCombo, maxCombo);
    this.stats.maxNearMisses = Math.max(this.stats.maxNearMisses, nearMisses);
    
    this.stats.modesPlayed.add(mode);
    
    if (!this.stats.modeHighScores[mode] || score > this.stats.modeHighScores[mode]) {
      this.stats.modeHighScores[mode] = score;
    }
    
    if (powerupsUsed) {
      powerupsUsed.forEach(p => this.stats.powerupsCollected.add(p));
    }
    
    this.save();
  }
  
  checkAchievements() {
    const newlyUnlocked = [];
    
    for (const achievement of ACHIEVEMENTS) {
      if (this.unlocked.has(achievement.id)) continue;
      
      if (achievement.check(this.stats)) {
        this.unlocked.add(achievement.id);
        newlyUnlocked.push(achievement);
      }
    }
    
    if (newlyUnlocked.length > 0) {
      this.save();
    }
    
    return newlyUnlocked;
  }
  
  getProgress() {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: this.unlocked.has(a.id),
    }));
  }
}

// Draw mission HUD during game
export function drawMissionHUD(ctx, missionTracker, canvasWidth, canvasHeight) {
  const missions = missionTracker.getMissionProgress();
  if (missions.length === 0) return;
  
  ctx.save();
  
  const startY = canvasHeight - 20 - missions.length * 35;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(10, startY - 25, 180, missions.length * 35 + 35, 10);
  ctx.fill();
  
  // Title
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'left';
  ctx.fillText('DAILY MISSIONS', 20, startY - 8);
  
  missions.forEach((mission, i) => {
    const y = startY + i * 35 + 15;
    
    // Progress bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(20, y, 150, 20, 5);
    ctx.fill();
    
    // Progress bar fill
    ctx.fillStyle = DIFFICULTY_COLORS[mission.difficulty];
    ctx.beginPath();
    ctx.roundRect(20, y, 150 * mission.progress, 20, 5);
    ctx.fill();
    
    // Text
    ctx.font = '11px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`${mission.current}/${mission.target}`, 25, y + 14);
    
    // Reward
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`+${mission.reward}🪙`, 165, y + 14);
    ctx.textAlign = 'left';
  });
  
  ctx.restore();
}

export default { MissionTracker, AchievementTracker };