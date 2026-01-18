// Game Mode Presets
// Each mode now has DRAMATIC differences you can actually feel!

export const MODE_PRESETS = {
  "Classic": {
    name: "Classic",
    desc: "The original experience. Balanced and clean.",
    themeKey: "Classic",
    bg: "sky",
    startGravity: 1,
    flip: "scheduled",
    speedMul: 1.0,
    freezeMul: 1.0,
    flipMsMul: 1.0,
    behaviors: {
      sineAmp: 0,
      sinePeriodMs: 1200,
      bouncy: false,
      chaos: false,
      chaosMinMs: 600,
      chaosChance: 0
    }
  },

  "Odd Gravity": {
    name: "Odd Gravity",
    desc: "Faster flips keep you on your toes!",
    themeKey: "Odd Gravity",
    bg: "sky",
    startGravity: 1,
    flip: "scheduled",
    speedMul: 1.0,
    freezeMul: 1.0,
    flipMsMul: 0.7,  // 30% faster gravity flips!
    behaviors: {
      sineAmp: 0,
      sinePeriodMs: 1200,
      bouncy: false,
      chaos: false,
      chaosMinMs: 600,
      chaosChance: 0
    }
  },

  "Inverted": {
    name: "Inverted",
    desc: "Gravity is REVERSED! You fall UP!",
    themeKey: "Inverted",
    bg: "space",
    startGravity: -1,  // YOU FALL UPWARD!
    flip: "scheduled",
    speedMul: 1.05,
    freezeMul: 1.0,
    flipMsMul: 1.0,
    behaviors: {
      sineAmp: 0,
      sinePeriodMs: 1200,
      bouncy: false,
      chaos: false,
      chaosMinMs: 600,
      chaosChance: 0
    }
  },

  "Flux": {
    name: "Flux",
    desc: "WOBBLY! The ball waves up and down constantly.",
    themeKey: "Flux",
    bg: "tech",
    startGravity: 1,
    flip: "scheduled",
    speedMul: 0.8,      // Slower to compensate for wobble
    freezeMul: 1.2,     // Longer freeze to help
    flipMsMul: 1.2,
    behaviors: {
      sineAmp: 0.7,     // STRONG wobble!
      sinePeriodMs: 900, // Fast wobble cycle
      bouncy: false,
      chaos: false,
      chaosMinMs: 600,
      chaosChance: 0
    }
  },

  "Pulse": {
    name: "Pulse",
    desc: "FAST! 35% faster, 50% shorter freeze. Intense!",
    themeKey: "Pulse",
    bg: "sky",
    startGravity: 1,
    flip: "scheduled",
    speedMul: 1.35,     // 35% faster!
    freezeMul: 0.5,     // 50% shorter freeze!
    flipMsMul: 0.75,    // Faster flips too
    behaviors: {
      sineAmp: 0,
      sinePeriodMs: 1200,
      bouncy: false,
      chaos: false,
      chaosMinMs: 600,
      chaosChance: 0
    }
  },

  "Chaotic": {
    name: "Chaotic",
    desc: "RANDOM FLIPS! Gravity changes WITHOUT WARNING!",
    themeKey: "Chaotic",
    bg: "cave",
    startGravity: 1,
    flip: "scheduled",
    speedMul: 0.95,
    freezeMul: 1.1,
    flipMsMul: 2.0,     // Scheduled flips are SLOW (6 seconds)...
    behaviors: {
      sineAmp: 0,
      sinePeriodMs: 1200,
      bouncy: false,
      chaos: true,       // BUT random flips happen constantly!
      chaosMinMs: 400,   // Can flip again after 400ms
      chaosChance: 0.02  // 2% chance per frame = VERY frequent!
    }
  },

  "Bouncy": {
    name: "Bouncy",
    desc: "BOUNCE off walls! Can't die from top/bottom!",
    themeKey: "Bouncy",
    bg: "crystal",
    startGravity: 1,
    flip: "scheduled",
    speedMul: 1.25,     // Faster since you can't wall-die
    freezeMul: 0.75,
    flipMsMul: 0.85,
    behaviors: {
      sineAmp: 0,
      sinePeriodMs: 1200,
      bouncy: true,      // BOUNCE OFF WALLS!
      chaos: false,
      chaosMinMs: 600,
      chaosChance: 0
    }
  }
}

/**
 * Apply a mode preset to the daily config
 */
export function applyMode(daily, preset) {
  const defaultPreset = MODE_PRESETS["Classic"]
  const p = preset || defaultPreset

  const baseSpeed = daily?.obstacleSpeed ?? 3
  const baseFlipMs = daily?.gravityFlipEveryMs ?? 3000
  const baseFreezeMs = daily?.freezeDurationMs ?? 280

  const result = {
    modeName: p.name || daily?.modeName || 'Classic',
    themeKey: p.themeKey || 'Classic',
    bg: p.bg || 'sky',
    startGravity: p.startGravity ?? 1,
    flip: p.flip || 'scheduled',
    speed: baseSpeed * (p.speedMul ?? 1),
    freezeMs: baseFreezeMs * (p.freezeMul ?? 1),
    flipMs: baseFlipMs * (p.flipMsMul ?? 1),
    behaviors: {
      sineAmp: p.behaviors?.sineAmp ?? 0,
      sinePeriodMs: p.behaviors?.sinePeriodMs ?? 1200,
      bouncy: p.behaviors?.bouncy ?? false,
      chaos: p.behaviors?.chaos ?? false,
      chaosMinMs: p.behaviors?.chaosMinMs ?? 600,
      chaosChance: p.behaviors?.chaosChance ?? 0.008
    }
  }

  if (typeof window !== 'undefined') {
    console.log('🎮 [Mode Applied]', result.modeName, {
      speed: result.speed.toFixed(2),
      freezeMs: Math.round(result.freezeMs),
      flipMs: Math.round(result.flipMs),
      startGravity: result.startGravity,
      behaviors: result.behaviors
    })
  }
  
  return result
}

export function getModeDescription(modeName) {
  return MODE_PRESETS[modeName]?.desc || 'Unknown mode'
}

export function getModeNames() {
  return Object.keys(MODE_PRESETS)
}