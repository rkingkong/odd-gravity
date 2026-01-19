import React, { useEffect, useRef, useState, useCallback } from 'react'
import { submitScoreWithQueue } from './api'
import { useSfx, vibrate, resumeAudio } from './useAudio'
import { MODE_PRESETS, applyMode } from './modes'
import { 
  OBSTACLE_TYPES, 
  pickObstacleType, 
  createObstacle, 
  updateObstacle, 
  checkCollision as checkCreatureCollision 
} from './obstacles'

// ========== NEW IMPORTS FOR EXPANSION ==========
import PowerupManager, { drawPowerupHUD, POWERUP_CONFIG } from './powerups'
import CollectiblesManager, { FloatingTextManager } from './collectibles'
import { MissionTracker, AchievementTracker, drawMissionHUD, ACHIEVEMENTS as MISSION_ACHIEVEMENTS } from './missions'
import ProgressionManager, { 
  TrailRenderer, 
  drawPlayerWithSkin, 
  drawXPBar,
  PLAYER_SKINS 
} from './progression'

/** Per-mode colors */
const THEMES = {
  'Odd Gravity': { trail:'#38bdf8', ball:'#0ea5e9', obstacle:'#334155', flash:'rgba(20,184,166,0.12)', accent:'#14b8a6' },
  'Flux':        { trail:'#d946ef', ball:'#a21caf', obstacle:'#475569', flash:'rgba(236,72,153,0.12)', accent:'#ec4899' },
  'Pulse':       { trail:'#22c55e', ball:'#16a34a', obstacle:'#334155', flash:'rgba(34,197,94,0.12)', accent:'#22c55e' },
  'Chaotic':     { trail:'#f59e0b', ball:'#d97706', obstacle:'#334155', flash:'rgba(245,158,11,0.12)', accent:'#f59e0b' },
  'Inverted':    { trail:'#93c5fd', ball:'#60a5fa', obstacle:'#111827', flash:'rgba(96,165,250,0.12)', accent:'#60a5fa' },
  'Classic':     { trail:'#38bdf8', ball:'#0ea5e9', obstacle:'#334155', flash:'rgba(20,184,166,0.12)', accent:'#0ea5e9' },
  'Bouncy':      { trail:'#a78bfa', ball:'#8b5cf6', obstacle:'#2d1b4e', flash:'rgba(167,139,250,0.12)', accent:'#a78bfa' },
}
const themeFor = (name) => THEMES[name] || THEMES.Classic

/** Worlds rotate each level - now with more variety */
const WORLDS = [
  { name:'Clouds',   bg:'sky',    obstacle:'#394454', colMul:0.90, gapBonus:+12, special:null },
  { name:'Caverns',  bg:'cave',   obstacle:'#2b313b', colMul:1.00, gapBonus:+4,  special:'stalactites' },
  { name:'Circuit',  bg:'tech',   obstacle:'#1f2937', colMul:1.05, gapBonus:-2,  special:'glitch' },
  { name:'Nebula',   bg:'space',  obstacle:'#151a32', colMul:1.00, gapBonus:-8,  special:'gravity_wells' },
  { name:'Inferno',  bg:'fire',   obstacle:'#4a1c1c', colMul:1.08, gapBonus:-12, special:'rising_heat' },
  { name:'Void',     bg:'void',   obstacle:'#0a0a0f', colMul:1.12, gapBonus:-16, special:'darkness' },
  { name:'Storm',    bg:'storm',  obstacle:'#1e3a5f', colMul:1.06, gapBonus:-6,  special:'wind' },
  { name:'Crystal',  bg:'crystal',obstacle:'#2d1b4e', colMul:0.95, gapBonus:+2,  special:'refraction' },
]
const worldForLevel = (levelIndex) => WORLDS[levelIndex % WORLDS.length]

// Utility functions
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeOut = (t) => 1 - Math.pow(1 - t, 2)
const easeInOut = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2
const rand = (min, max) => min + Math.random() * (max - min)
const randInt = (min, max) => Math.floor(rand(min, max + 1))
const choose = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Achievement definitions (legacy - kept for backward compat)
const ACHIEVEMENTS = {
  first_flight:    { name: 'First Flight',     desc: 'Score your first point', icon: '🪶', threshold: 1 },
  getting_started: { name: 'Getting Started',  desc: 'Reach score 10', icon: '⭐', threshold: 10 },
  double_digits:   { name: 'Double Digits',    desc: 'Reach score 25', icon: '🌟', threshold: 25 },
  half_century:    { name: 'Half Century',     desc: 'Reach score 50', icon: '💫', threshold: 50 },
  centurion:       { name: 'Centurion',        desc: 'Reach score 100', icon: '🏆', threshold: 100 },
  legendary:       { name: 'Legendary',        desc: 'Reach score 200', icon: '👑', threshold: 200 },
  impossible:      { name: 'Impossible',       desc: 'Reach score 500', icon: '🔥', threshold: 500 },
  combo_5:         { name: 'Combo Starter',    desc: 'Get a 5x combo', icon: '⚡', threshold: 5, type: 'combo' },
  combo_10:        { name: 'Combo Master',     desc: 'Get a 10x combo', icon: '💥', threshold: 10, type: 'combo' },
  combo_20:        { name: 'Combo Legend',     desc: 'Get a 20x combo', icon: '🌈', threshold: 20, type: 'combo' },
  near_miss_10:    { name: 'Daredevil',        desc: 'Get 10 near misses', icon: '😎', threshold: 10, type: 'near_miss' },
  near_miss_50:    { name: 'Risk Taker',       desc: 'Get 50 near misses', icon: '🎯', threshold: 50, type: 'near_miss' },
  level_5:         { name: 'Explorer',         desc: 'Reach level 5', icon: '🗺️', threshold: 5, type: 'level' },
  level_10:        { name: 'Voyager',          desc: 'Reach level 10', icon: '🚀', threshold: 10, type: 'level' },
  survivor_60:     { name: 'Survivor',         desc: 'Survive 60 seconds', icon: '⏱️', threshold: 60, type: 'time' },
  survivor_180:    { name: 'Endurance',        desc: 'Survive 3 minutes', icon: '🏅', threshold: 180, type: 'time' },
}

