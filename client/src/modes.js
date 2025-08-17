// client/src/modes.js
export const MODE_PRESETS = {
  Classic: {
    label: 'Classic',
    theme: 'Classic',
    // No gravity flipping — chill starter
    flip: 'none',
    flipMul: 2.0,       // effectively disables flips
    speedMul: 1.0,
    freezeMul: 1.0,
    bg: 'sky',
  },

  'Odd Gravity': {
    label: 'Odd Gravity',
    theme: 'Odd Gravity',
    flip: 'flip',
    flipMul: 1.0,
    speedMul: 1.0,
    freezeMul: 1.0,
    bg: 'sky',
  },

  Inverted: {
    label: 'Inverted',
    theme: 'Inverted',
    flip: 'flip',
    startGravity: -1,
    speedMul: 1.0,
    freezeMul: 1.0,
    bg: 'space',
  },

  Flux: {
    label: 'Flux',
    theme: 'Flux',
    flip: 'flip',
    // Adds a sine-wave micro-acceleration to gravity
    sineAmp: 0.28,        // 0..1 (fraction of G)
    sinePeriodMs: 1200,   // wave period
    flipMul: 0.95,
    speedMul: 1.02,
    bg: 'tech',
  },

  Pulse: {
    label: 'Pulse',
    theme: 'Pulse',
    flip: 'flip',
    flipMul: 0.85,     // flips a bit faster
    freezeMul: 1.15,   // longer freezes
    speedMul: 1.0,
    bg: 'cave',
  },

  Chaotic: {
    label: 'Chaotic',
    theme: 'Chaotic',
    flip: 'flip',
    chaos: true,         // occasional surprise flips
    chaosMinMs: 450,
    speedMul: 1.05,
    flipMul: 0.9,
    bg: 'cave',
  },

  Bouncy: {
    label: 'Bouncy',
    theme: 'Classic',
    flip: 'flip',
    bouncy: true,        // bounce off top/bottom instead of instant death
    speedMul: 1.0,
    freezeMul: 1.0,
    bg: 'sky',
  },
}

export function applyMode(base, preset) {
  // base: { modeName, flipMs, speed, freezeMs, themeKey }
  const p = preset || {}
  return {
    modeName: p.label || base.modeName,
    themeKey: p.theme || base.themeKey || base.modeName,
    flip: p.flip || 'flip',
    flipMs: (base.flipMs || 3000) * (p.flipMul || 1),
    speed: (base.speed || 3) * (p.speedMul || 1),
    freezeMs: (base.freezeMs || 550) * (p.freezeMul || 1),
    startGravity: p.startGravity ?? +1,
    behaviors: {
      chaos: !!p.chaos,
      chaosMinMs: p.chaosMinMs || 400,
      sineAmp: p.sineAmp || 0,
      sinePeriodMs: p.sinePeriodMs || 1200,
      bouncy: !!p.bouncy,
    },
    bg: p.bg || null,
  }
}