export default function Game({ daily, playerId }) {
  const shellRef = useRef(null)
  const canvasRef = useRef(null)
  const [state, setState] = useState('ready')
  const [lastSubmitted, setLastSubmitted] = useState(null)
  const [banner, setBanner] = useState(null)
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return !localStorage.getItem('obc_tutorial_seen') }
    catch { return true }
  })
  const [stats, setStats] = useState({
    score: 0, combo: 0, maxCombo: 0, nearMisses: 0, level: 1, time: 0, coins: 0
  })
  const [newAchievement, setNewAchievement] = useState(null)
  const [showShop, setShowShop] = useState(false)
  const [gameOverData, setGameOverData] = useState(null)

  const { beep, chord } = useSfx()

  // ========== EXPANSION MANAGERS (persistent refs) ==========
  const powerupManagerRef = useRef(null)
  const collectiblesManagerRef = useRef(null)
  const floatingTextManagerRef = useRef(null)
  const missionTrackerRef = useRef(null)
  const achievementTrackerRef = useRef(null)
  const progressionManagerRef = useRef(null)
  const trailRendererRef = useRef(null)

  // Initialize managers once
  useEffect(() => {
    powerupManagerRef.current = new PowerupManager()
    collectiblesManagerRef.current = new CollectiblesManager()
    floatingTextManagerRef.current = new FloatingTextManager()
    missionTrackerRef.current = new MissionTracker()
    achievementTrackerRef.current = new AchievementTracker()
    progressionManagerRef.current = new ProgressionManager()
    trailRendererRef.current = new TrailRenderer()

    // Load saved data
    progressionManagerRef.current.load()
    missionTrackerRef.current.load()
    achievementTrackerRef.current.load()

    console.log('🎮 Expansion systems initialized!')
    console.log('   - Coins:', progressionManagerRef.current.coins)
    console.log('   - Level:', progressionManagerRef.current.level)
  }, [])

  // Read daily config and apply user-selected mode preset
  const seed = daily?.seed ?? 'classic'
  const baseDaily = {
    modeName: daily?.modeName || 'Classic',
    gravityFlipEveryMs: daily?.gravityFlipEveryMs ?? 3000,
    obstacleSpeed: daily?.obstacleSpeed ?? 3,
    freezeDurationMs: daily?.freezeDurationMs ?? 280,
    themeKey: daily?.modeName || 'Classic',
  }
  
  // Get user's selected mode from localStorage
  const selectedModeName =
    (typeof window !== 'undefined' && (localStorage.getItem('obc_mode') || 'Classic')) || 'Classic'
  
  // Get the preset for this mode (fallback to Classic if not found)
  const selectedPreset = MODE_PRESETS[selectedModeName] || MODE_PRESETS['Classic']
  
  // Apply mode preset to daily config
  const active = applyMode(baseDaily, selectedPreset)
  
  // Debug: log active mode on mount
  useEffect(() => {
    console.log('🎮 Mode activated:', selectedModeName, active.modeName)
    console.log('   - Start gravity:', active.startGravity)
    console.log('   - Speed:', active.speed)
    console.log('   - Freeze:', active.freezeMs)
    console.log('   - Flip interval:', active.flipMs)
    console.log('   - Background:', active.bg)
    console.log('   - Behaviors:', active.behaviors)
  }, [selectedModeName])

  const modeName = active.modeName
  const baseFlipMs = active.flipMs
  const baseObstacleSpeed = active.speed
  const baseFreezeMs = active.freezeMs
  const BASE_THEME = themeFor(active.themeKey)

  // Achievement checker (legacy)
  const checkAchievements = useCallback((stats) => {
    const unlocked = JSON.parse(localStorage.getItem('obc_achievements') || '{}')
    for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
      if (unlocked[key]) continue
      
      let earned = false
      if (ach.type === 'combo' && stats.maxCombo >= ach.threshold) earned = true
      else if (ach.type === 'near_miss' && stats.nearMisses >= ach.threshold) earned = true
      else if (ach.type === 'level' && stats.level >= ach.threshold) earned = true
      else if (ach.type === 'time' && stats.time >= ach.threshold) earned = true
      else if (!ach.type && stats.score >= ach.threshold) earned = true
      
      if (earned) {
        unlocked[key] = Date.now()
        localStorage.setItem('obc_achievements', JSON.stringify(unlocked))
        setNewAchievement({ ...ach, key })
        setTimeout(() => setNewAchievement(null), 3000)
        return // Only show one at a time
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const shell = shellRef.current
    if (!canvas || !shell) return

    // Get managers
    const powerupManager = powerupManagerRef.current
    const collectiblesManager = collectiblesManagerRef.current
    const floatingTextManager = floatingTextManagerRef.current
    const missionTracker = missionTrackerRef.current
    const achievementTracker = achievementTrackerRef.current
    const progressionManager = progressionManagerRef.current
    const trailRenderer = trailRendererRef.current

    if (!powerupManager || !progressionManager) {
      console.warn('Managers not ready yet')
      return
    }

    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const W = 360, H = 640, ASPECT = H / W

    function cssFit() {
      const rect = shell.getBoundingClientRect()
      const vvH = window.visualViewport?.height || window.innerHeight
      const reservedBelow = 260
      const availableHeight = Math.max(320, vvH - rect.top - reservedBelow)
      const maxW = Math.min(560, document.documentElement.clientWidth * 0.96)
      const cssW = Math.max(300, Math.min(maxW, availableHeight / ASPECT))
      canvas.style.width = Math.round(cssW) + 'px'
      canvas.style.height = Math.round(cssW * ASPECT) + 'px'
    }
    cssFit()
    const ro = new ResizeObserver(cssFit)
    ro.observe(document.body)
    window.addEventListener('resize', cssFit)
    window.visualViewport?.addEventListener('resize', cssFit)

    canvas.width = W * DPR
    canvas.height = H * DPR
    const ctx = canvas.getContext('2d')
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

    // ========== ENHANCED GAME CONSTANTS ==========
    const LEVEL_SIZE = 15
    const LEVEL_STEP = 0.05
    const WITHIN_LEVEL_SPAN = 0.06
    const GRACE_SEC = 5
    
    const GAP_START = 380, GAP_END = 120
    const GAP_HARD_MIN = 80
    const SPEED_BASE = baseObstacleSpeed * 60
    const SPEED_MAX_MULT = 2.0
    const PLAYER_X = 96, R = 12, G = 520
    
    // Combo system
    const COMBO_DECAY_MS = 2000
    const NEAR_MISS_THRESHOLD = 8
    const NEAR_MISS_BONUS = 0.5
    
    // Screen shake
    let shakeIntensity = 0
    let shakeDecay = 0.92
    
    // ========== LANDMARK OBSTACLE SHAPES ==========
    const LANDMARK_SHAPES = [
      'rectangle', 'pyramid', 'mountain', 'castle', 'skyscraper',
      'tree', 'eiffel', 'colosseum', 'pagoda', 'spire',
    ]
    
    function getLandmarkForScore(score) {
      if (score < 3) return choose(['rectangle', 'pyramid', 'mountain'])
      if (score < 8) return choose(['rectangle', 'pyramid', 'mountain', 'castle', 'tree'])
      if (score < 15) return choose(['pyramid', 'mountain', 'castle', 'tree', 'skyscraper', 'colosseum'])
      return choose(LANDMARK_SHAPES)
    }

    // Background particles
    const dots = Array.from({ length: 50 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.3 + Math.random() * 1.4,
      speed: 0.5 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.5
    }))
    
    let particles = [], trail = []
    
    // Enhanced particle system
    function puff(x, y, color, count = 10, spread = 1) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = (40 + Math.random() * 120) * spread
        particles.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.3,
          color,
          size: 1.5 + Math.random() * 2,
          g: 200 + Math.random() * 100
        })
      }
    }
    
    function sparks(x, y, color, count = 5) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 60 + Math.random() * 80
        particles.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.2 + Math.random() * 0.15,
          color,
          size: 1,
          g: 0,
          spark: true
        })
      }
    }
    
    function confetti(x = W / 2, y = H * 0.35) {
      const cols = ['#f43f5e', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#fbbf24']
      for (let i = 0; i < 100; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 100 + Math.random() * 250
        const c = cols[i % cols.length]
        particles.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1.0 + Math.random() * 0.8,
          color: c,
          size: 2 + Math.random() * 3,
          g: 180,
          confetti: true,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 10
        })
      }
    }
    
    // Floating text for score popups (internal version)
    let floatingTexts = []
    function addFloatingText(x, y, text, color = '#fff', size = 16) {
      floatingTexts.push({ x, y, text, color, size, life: 1.0, vy: -40 })
      // Also add to the expansion floating text manager
      floatingTextManager?.add(x, y, text, color)
    }

    // ========== OBSTACLE SYSTEM ==========
    let obstacles = [], rightmostX = 0
    
    const FIRST_EASY_WALLS = 8
    const SECOND_EASY_WALLS = 15
    
    const PATTERNS = {
      normal: (d, gapY, gapH) => [{ gapY, gapH, moving: false }],
      
      moving: (d, gapY, gapH) => [{
        gapY,
        gapH,
        moving: true,
        moveSpeed: 30 + d * 40,
        moveRange: 40 + d * 30,
        movePhase: Math.random() * Math.PI * 2
      }],
      
      double: (d, gapY, gapH) => {
        const offset = 60 + Math.random() * 40
        const gap2 = clamp(gapY + (Math.random() > 0.5 ? offset : -offset), 80, H - 80)
        return [
          { gapY, gapH, moving: false },
          { gapY: gap2, gapH: gapH * 0.9, moving: false, xOffset: 35 }
        ]
      },
      
      zigzag: (d, gapY, gapH) => {
        const dir = Math.random() > 0.5 ? 1 : -1
        return [{
          gapY,
          gapH,
          moving: true,
          moveSpeed: 50 + d * 30,
          moveRange: 60,
          moveDir: dir,
          zigzag: true
        }]
      }
    }
    
    function getPatternForDifficulty(d) {
      if (d < 0.25) return 'normal'
      if (d < 0.4) return Math.random() < 0.12 ? 'moving' : 'normal'
      if (d < 0.6) return Math.random() < 0.2 ? choose(['moving', 'double']) : 'normal'
      if (d < 0.8) return Math.random() < 0.3 ? choose(['moving', 'double', 'zigzag']) : 'normal'
      return Math.random() < 0.4 ? choose(['moving', 'double', 'zigzag']) : 'normal'
    }

    function baseSpawn(d) {
      return lerp(280, 150, Math.min(d, 1.5))
    }
    
    function spawnDist(d) {
      const within = localScore - levelStartScore
      let early = 0
      if (within < FIRST_EASY_WALLS) early = 120
      else if (within < SECOND_EASY_WALLS) early = 60
      return baseSpawn(d) + early
    }

    const randGapY = () => {
      const m = 75
      return m + Math.random() * (H - m * 2)
    }

    function spawnObstacle(x, d) {
      const world = worldForLevel(levelIndex)
      const gapY = randGapY()
      
      let gapH = lerp(GAP_START + (world.gapBonus || 0), GAP_END, Math.min(d, 1.0))
      if (d > 1.0) {
        gapH = lerp(GAP_END, GAP_HARD_MIN, (d - 1.0) / 0.5)
      }
      gapH = Math.max(GAP_HARD_MIN, gapH)
      
      const patternType = getPatternForDifficulty(d)
      const pattern = PATTERNS[patternType](d, gapY, gapH)
      
      const baseWidth = clamp(lerp(32, 55, d) * (world.colMul || 1), 28, 60)
      const shape = getLandmarkForScore(localScore)
      
      pattern.forEach((p, i) => {
        obstacles.push({
          x: x + (p.xOffset || 0),
          gapY: p.gapY,
          gapH: p.gapH || gapH,
          width: baseWidth,
          shape: shape,
          passed: false,
          nearMissChecked: false,
          moving: p.moving || false,
          moveSpeed: p.moveSpeed || 0,
          moveRange: p.moveRange || 0,
          movePhase: p.movePhase || 0,
          zigzag: p.zigzag || false,
          moveDir: p.moveDir || 1,
          pattern: patternType,
          // Store gap center for coin spawning
          gapCenterX: x + (p.xOffset || 0) + baseWidth / 2,
          gapCenterY: p.gapY
        })
      })
      
      return x + spawnDist(d)
    }

    function spawnInitial() {
      obstacles = []
      creatures = []
      rightmostX = W + 80
      for (let i = 0; i < 8; i++) {
        rightmostX = spawnObstacle(rightmostX, 0)
      }
    }

    // ========== CREATURES ==========
    let creatures = []
    let lastCreatureSpawn = 0
    const CREATURE_SPAWN_INTERVAL = 1800
    
    function spawnCreature(now) {
      const effectiveLevel = Math.max(1, levelIndex + 1)
      const type = pickObstacleType(effectiveLevel)
      if (type === 'bar') return
      
      const creature = createObstacle(type, W + 50, null, effectiveLevel, H)
      creatures.push(creature)
      lastCreatureSpawn = now
    }

    // ========== GAME STATE ==========
    let y = H * 0.5, vy = 0, gravityDir = active.startGravity, lastFlip = performance.now()
    let freezeUntil = 0, localScore = 0, gameState = 'ready', paused = false
    let runStart = performance.now()
    let levelIndex = 0, levelStartScore = 0
    let combo = 0, maxCombo = 0, lastScoreTime = 0
    let nearMissCount = 0
    let totalTime = 0
    
    // ========== EXPANSION STATE ==========
    let powerupsCollectedThisGame = 0
    let powerupTypesUsed = new Set()

    function announceLevel() {
      const w = worldForLevel(levelIndex)
      
      const newCreatures = Object.entries(OBSTACLE_TYPES)
        .filter(([_, config]) => config.unlockLevel === levelIndex + 1 && config.name !== 'Bar')
        .map(([_, config]) => config.name)
      
      let subtext = `+${Math.round(LEVEL_STEP * 100)}% difficulty`
      if (newCreatures.length > 0) {
        subtext = `🆕 ${newCreatures.join(', ')} unlocked!`
      }
      
      setBanner({
        text: `Level ${levelIndex + 1}: ${w.name}`,
        subtext,
        until: performance.now() + 2800
      })
    }

    function reset() {
      localScore = 0
      levelIndex = 0
      levelStartScore = 0
      y = H * 0.5
      vy = 0
      trail = []
      gravityDir = active.startGravity
      lastFlip = performance.now()
      freezeUntil = 0
      combo = 0
      maxCombo = 0
      nearMissCount = 0
      totalTime = 0
      lastScoreTime = 0
      floatingTexts = []
      creatures = []
      lastCreatureSpawn = 0
      powerupsCollectedThisGame = 0
      powerupTypesUsed = new Set()
      
      // Reset expansion managers
      powerupManager?.reset()
      collectiblesManager?.reset()
      trailRenderer?.reset()
      missionTracker?.startGame(selectedModeName.toLowerCase())
      
      spawnInitial()
      gameState = 'ready'
      setState('ready')
      runStart = performance.now()
      setStats({ score: 0, combo: 0, maxCombo: 0, nearMisses: 0, level: 1, time: 0, coins: 0 })
      setGameOverData(null)
      announceLevel()
    }
    
    function start() {
      if (gameState !== 'ready') return
      runStart = performance.now()
      gameState = 'playing'
      setState('playing')
    }
    
    function togglePause() {
      if (gameState !== 'playing' && !paused) return
      paused = !paused
      setState(paused ? 'paused' : 'playing')
    }
    
    function gameOver() {
      if (gameState === 'gameover') return
      gameState = 'gameover'
      setState('gameover')
      vibrate?.([20, 60, 20])
      chord([196, 130], 0.18)
      shakeIntensity = 15
      
      // Get session coins from collectibles manager
      const sessionCoins = collectiblesManager?.sessionCoins || 0
      
      const finalStats = { 
        score: localScore, 
        combo: combo, 
        maxCombo, 
        nearMisses: nearMissCount, 
        level: levelIndex + 1,
        time: Math.floor(totalTime),
        coins: sessionCoins
      }
      setStats(finalStats)
      checkAchievements(finalStats)
      
      // ========== EXPANSION: End of game processing ==========
      // Add coins to player's total
      progressionManager?.addCoins(sessionCoins)
      
      // Calculate and add XP
      const xpGained = progressionManager?.calculateGameXP(
        localScore,
        sessionCoins,
        localScore, // obstacles passed ≈ score
        powerupsCollectedThisGame
      ) || 0
      const xpResult = progressionManager?.addXP(xpGained) || { leveledUp: false }
      
      // Update mission progress one final time
      missionTracker?.updateProgress({
        score: localScore,
        coins: sessionCoins,
        maxCombo: maxCombo,
        time: Math.floor(totalTime),
        obstacles: localScore,
        powerups: powerupsCollectedThisGame,
        nearMisses: nearMissCount,
        usedPowerup: powerupsCollectedThisGame > 0,
        usedShield: powerupTypesUsed.has('shield')
      })
      
      // Check mission completions
      const completedMissions = missionTracker?.checkCompletions() || []
      for (const mission of completedMissions) {
        progressionManager?.addCoins(mission.reward)
        addFloatingText(W / 2, H * 0.3, `🎯 +${mission.reward}`, '#4CAF50', 18)
      }
      
      // Update stats for achievement tracker
      progressionManager?.updateGameStats(localScore, sessionCoins, Math.floor(totalTime), maxCombo)
      
      // Check achievements
      achievementTracker?.updateStats({
        score: localScore,
        coins: sessionCoins,
        mode: selectedModeName.toLowerCase(),
        maxCombo,
        nearMisses: nearMissCount,
        powerupsUsed: [...powerupTypesUsed]
      })
      const newAchievements = achievementTracker?.checkAchievements() || []
      
      // Store game over data for display
      setGameOverData({
        score: localScore,
        coins: sessionCoins,
        xpGained,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel,
        levelRewards: xpResult.rewards,
        completedMissions,
        newAchievements
      })
      
      // Legacy best score handling
      try {
        const dk = `obc_best_${seed}`
        const bestDaily = parseInt(localStorage.getItem(dk) || '0', 10)
        const bestAll = parseInt(localStorage.getItem('obc_best_all') || '0', 10)
        let text = ''
        
        if (localScore > bestAll) {
          localStorage.setItem('obc_best_all', String(localScore))
          text = '🏆 New ALL-TIME Best!'
          confetti()
        }
        if (localScore > bestDaily) {
          localStorage.setItem(dk, String(localScore))
          text = text || '⭐ New Daily Best!'
          if (!text.includes('ALL-TIME')) confetti(W / 2, H * 0.4)
        }
        if (text) setBanner({ text, until: performance.now() + 4000 })
      } catch {}
      
      if (playerId) {
        submitScoreWithQueue({ playerId, score: localScore, modeName })
          .then(r => setLastSubmitted({ queued: !!r?.queued, score: localScore, at: Date.now() }))
          .catch(() => setLastSubmitted({ queued: true, score: localScore, at: Date.now() }))
      }
    }
    
    async function onPress() {
      await resumeAudio()
      if (paused) return
      if (gameState === 'ready') return start()
      if (gameState === 'gameover') return reset()
      
      const d = difficulty(performance.now())
      const freeze = baseFreezeMs * lerp(0.9, 0.5, Math.min(d, 1.5))
      vy += -gravityDir * 220
      freezeUntil = performance.now() + freeze
      puff(PLAYER_X, y, theme().trail, 8)
      sparks(PLAYER_X, y, theme().accent, 4)
      vibrate?.(8)
      beep(520, 0.05, 'sine', 0.02)
    }

    // Input handlers
    const press = e => { e?.preventDefault?.(); onPress() }
    canvas.addEventListener('mousedown', press)
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches?.length >= 2) {
        e.preventDefault()
        togglePause()
        return
      }
      press(e)
    }, { passive: false })
    
    const onKey = e => {
      if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPress()
      }
      if (e.code === 'KeyP') togglePause()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('obc-toggle-pause', togglePause)
    canvas.addEventListener('contextmenu', e => e.preventDefault())

    reset()

    // ========== DIFFICULTY FUNCTION ==========
    function difficulty(now) {
      const baseline = LEVEL_STEP * levelIndex
      const tSec = Math.max(0, (now - runStart) / 1000 - GRACE_SEC)
      const progressWithinLevel = clamp((localScore - levelStartScore) / LEVEL_SIZE, 0, 1)
      const within = clamp(0.6 * progressWithinLevel + 0.4 * (tSec / 40), 0, 1)
      const d = baseline + WITHIN_LEVEL_SPAN * easeOut(within)
      return d
    }

    function theme() {
      const w = worldForLevel(levelIndex)
      return { ...BASE_THEME, obstacle: w.obstacle }
    }

    // ========== MAIN GAME LOOP ==========
    let last = performance.now()
    
    function frame(now) {
      let dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const d = difficulty(now)
      const world = worldForLevel(levelIndex)
      const T = theme()
      
      // ========== GET POWERUP MODIFIERS ==========
      const modifiers = powerupManager?.getModifiers() || {
        playerScale: 1,
        timeScale: 1,
        isGhost: false,
        hasMagnet: false,
        gravityLocked: false,
        hasShield: false
      }
      
      // Apply time scale (slow-mo effect)
      const effectiveDt = dt * modifiers.timeScale
      
      // Apply shrink to player radius
      const effectiveR = R * modifiers.playerScale
      
      // Calculate dynamic values based on difficulty
      let GAP_H = lerp(GAP_START + (world.gapBonus || 0), GAP_END, Math.min(d, 1.0))
      if (d > 1.0) {
        GAP_H = lerp(GAP_END, GAP_HARD_MIN, (d - 1.0) / 0.5)
      }
      GAP_H = Math.max(GAP_HARD_MIN, GAP_H)
      
      const speedMult = Math.min(lerp(0.4, 1.2, Math.min(d, 1.0)) + Math.max(0, (d - 1.0) * 0.25), SPEED_MAX_MULT)
      const SPEED = SPEED_BASE * speedMult
      const flipMs = Math.round(lerp(baseFlipMs * 1.35, baseFlipMs * 0.8, Math.min(d, 1.2)))
      const fudge = lerp(4, 0, Math.min(d, 1.0))
      
      const COL_W = clamp(lerp(28, 55, Math.min(d, 1.0)) * (world.colMul || 1), 24, 60)
      
      // Update screen shake
      shakeIntensity *= shakeDecay
      if (shakeIntensity < 0.1) shakeIntensity = 0
      const shakeX = (Math.random() - 0.5) * shakeIntensity * 2
      const shakeY = (Math.random() - 0.5) * shakeIntensity * 2

      if (gameState === 'playing' && !paused) {
        totalTime += dt
        
        // ========== UPDATE EXPANSION SYSTEMS ==========
        powerupManager?.update()
        powerupManager?.updateSpawned(effectiveDt, W)
        collectiblesManager?.update(effectiveDt, PLAYER_X, y, effectiveR, modifiers.hasMagnet)
        floatingTextManager?.update(effectiveDt)
        
        // Update trail renderer
        const currentTrail = progressionManager?.getCurrentTrail() || { id: 'none' }
        trailRenderer?.update(PLAYER_X, y, currentTrail.id, effectiveDt)
        
        // ========== CHECK POWERUP COLLECTION ==========
        const collectedPowerup = powerupManager?.checkCollisions(PLAYER_X, y, effectiveR)
        if (collectedPowerup) {
          addFloatingText(PLAYER_X, y - 30, collectedPowerup.message, '#00BFFF', 16)
          beep(880, 0.08, 'sine', 0.03)
          puff(PLAYER_X, y, '#00BFFF', 12, 1.2)
          powerupsCollectedThisGame++
          if (collectedPowerup.type) {
            powerupTypesUsed.add(collectedPowerup.type.id)
          }
          missionTracker?.updateProgress({ powerups: powerupsCollectedThisGame })
        }
        
        // ========== CHECK COIN COLLECTION ==========
        const collectedCoins = collectiblesManager?.checkCollisions(PLAYER_X, y, effectiveR) || []
        for (const coin of collectedCoins) {
          addFloatingText(
            coin.x, 
            coin.y - 10, 
            `+${coin.value}`, 
            coin.multiplier > 1 ? '#FF8C00' : '#FFD700',
            coin.multiplier > 1 ? 16 : 14
          )
          beep(600 + coin.value * 20, 0.04, 'sine', 0.02)
        }
        
        // Combo decay
        if (now - lastScoreTime > COMBO_DECAY_MS && combo > 0) {
          combo = 0
        }
        
        // Gravity flips - CHECK GRAVITY LOCK
        if (active.flip !== 'none' && !modifiers.gravityLocked) {
          if (now - lastFlip >= flipMs) {
            gravityDir *= -1
            lastFlip = now
            beep(360, 0.06, 'triangle', 0.018)
            puff(PLAYER_X, y, '#fbbf24', 6, 0.5)
          }
          // Chaos flips - also blocked by gravity lock
          if (active.behaviors.chaos) {
            const chaosChance = active.behaviors.chaosChance || 0.02
            if (now - lastFlip > (active.behaviors.chaosMinMs || 400) && Math.random() < chaosChance) {
              gravityDir *= -1
              lastFlip = now
              beep(460, 0.05, 'square', 0.02)
              shakeIntensity = 4
              addFloatingText(PLAYER_X, y - 30, '⚡ CHAOS!', '#f59e0b', 16)
            }
          }
        }
        
        // Show gravity lock indicator
        if (modifiers.gravityLocked && Math.random() < 0.05) {
          addFloatingText(PLAYER_X + 20, y, '🔒', '#32CD32', 12)
        }

        // Physics
        vy += (G * gravityDir) * effectiveDt
        if (active.behaviors.sineAmp > 0) {
          const w = (2 * Math.PI) / (active.behaviors.sinePeriodMs || 1200)
          vy += (G * active.behaviors.sineAmp) * Math.sin(now * w) * effectiveDt
        }
        
        if (world.special === 'wind') {
          vy += Math.sin(now / 800) * 50 * effectiveDt
        }
        
        y += vy * effectiveDt

        // Move obstacles
        const frozen = now < freezeUntil
        if (!frozen) {
          for (const o of obstacles) {
            o.x -= SPEED * effectiveDt
            
            if (o.moving) {
              if (o.zigzag) {
                o.gapY += o.moveSpeed * o.moveDir * effectiveDt
                if (o.gapY > H - 100 || o.gapY < 100) {
                  o.moveDir *= -1
                }
              } else {
                o.movePhase += effectiveDt * 2
                o.gapY += Math.sin(o.movePhase) * o.moveSpeed * effectiveDt
                o.gapY = clamp(o.gapY, 80, H - 80)
              }
            }
          }
        }

        // Cleanup and spawn obstacles
        while (obstacles.length && obstacles[0].x + COL_W < -20) obstacles.shift()
        if (obstacles.length) rightmostX = Math.max(rightmostX, obstacles[obstacles.length - 1].x)
        while (obstacles.length < 12) {
          rightmostX = spawnObstacle(rightmostX, d)
          
          // ========== SPAWN COINS AT NEW OBSTACLES ==========
          const newObs = obstacles[obstacles.length - 1]
          if (newObs && collectiblesManager) {
            collectiblesManager.spawnAtGap(
              newObs.gapCenterX || newObs.x + newObs.width / 2,
              newObs.gapCenterY || newObs.gapY,
              SPEED
            )
          }
          
          // ========== TRY TO SPAWN POWERUP ==========
          powerupManager?.trySpawn(W, H, SPEED, localScore)
        }

        // ========== CREATURES ==========
        const spawnInterval = CREATURE_SPAWN_INTERVAL / (1 + d * 0.5)
        if (now - lastCreatureSpawn > spawnInterval) {
          spawnCreature(now)
        }
        
        if (!frozen) {
          for (const c of creatures) {
            c.x -= SPEED * 0.8 * effectiveDt
            updateObstacle(c, effectiveDt, now, H, y)
          }
        }
        
        creatures = creatures.filter(c => c.x > -150)
        
        // Creature collisions - GHOST MODE SKIPS
        if (!modifiers.isGhost) {
          for (const c of creatures) {
            if (checkCreatureCollision(c, PLAYER_X, y, effectiveR, fudge)) {
              // ========== TRY SHIELD FIRST ==========
              if (powerupManager?.useShield()) {
                addFloatingText(PLAYER_X, y - 30, '🛡️ SAVED!', '#00BFFF', 18)
                puff(PLAYER_X, y, '#00BFFF', 20, 1.5)
                beep(440, 0.1, 'sine', 0.05)
                shakeIntensity = 8
              } else {
                puff(PLAYER_X, y, '#ef4444', 15, 1.5)
                addFloatingText(PLAYER_X, y - 30, `${OBSTACLE_TYPES[c.type]?.name || 'Hit'}!`, '#ef4444', 16)
                gameOver()
              }
              break
            }
            
            if (!c.passed && c.x + 50 < PLAYER_X) {
              c.passed = true
              localScore += 2
              combo++
              if (combo > maxCombo) maxCombo = combo
              lastScoreTime = now
              addFloatingText(PLAYER_X, y - 25, '+2 Dodge!', '#22c55e', 14)
              beep(600, 0.05, 'triangle', 0.02)
            }
          }
        }

        // Scoring and collision
        for (const o of obstacles) {
          if (!o.passed && (o.x + o.width) < (PLAYER_X - effectiveR)) {
            o.passed = true
            
            const gt = o.gapY - o.gapH / 2 + fudge
            const gb = o.gapY + o.gapH / 2 - fudge
            const distTop = y - effectiveR - gt
            const distBot = gb - (y + effectiveR)
            const minDist = Math.min(distTop, distBot)
            
            let scoreGain = 1
            let nearMiss = false
            
            if (minDist < NEAR_MISS_THRESHOLD && minDist > 0) {
              nearMiss = true
              nearMissCount++
              scoreGain += NEAR_MISS_BONUS
              sparks(PLAYER_X + 20, y, '#fbbf24', 8)
              addFloatingText(PLAYER_X + 30, y - 20, 'CLOSE!', '#fbbf24', 14)
              beep(800, 0.03, 'sine', 0.01)
              
              // Near miss also adds coins!
              collectiblesManager?.checkNearMiss(PLAYER_X, y, o.x + o.width, o.gapY)
            }
            
            combo++
            if (combo > maxCombo) maxCombo = combo
            lastScoreTime = now
            
            if (combo >= 5) {
              const comboBonus = Math.floor(combo / 5) * 0.5
              scoreGain += comboBonus
              if (combo % 5 === 0) {
                addFloatingText(PLAYER_X, y - 40, `${combo}x COMBO!`, '#22c55e', 18)
                beep(880, 0.08, 'square', 0.03)
                puff(PLAYER_X, y, '#22c55e', 12, 1.2)
              }
            }
            
            localScore += Math.floor(scoreGain)
            beep(700, 0.05, 'square', 0.018)
            
            // Update mission progress
            missionTracker?.updateProgress({
              score: localScore,
              coins: collectiblesManager?.sessionCoins || 0,
              maxCombo: maxCombo,
              time: Math.floor(totalTime),
              obstacles: localScore,
              nearMisses: nearMissCount
            })
            
            if (localScore - levelStartScore >= LEVEL_SIZE) {
              levelIndex += 1
              levelStartScore = localScore
              announceLevel()
              chord([330, 220], 0.2)
              confetti(PLAYER_X, y)
              
              const currentStats = {
                score: localScore,
                combo,
                maxCombo,
                nearMisses: nearMissCount,
                level: levelIndex + 1,
                time: Math.floor(totalTime)
              }
              setStats(currentStats)
              checkAchievements(currentStats)
            }
          }
        }

        // Bounds and collision
        const outTop = (y - effectiveR < 0), outBottom = (y + effectiveR > H)
        if (outTop || outBottom) {
          if (active.behaviors.bouncy) {
            if (outTop) { y = effectiveR + 1; vy = Math.abs(vy) * 0.6 }
            else { y = H - effectiveR - 1; vy = -Math.abs(vy) * 0.6 }
            vibrate?.(6)
            shakeIntensity = 2
          } else {
            // ========== TRY SHIELD ==========
            if (powerupManager?.useShield()) {
              addFloatingText(PLAYER_X, y - 30, '🛡️ SAVED!', '#00BFFF', 18)
              puff(PLAYER_X, y, '#00BFFF', 20, 1.5)
              if (outTop) { y = effectiveR + 1; vy = Math.abs(vy) * 0.3 }
              else { y = H - effectiveR - 1; vy = -Math.abs(vy) * 0.3 }
            } else {
              gameOver()
            }
          }
        } else if (!modifiers.isGhost) {
          // Obstacle collision - GHOST MODE SKIPS
          for (const o of obstacles) {
            const wx = (PLAYER_X + effectiveR > o.x) && (PLAYER_X - effectiveR < o.x + o.width)
            if (wx) {
              const gt = o.gapY - o.gapH / 2 + fudge
              const gb = o.gapY + o.gapH / 2 - fudge
              const inGap = (y - effectiveR >= gt) && (y + effectiveR <= gb)
              if (!inGap) {
                // ========== TRY SHIELD ==========
                if (powerupManager?.useShield()) {
                  addFloatingText(PLAYER_X, y - 30, '🛡️ SAVED!', '#00BFFF', 18)
                  puff(PLAYER_X, y, '#00BFFF', 20, 1.5)
                  beep(440, 0.1, 'sine', 0.05)
                  shakeIntensity = 8
                  // Push player into gap
                  y = o.gapY
                  vy = 0
                } else {
                  gameOver()
                }
                break
              }
            }
          }
        }
      }

      // ========== RENDERING ==========
      ctx.save()
      ctx.translate(shakeX, shakeY)
      
      // Background
      drawBackground(ctx, W, H, active.bg || world.bg, now, d)

      // Background particles
      ctx.fillStyle = '#dbeafe'
      for (const dot of dots) {
        ctx.globalAlpha = dot.alpha
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.s, 0, Math.PI * 2)
        ctx.fill()
        dot.x -= dot.s * dot.speed * 4 * dt
        if (dot.x < -2) {
          dot.x = W + Math.random() * 16
          dot.y = Math.random() * H
        }
      }
      ctx.globalAlpha = 1

      // Obstacles
      const frozenNow = performance.now() < freezeUntil
      for (const o of obstacles) {
        const obsColor = frozenNow ? '#8ea3b8' : (T.obstacle || '#334155')
        const obsColorDark = adjustColor(obsColor, -20)
        const obsColorLight = adjustColor(obsColor, 15)
        
        const gt = o.gapY - o.gapH / 2
        const gb = o.gapY + o.gapH / 2
        const w = o.width
        const x = o.x
        
        ctx.fillStyle = obsColor
        
        drawLandmark(ctx, o.shape || 'rectangle', x, 0, w, gt, obsColor, obsColorDark, obsColorLight, 'top')
        drawLandmark(ctx, o.shape || 'rectangle', x, gb, w, H - gb, obsColor, obsColorDark, obsColorLight, 'bottom')
        
        if (o.moving && !frozenNow) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(o.x + o.width / 2, gt)
          ctx.lineTo(o.x + o.width / 2, gb)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      
      // Freeze overlay
      if (frozenNow) {
        ctx.fillStyle = 'rgba(173, 216, 230, 0.12)'
        ctx.fillRect(0, 0, W, H)
      }

      // ========== DRAW CREATURES ==========
      for (const c of creatures) {
        const typeConfig = OBSTACLE_TYPES[c.type]
        if (typeConfig && typeConfig.draw) {
          typeConfig.draw(ctx, c, T)
        }
      }

      // ========== DRAW COLLECTIBLES ==========
      collectiblesManager?.draw(ctx, now)

      // ========== DRAW POWERUPS ==========
      powerupManager?.draw(ctx, now)

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life -= dt
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += (p.g || 300) * dt
        
        ctx.globalAlpha = Math.max(0, p.life * 1.8)
        ctx.fillStyle = p.color
        
        if (p.confetti) {
          ctx.save()
          ctx.translate(p.x, p.y)
          p.rotation += p.rotSpeed * dt
          ctx.rotate(p.rotation)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
          ctx.restore()
        } else if (p.spark) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02)
          ctx.strokeStyle = p.color
          ctx.lineWidth = p.size
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // Floating texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i]
        ft.life -= dt
        ft.y += ft.vy * dt
        ft.vy *= 0.95
        
        if (ft.life <= 0) {
          floatingTexts.splice(i, 1)
          continue
        }
        
        ctx.globalAlpha = Math.min(1, ft.life * 2)
        ctx.fillStyle = ft.color
        ctx.font = `bold ${ft.size}px system-ui`
        ctx.fillText(ft.text, ft.x, ft.y)
        ctx.globalAlpha = 1
      }

      // ========== DRAW TRAIL (expansion) ==========
      const currentTrail = progressionManager?.getCurrentTrail() || { id: 'none' }
      trailRenderer?.draw(ctx, currentTrail.id)

      // Legacy trail (as fallback)
      if (currentTrail.id === 'none') {
        trail.push({ x: PLAYER_X, y })
        if (trail.length > 22) trail.shift()
        
        for (let i = 0; i < trail.length; i++) {
          const t = trail[i]
          const alpha = i / (trail.length * 1.3)
          ctx.globalAlpha = alpha
          ctx.beginPath()
          ctx.arc(t.x, t.y, effectiveR * (i / trail.length * 0.6), 0, Math.PI * 2)
          ctx.fillStyle = T.trail
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // ========== DRAW PLAYER WITH SKIN ==========
      const currentSkin = progressionManager?.getCurrentSkin() || PLAYER_SKINS[0]
      
      // Ghost effect
      if (modifiers.isGhost) {
        ctx.globalAlpha = 0.5
      }
      
      // Draw player with skin
      drawPlayerWithSkin(ctx, PLAYER_X, y, effectiveR, currentSkin, now)
      ctx.globalAlpha = 1
      
      // Shield indicator
      if (modifiers.hasShield) {
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.6)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(PLAYER_X, y, effectiveR + 8, 0, Math.PI * 2)
        ctx.stroke()
        
        // Pulsing glow
        const pulseAlpha = 0.2 + Math.sin(now / 200) * 0.1
        ctx.fillStyle = `rgba(0, 191, 255, ${pulseAlpha})`
        ctx.beginPath()
        ctx.arc(PLAYER_X, y, effectiveR + 12, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Glow effect when combo is high
      if (combo >= 5) {
        ctx.globalAlpha = 0.3 + Math.sin(now / 100) * 0.1
        ctx.beginPath()
        ctx.arc(PLAYER_X, y, effectiveR + 4 + combo / 5, 0, Math.PI * 2)
        ctx.fillStyle = T.accent
        ctx.fill()
        ctx.globalAlpha = 1
      }

      ctx.restore() // End shake transform

      // ========== HUD ==========
      const dHud = (gameState === 'playing') ? difficulty(now) : 0
      const diffPercent = Math.round(dHud * 100)
      
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 32px system-ui'
      ctx.fillText(String(localScore), 16, 42)
      
      // Combo display
      if (combo >= 3) {
        ctx.fillStyle = combo >= 10 ? '#22c55e' : '#f59e0b'
        ctx.font = 'bold 18px system-ui'
        ctx.fillText(`${combo}x`, 16, 66)
      }
      
      ctx.fillStyle = '#0f172a'
      ctx.font = '11px system-ui'
      ctx.fillText(`${modeName}`, 16, 82)
      ctx.fillText(`Lvl ${levelIndex + 1} · ${world.name}`, 16, 96)
      
      // Difficulty bar
      const barX = 16, barY = 104, barW = 80, barH = 6
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.fillRect(barX, barY, barW, barH)
      const fillW = Math.min(barW, barW * (dHud / 1.5))
      const barColor = dHud > 1.0 ? '#ef4444' : dHud > 0.7 ? '#f59e0b' : '#22c55e'
      ctx.fillStyle = barColor
      ctx.fillRect(barX, barY, fillW, barH)
      ctx.fillStyle = '#0f172a'
      ctx.font = '10px system-ui'
      ctx.fillText(`${diffPercent}%${dHud > 1 ? ' EXTREME' : ''}`, barX + barW + 6, barY + 5)
      
      // Gravity indicator
      const msLeft = Math.max(0, (paused ? 0 : flipMs) - (performance.now() - lastFlip))
      const gravIcon = state === 'paused' ? '⏸' : modifiers.gravityLocked ? '🔒' : gravityDir > 0 ? '↓' : '↑'
      ctx.fillText(`${gravIcon} ${Math.ceil(msLeft / 1000)}s`, 16, 124)
      
      // Creature indicator
      if (creatures.length > 0) {
        ctx.fillStyle = '#dc2626'
        ctx.font = 'bold 11px system-ui'
        ctx.fillText(`⚠️ ${creatures.length} creature${creatures.length > 1 ? 's' : ''}`, W - 100, 82)
      }
      ctx.fillStyle = '#64748b'
      ctx.font = '10px system-ui'
      const unlockedCount = Object.values(OBSTACLE_TYPES).filter(t => t.unlockLevel <= levelIndex + 1 && t.name !== 'Bar').length
      ctx.fillText(`🦈 ${unlockedCount} types unlocked`, W - 100, 96)

      // ========== DRAW EXPANSION HUD ==========
      // Coin counter
      const sessionCoins = collectiblesManager?.sessionCoins || 0
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.beginPath()
      ctx.roundRect(W - 90, 15, 75, 28, 8)
      ctx.fill()
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 16px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(`🪙 ${sessionCoins}`, W - 20, 35)
      ctx.textAlign = 'left'
      
      // Total coins (smaller, below)
      const totalCoins = progressionManager?.coins || 0
      ctx.fillStyle = 'rgba(255, 215, 0, 0.5)'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(`Total: ${totalCoins}`, W - 20, 52)
      ctx.textAlign = 'left'
      
      // Powerup HUD
      drawPowerupHUD(ctx, powerupManager, W)
      
      // Collectibles combo HUD
      collectiblesManager?.drawHUD(ctx, W)
      
      // XP bar (if playing)
      if (gameState === 'playing' && progressionManager) {
        drawXPBar(ctx, progressionManager, W)
      }
      
      // Mission progress (bottom left, only during gameplay)
      if (gameState === 'playing' && missionTracker) {
        drawMissionHUD(ctx, missionTracker, W, H)
      }

      // Center messages
      if (state === 'paused') center(ctx, W, H, '⏸ Paused', '#0f172a', 'Two-finger tap to resume')
      else if (state === 'ready') center(ctx, W, H, 'Tap to Start', '#0f172a', 'One button: tap/click/space')
      else if (state === 'gameover') {
        centerGameOver(ctx, W, H, localScore, maxCombo, nearMissCount, levelIndex + 1, sessionCoins, gameOverData)
      }

      // Banner
      if (banner && performance.now() < banner.until) {
        const progress = 1 - (banner.until - performance.now()) / 2500
        const alpha = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 1
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 20px system-ui'
        const m = ctx.measureText(banner.text)
        ctx.fillText(banner.text, (W - m.width) / 2, 36)
        if (banner.subtext) {
          ctx.font = '12px system-ui'
          const m2 = ctx.measureText(banner.subtext)
          ctx.fillText(banner.subtext, (W - m2.width) / 2, 54)
        }
        ctx.globalAlpha = 1
      }

      requestAnimationFrame(frame)
    }
    
    requestAnimationFrame(frame)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', cssFit)
      window.visualViewport?.removeEventListener('resize', cssFit)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('obc-toggle-pause', togglePause)
      canvas.removeEventListener('mousedown', press)
      canvas.removeEventListener('touchstart', press)
    }
  }, [daily, playerId, selectedModeName, checkAchievements])

  const dismissTutorial = () => {
    setShowTutorial(false)
    try { localStorage.setItem('obc_tutorial_seen', '1') } catch {}
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <div ref={shellRef} className="gameShell card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px 2px', width: '100%' }}>
          <span className="pill">{modeName}</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {stats.combo >= 3 && <span className="pill combo-pill">{stats.combo}x</span>}
            <span className="pill" style={{ background: '#FFD700', color: '#000' }}>
              🪙 {progressionManagerRef.current?.coins || 0}
            </span>
            <button className="btn secondary" onClick={() => window.dispatchEvent(new CustomEvent('obc-toggle-pause'))} style={{ padding: '6px 10px' }}>
              {state === 'paused' ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} />
        
        {/* Tutorial overlay */}
        {showTutorial && state === 'ready' && (
          <div className="tutorial-overlay" onClick={dismissTutorial}>
            <div className="tutorial-card" onClick={e => e.stopPropagation()}>
              <h3>🎮 How to Play</h3>
              <div className="tutorial-item">
                <span className="tutorial-icon">👆</span>
                <p><strong>Tap/Click/Space</strong> — Freezes obstacles & gives impulse</p>
              </div>
              <div className="tutorial-item">
                <span className="tutorial-icon">🔄</span>
                <p><strong>Gravity flips</strong> every few seconds — stay alert!</p>
              </div>
              <div className="tutorial-item">
                <span className="tutorial-icon">⚡</span>
                <p><strong>Build combos</strong> by passing obstacles quickly</p>
              </div>
              <div className="tutorial-item">
                <span className="tutorial-icon">🪙</span>
                <p><strong>Collect coins</strong> and powerups for bonuses!</p>
              </div>
              <div className="tutorial-item">
                <span className="tutorial-icon">🛡️</span>
                <p><strong>Powerups</strong> give shields, slow-mo, shrink & more!</p>
              </div>
              <button className="btn" onClick={dismissTutorial}>Got it!</button>
            </div>
          </div>
        )}
        
        {/* Achievement popup */}
        {newAchievement && (
          <div className="achievement-popup">
            <span className="achievement-icon">{newAchievement.icon}</span>
            <div>
              <div className="achievement-title">{newAchievement.name}</div>
              <div className="achievement-desc">{newAchievement.desc}</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="small" style={{ marginTop: 8, textAlign: 'center' }}>
        <div>One button: tap/click/space — freezes obstacles + impulse</div>
        <div style={{ marginTop: 4, color: '#64748b' }}>
          Level {progressionManagerRef.current?.level || 1} · {progressionManagerRef.current?.coins || 0} coins
        </div>
        {lastSubmitted && (
          <span style={{ marginLeft: 8 }}>
            Last score {lastSubmitted.score} {lastSubmitted.queued ? '(queued)' : '(sent)'}
          </span>
        )}
      </div>
    </div>
  )
}

// ========== DRAWING HELPERS ==========

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = clamp((num >> 16) + amount, 0, 255)
  const g = clamp(((num >> 8) & 0x00FF) + amount, 0, 255)
  const b = clamp((num & 0x0000FF) + amount, 0, 255)
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

function drawBackground(ctx, W, H, kind, now, d) {
  if (kind === 'sky') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#f9fbff')
    g.addColorStop(1, '#eef2ff')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let i = 0; i < 4; i++) {
      const x = ((now / 50 + i * 120) % (W + 200)) - 100
      const y = 50 + i * 150
      ctx.beginPath()
      ctx.ellipse(x, y, 80, 35, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (kind === 'cave') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#eef2ff')
    g.addColorStop(1, '#e5ebfb')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#d7def2'
    for (let x = 0; x < W; x += 20) {
      const h = 10 + Math.sin(x * 0.15 + now / 1000) * 6
      ctx.fillRect(x, 0, 20, h)
      ctx.fillRect(x, H - h, 20, h)
    }
  } else if (kind === 'tech') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#eef6ff')
    g.addColorStop(1, '#e8f0ff')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(0,70,130,0.06)'
    ctx.lineWidth = 1
    for (let x = 10; x < W; x += 25) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 20; y < H; y += 25) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    if (d > 0.8 && Math.random() < 0.02) {
      ctx.fillStyle = 'rgba(255,0,100,0.05)'
      ctx.fillRect(0, Math.random() * H, W, 5 + Math.random() * 20)
    }
  } else if (kind === 'space') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#0b1226')
    g.addColorStop(1, '#131a33')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    for (let i = 0; i < 70; i++) {
      const x = (i * 137.5) % W
      const y = (i * 97.3 + now / 100) % H
      const r = 0.5 + (i % 3) * 0.4
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (kind === 'fire') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#1a0505')
    g.addColorStop(0.5, '#2d0a0a')
    g.addColorStop(1, '#4a1515')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 20; i++) {
      const x = (i * 23 + now / 10) % W
      const baseY = H - 20 - Math.sin(now / 200 + i) * 30
      ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.3 + Math.random() * 0.2})`
      ctx.beginPath()
      ctx.arc(x, baseY, 3 + Math.random() * 5, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (kind === 'void') {
    ctx.fillStyle = '#050508'
    ctx.fillRect(0, 0, W, H)
    if (Math.random() < 0.01) {
      const pulse = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W)
      pulse.addColorStop(0, 'rgba(100, 50, 150, 0.1)')
      pulse.addColorStop(1, 'transparent')
      ctx.fillStyle = pulse
      ctx.fillRect(0, 0, W, H)
    }
  } else if (kind === 'storm') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#0f1e30')
    g.addColorStop(1, '#1a3050')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(150, 180, 255, 0.3)'
    ctx.lineWidth = 1
    for (let i = 0; i < 40; i++) {
      const x = (i * 13 + now / 5) % W
      const y = (i * 47 + now / 2) % H
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 3, y + 15)
      ctx.stroke()
    }
    if (Math.random() < 0.003) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(0, 0, W, H)
    }
  } else if (kind === 'crystal') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#1a1030')
    g.addColorStop(1, '#2d1b4e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(200, 150, 255, 0.1)'
    ctx.lineWidth = 2
    for (let i = 0; i < 8; i++) {
      const x = (i * 50) % W
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + 30, H)
      ctx.stroke()
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#f7faff')
    g.addColorStop(1, '#eaf1ff')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
}

function drawLandmark(ctx, shape, x, y, w, h, color, colorDark, colorLight, position) {
  if (h <= 0) return
  
  ctx.save()
  
  switch(shape) {
    case 'pyramid':
      drawPyramid(ctx, x, y, w, h, color, colorDark, position)
      break
    case 'mountain':
      drawMountain(ctx, x, y, w, h, color, colorDark, position)
      break
    case 'castle':
      drawCastle(ctx, x, y, w, h, color, colorDark, colorLight, position)
      break
    case 'skyscraper':
      drawSkyscraper(ctx, x, y, w, h, color, colorDark, colorLight, position)
      break
    case 'tree':
      drawTree(ctx, x, y, w, h, color, colorDark, position)
      break
    case 'eiffel':
      drawEiffel(ctx, x, y, w, h, color, colorDark, position)
      break
    case 'colosseum':
      drawColosseum(ctx, x, y, w, h, color, colorDark, position)
      break
    case 'pagoda':
      drawPagoda(ctx, x, y, w, h, color, colorDark, colorLight, position)
      break
    case 'spire':
      drawSpire(ctx, x, y, w, h, color, colorDark, position)
      break
    default:
      const grad = ctx.createLinearGradient(x, y, x + w, y)
      grad.addColorStop(0, color)
      grad.addColorStop(1, colorDark)
      ctx.fillStyle = grad
      ctx.fillRect(x, y, w, h)
  }
  
  ctx.restore()
}

function drawPyramid(ctx, x, y, w, h, color, colorDark, pos) {
  const cx = x + w / 2
  ctx.fillStyle = color
  ctx.beginPath()
  if (pos === 'top') {
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(cx, y + h)
    ctx.closePath()
  } else {
    ctx.moveTo(cx, y)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.closePath()
  }
  ctx.fill()
  ctx.fillStyle = colorDark
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  if (pos === 'top') {
    ctx.moveTo(cx, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(cx, y + h)
    ctx.closePath()
  } else {
    ctx.moveTo(cx, y)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(cx, y + h * 0.7)
    ctx.closePath()
  }
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawMountain(ctx, x, y, w, h, color, colorDark, pos) {
  ctx.fillStyle = color
  ctx.beginPath()
  if (pos === 'top') {
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w * 0.7, y + h)
    ctx.lineTo(x + w * 0.5, y + h * 0.6)
    ctx.lineTo(x + w * 0.3, y + h)
    ctx.closePath()
  } else {
    ctx.moveTo(x + w * 0.3, y)
    ctx.lineTo(x + w * 0.5, y + h * 0.4)
    ctx.lineTo(x + w * 0.7, y)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.closePath()
  }
  ctx.fill()
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  if (pos === 'bottom' && h > 60) {
    ctx.moveTo(x + w * 0.4, y + h * 0.15)
    ctx.lineTo(x + w * 0.5, y)
    ctx.lineTo(x + w * 0.6, y + h * 0.15)
    ctx.closePath()
    ctx.fill()
  }
}

function drawCastle(ctx, x, y, w, h, color, colorDark, colorLight, pos) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
  const bw = w / 5
  const bh = Math.min(15, h * 0.15)
  ctx.fillStyle = colorDark
  if (pos === 'top') {
    for (let i = 0; i < 5; i += 2) {
      ctx.fillRect(x + i * bw, y + h - bh, bw, bh)
    }
  } else {
    for (let i = 0; i < 5; i += 2) {
      ctx.fillRect(x + i * bw, y, bw, bh)
    }
  }
  if (h > 40) {
    ctx.fillStyle = '#1e293b'
    const winY = pos === 'top' ? y + h * 0.3 : y + h * 0.5
    ctx.fillRect(x + w * 0.35, winY, w * 0.3, h * 0.2)
  }
}

function drawSkyscraper(ctx, x, y, w, h, color, colorDark, colorLight, pos) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#60a5fa'
  const winW = w * 0.2
  const winH = 8
  const cols = 2
  const startY = pos === 'top' ? y + 10 : y + 5
  const endY = pos === 'top' ? y + h - 5 : y + h - 10
  for (let wy = startY; wy < endY; wy += 15) {
    for (let c = 0; c < cols; c++) {
      const wx = x + w * 0.2 + c * w * 0.4
      ctx.fillRect(wx, wy, winW, winH)
    }
  }
  if (pos === 'bottom' && h > 50) {
    ctx.fillStyle = colorDark
    ctx.fillRect(x + w * 0.45, y - 15, w * 0.1, 15)
  }
}

function drawTree(ctx, x, y, w, h, color, colorDark, pos) {
  const cx = x + w / 2
  ctx.fillStyle = '#78350f'
  const trunkW = w * 0.3
  if (pos === 'bottom') {
    ctx.fillRect(cx - trunkW/2, y, trunkW, h * 0.3)
  } else {
    ctx.fillRect(cx - trunkW/2, y + h * 0.7, trunkW, h * 0.3)
  }
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  if (pos === 'bottom') {
    ctx.moveTo(cx, y)
    ctx.lineTo(x + w, y + h * 0.7)
    ctx.lineTo(x, y + h * 0.7)
    ctx.closePath()
  } else {
    ctx.moveTo(x, y + h * 0.3)
    ctx.lineTo(x + w, y + h * 0.3)
    ctx.lineTo(cx, y + h)
    ctx.closePath()
  }
  ctx.fill()
}

function drawEiffel(ctx, x, y, w, h, color, colorDark, pos) {
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  const cx = x + w / 2
  if (pos === 'bottom') {
    ctx.beginPath()
    ctx.moveTo(x, y + h)
    ctx.lineTo(cx - 3, y + h * 0.3)
    ctx.lineTo(cx + 3, y + h * 0.3)
    ctx.lineTo(x + w, y + h)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(cx - 4, y, 8, h * 0.3)
    ctx.strokeStyle = colorDark
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + w * 0.2, y + h * 0.5)
    ctx.lineTo(x + w * 0.8, y + h * 0.5)
    ctx.moveTo(x + w * 0.3, y + h * 0.7)
    ctx.lineTo(x + w * 0.7, y + h * 0.7)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(cx - 3, y + h * 0.7)
    ctx.lineTo(cx + 3, y + h * 0.7)
    ctx.lineTo(x + w, y)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(cx - 4, y + h * 0.7, 8, h * 0.3)
  }
}

function drawColosseum(ctx, x, y, w, h, color, colorDark, pos) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#1e293b'
  const archW = w * 0.35
  if (pos === 'top' && h > 30) {
    ctx.beginPath()
    ctx.arc(x + w/2, y + h, archW/2, Math.PI, 0, false)
    ctx.fill()
  } else if (pos === 'bottom' && h > 30) {
    ctx.beginPath()
    ctx.arc(x + w/2, y, archW/2, 0, Math.PI, false)
    ctx.fill()
  }
  ctx.fillStyle = colorDark
  ctx.fillRect(x + 2, y, 4, h)
  ctx.fillRect(x + w - 6, y, 4, h)
}

function drawPagoda(ctx, x, y, w, h, color, colorDark, colorLight, pos) {
  const tiers = Math.min(4, Math.floor(h / 25))
  const tierH = h / Math.max(1, tiers)
  for (let i = 0; i < tiers; i++) {
    const ty = pos === 'top' ? y + i * tierH : y + (tiers - 1 - i) * tierH
    const shrink = i * w * 0.08
    const tw = w - shrink * 2
    const tx = x + shrink
    ctx.fillStyle = colorDark
    ctx.beginPath()
    if (pos === 'bottom') {
      ctx.moveTo(tx - 5, ty)
      ctx.lineTo(tx + tw/2, ty + tierH * 0.3)
      ctx.lineTo(tx + tw + 5, ty)
      ctx.lineTo(tx + tw, ty + tierH * 0.4)
      ctx.lineTo(tx, ty + tierH * 0.4)
      ctx.closePath()
    } else {
      ctx.moveTo(tx - 5, ty + tierH)
      ctx.lineTo(tx + tw/2, ty + tierH * 0.7)
      ctx.lineTo(tx + tw + 5, ty + tierH)
      ctx.lineTo(tx + tw, ty + tierH * 0.6)
      ctx.lineTo(tx, ty + tierH * 0.6)
      ctx.closePath()
    }
    ctx.fill()
    ctx.fillStyle = color
    if (pos === 'bottom') {
      ctx.fillRect(tx, ty + tierH * 0.4, tw, tierH * 0.6)
    } else {
      ctx.fillRect(tx, ty, tw, tierH * 0.6)
    }
  }
}

function drawSpire(ctx, x, y, w, h, color, colorDark, pos) {
  const cx = x + w/2
  ctx.fillStyle = color
  ctx.beginPath()
  if (pos === 'bottom') {
    ctx.moveTo(cx, y)
    ctx.lineTo(x + w * 0.7, y + h * 0.4)
    ctx.lineTo(x + w * 0.7, y + h)
    ctx.lineTo(x + w * 0.3, y + h)
    ctx.lineTo(x + w * 0.3, y + h * 0.4)
    ctx.closePath()
  } else {
    ctx.moveTo(x + w * 0.3, y)
    ctx.lineTo(x + w * 0.7, y)
    ctx.lineTo(x + w * 0.7, y + h * 0.6)
    ctx.lineTo(cx, y + h)
    ctx.lineTo(x + w * 0.3, y + h * 0.6)
    ctx.closePath()
  }
  ctx.fill()
  if (pos === 'bottom' && h > 40) {
    ctx.strokeStyle = colorDark
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, y - 10)
    ctx.lineTo(cx, y + 5)
    ctx.moveTo(cx - 6, y - 5)
    ctx.lineTo(cx + 6, y - 5)
    ctx.stroke()
  }
}

function center(ctx, W, H, text, color, subtext) {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = 'bold 20px system-ui'
  const m = ctx.measureText(text)
  ctx.fillText(text, (W - m.width) / 2, H * 0.45)
  if (subtext) {
    ctx.font = '13px system-ui'
    ctx.fillStyle = '#64748b'
    const m2 = ctx.measureText(subtext)
    ctx.fillText(subtext, (W - m2.width) / 2, H * 0.45 + 24)
  }
  ctx.restore()
}

function centerGameOver(ctx, W, H, score, maxCombo, nearMisses, level, coins, gameOverData) {
  ctx.save()
  
  // Semi-transparent backdrop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.fillRect(W * 0.08, H * 0.28, W * 0.84, H * 0.42)
  
  ctx.fillStyle = '#dc2626'
  ctx.font = 'bold 24px system-ui'
  const title = 'Game Over'
  const tm = ctx.measureText(title)
  ctx.fillText(title, (W - tm.width) / 2, H * 0.36)
  
  // Score
  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 36px system-ui'
  const scoreText = String(score)
  const stm = ctx.measureText(scoreText)
  ctx.fillText(scoreText, (W - stm.width) / 2, H * 0.44)
  
  // Stats row
  ctx.fillStyle = '#0f172a'
  ctx.font = '12px system-ui'
  const stats = `Level ${level}  ·  ${maxCombo}x combo  ·  ${nearMisses} close calls`
  const sm = ctx.measureText(stats)
  ctx.fillText(stats, (W - sm.width) / 2, H * 0.50)
  
  // Coins earned
  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 14px system-ui'
  const coinText = `🪙 +${coins} coins`
  const cm = ctx.measureText(coinText)
  ctx.fillText(coinText, (W - cm.width) / 2, H * 0.55)
  
  // XP earned
  if (gameOverData?.xpGained) {
    ctx.fillStyle = '#4CAF50'
    ctx.font = '12px system-ui'
    const xpText = `⭐ +${gameOverData.xpGained} XP`
    const xm = ctx.measureText(xpText)
    ctx.fillText(xpText, (W - xm.width) / 2, H * 0.59)
  }
  
  // Level up notification
  if (gameOverData?.leveledUp) {
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 14px system-ui'
    const lvlText = `🎉 LEVEL UP! Now Level ${gameOverData.newLevel}`
    const lm = ctx.measureText(lvlText)
    ctx.fillText(lvlText, (W - lm.width) / 2, H * 0.63)
  }
  
  // Completed missions
  if (gameOverData?.completedMissions?.length > 0) {
    ctx.fillStyle = '#22c55e'
    ctx.font = '11px system-ui'
    const missionText = `🎯 ${gameOverData.completedMissions.length} mission${gameOverData.completedMissions.length > 1 ? 's' : ''} complete!`
    const mm = ctx.measureText(missionText)
    ctx.fillText(missionText, (W - mm.width) / 2, H * 0.67)
  }
  
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  const tap = 'Tap to restart'
  const tapm = ctx.measureText(tap)
  ctx.fillText(tap, (W - tapm.width) / 2, H * 0.72)
  
  ctx.restore()
}