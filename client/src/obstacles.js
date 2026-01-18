// obstacles.js - Dynamic obstacle/creature system
// Different hazards unlock as player progresses through levels

export const OBSTACLE_TYPES = {
  // Basic bars (always available)
  bar: {
    name: 'Bar',
    unlockLevel: 1,
    weight: 100,  // Spawn probability weight
    hasGap: true, // Traditional gap-based obstacle
    draw: drawBar,
  },
  
  // Level 1: Floating bubbles - available from start!
  bubble: {
    name: 'Bubble',
    unlockLevel: 1,
    weight: 40,
    hasGap: false,
    radius: 25,
    floatSpeed: -40, // Floats upward
    wobbleAmp: 15,
    draw: drawBubble,
  },
  
  // Level 1: Swimming fish - available from start!
  fish: {
    name: 'Fish',
    unlockLevel: 1,
    weight: 40,
    hasGap: false,
    width: 50,
    height: 25,
    swimAmp: 30,
    swimFreq: 2,
    draw: drawFish,
  },
  
  // Level 2+: Flying pterodactyls
  pterodactyl: {
    name: 'Pterodactyl',
    unlockLevel: 2,
    weight: 35,
    hasGap: false,
    wingspan: 70,
    flapSpeed: 8,
    diveChance: 0.3,
    draw: drawPterodactyl,
  },
  
  // Level 3+: Sharks (larger, faster)
  shark: {
    name: 'Shark',
    unlockLevel: 3,
    weight: 30,
    hasGap: false,
    length: 80,
    height: 35,
    lungeSpeed: 1.5,
    draw: drawShark,
  },
  
  // Level 4+: Fire-breathing dragons
  dragon: {
    name: 'Dragon',
    unlockLevel: 4,
    weight: 25,
    hasGap: false,
    size: 60,
    fireLength: 100,
    breathingCycle: 3000,
    draw: drawDragon,
  },
  
  // Level 5+: Spinning asteroids
  asteroid: {
    name: 'Asteroid',
    unlockLevel: 5,
    weight: 30,
    hasGap: false,
    radius: 30,
    rotateSpeed: 2,
    draw: drawAsteroid,
  },
  
  // Level 6+: Ghosts (fade in/out)
  ghost: {
    name: 'Ghost',
    unlockLevel: 6,
    weight: 25,
    hasGap: false,
    size: 45,
    fadeSpeed: 1.5,
    draw: drawGhost,
  },
  
  // Level 7+: Lightning bolts
  lightning: {
    name: 'Lightning',
    unlockLevel: 7,
    weight: 20,
    hasGap: false,
    width: 30,
    strikeInterval: 2000,
    draw: drawLightning,
  },
  
  // Level 8+: UFOs
  ufo: {
    name: 'UFO',
    unlockLevel: 8,
    weight: 20,
    hasGap: false,
    width: 55,
    height: 25,
    beamChance: 0.4,
    draw: drawUFO,
  },
}

/**
 * Get available obstacle types for current level
 */
export function getAvailableTypes(level) {
  return Object.entries(OBSTACLE_TYPES)
    .filter(([_, config]) => level >= config.unlockLevel)
    .map(([type, config]) => ({ type, ...config }))
}

/**
 * Pick a random obstacle type based on weights
 */
export function pickObstacleType(level, forceBar = false) {
  if (forceBar) return 'bar'
  
  const available = getAvailableTypes(level)
  // Filter out 'bar' from creature selection (we spawn bars separately)
  const creatures = available.filter(t => t.type !== 'bar')
  
  if (creatures.length === 0) return 'bar'
  
  const totalWeight = creatures.reduce((sum, t) => sum + t.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const t of creatures) {
    random -= t.weight
    if (random <= 0) return t.type
  }
  
  return creatures[0].type // Return first creature type
}

/**
 * Create an obstacle instance
 */
export function createObstacle(type, x, y, level, H) {
  const config = OBSTACLE_TYPES[type]
  const now = performance.now()
  
  const base = {
    type,
    x,
    y: y ?? Math.random() * (H - 100) + 50,
    createdAt: now,
    passed: false,
    phase: Math.random() * Math.PI * 2,
  }
  
  // Type-specific properties
  switch (type) {
    case 'bar':
      return {
        ...base,
        gapY: y,
        gapH: 0, // Set by caller
        width: 40,
        moving: false,
      }
      
    case 'bubble':
      return {
        ...base,
        radius: config.radius + Math.random() * 10,
        floatSpeed: config.floatSpeed * (0.8 + Math.random() * 0.4),
        wobbleAmp: config.wobbleAmp,
        originalX: x,
        alpha: 0.7 + Math.random() * 0.3,
      }
      
    case 'fish':
      return {
        ...base,
        width: config.width * (0.8 + Math.random() * 0.4),
        height: config.height * (0.8 + Math.random() * 0.4),
        swimAmp: config.swimAmp,
        swimFreq: config.swimFreq * (0.8 + Math.random() * 0.4),
        direction: Math.random() > 0.5 ? 1 : -1,
        color: ['#3b82f6', '#06b6d4', '#f97316', '#eab308'][Math.floor(Math.random() * 4)],
      }
      
    case 'pterodactyl':
      return {
        ...base,
        wingspan: config.wingspan * (0.8 + Math.random() * 0.4),
        flapPhase: Math.random() * Math.PI * 2,
        flapSpeed: config.flapSpeed,
        diving: false,
        diveY: 0,
        originalY: base.y,
      }
      
    case 'shark':
      return {
        ...base,
        length: config.length,
        height: config.height,
        lunging: false,
        lungeTimer: 0,
        mouthOpen: 0,
      }
      
    case 'dragon':
      return {
        ...base,
        size: config.size,
        fireLength: config.fireLength,
        breathing: false,
        breathTimer: Math.random() * config.breathingCycle,
        wingPhase: 0,
        color: ['#dc2626', '#7c3aed', '#059669'][Math.floor(Math.random() * 3)],
      }
      
    case 'asteroid':
      return {
        ...base,
        radius: config.radius * (0.7 + Math.random() * 0.6),
        rotation: 0,
        rotateSpeed: config.rotateSpeed * (Math.random() > 0.5 ? 1 : -1),
        points: generateAsteroidPoints(6 + Math.floor(Math.random() * 4)),
      }
      
    case 'ghost':
      return {
        ...base,
        size: config.size * (0.8 + Math.random() * 0.4),
        alpha: 1,
        fadeDir: -1,
        fadeSpeed: config.fadeSpeed,
      }
      
    case 'lightning':
      return {
        ...base,
        width: config.width,
        height: H,
        striking: false,
        strikeTimer: Math.random() * config.strikeInterval,
        bolts: [],
      }
      
    case 'ufo':
      return {
        ...base,
        width: config.width,
        height: config.height,
        beamActive: false,
        beamTimer: 0,
        wobble: 0,
      }
      
    default:
      return base
  }
}

/**
 * Update obstacle state
 */
export function updateObstacle(obs, dt, now, H, playerY) {
  const config = OBSTACLE_TYPES[obs.type]
  
  switch (obs.type) {
    case 'bubble':
      obs.y += obs.floatSpeed * dt
      obs.x = obs.originalX + Math.sin(now / 500 + obs.phase) * obs.wobbleAmp
      // Reset if floated off screen
      if (obs.y < -obs.radius * 2) {
        obs.y = H + obs.radius
      }
      break
      
    case 'fish':
      obs.y += Math.sin(now / 1000 * obs.swimFreq + obs.phase) * obs.swimAmp * dt
      break
      
    case 'pterodactyl':
      obs.flapPhase += obs.flapSpeed * dt
      // Random diving behavior
      if (!obs.diving && Math.random() < 0.002) {
        obs.diving = true
        obs.diveY = playerY // Dive toward player
      }
      if (obs.diving) {
        const targetY = obs.diveY
        obs.y += (targetY - obs.y) * 2 * dt
        if (Math.abs(obs.y - targetY) < 20) {
          obs.diving = false
          // Return to original height
          setTimeout(() => {
            obs.y = obs.originalY
          }, 500)
        }
      }
      break
      
    case 'shark':
      obs.mouthOpen = Math.sin(now / 200) * 0.5 + 0.5
      // Lunge toward player occasionally
      if (!obs.lunging && Math.random() < 0.003) {
        obs.lunging = true
        obs.lungeTimer = 0.3
      }
      if (obs.lunging) {
        obs.lungeTimer -= dt
        obs.x -= 150 * dt // Burst forward
        if (obs.lungeTimer <= 0) obs.lunging = false
      }
      break
      
    case 'dragon':
      obs.wingPhase += 6 * dt
      obs.breathTimer -= dt * 1000
      if (obs.breathTimer <= 0) {
        obs.breathing = !obs.breathing
        obs.breathTimer = obs.breathing ? 1500 : 2000 + Math.random() * 1000
      }
      break
      
    case 'asteroid':
      obs.rotation += obs.rotateSpeed * dt
      break
      
    case 'ghost':
      obs.alpha += obs.fadeDir * obs.fadeSpeed * dt
      if (obs.alpha <= 0.2) obs.fadeDir = 1
      if (obs.alpha >= 1) obs.fadeDir = -1
      break
      
    case 'lightning':
      obs.strikeTimer -= dt * 1000
      if (obs.strikeTimer <= 0) {
        obs.striking = true
        obs.bolts = generateLightningBolts(obs.x, H)
        setTimeout(() => { obs.striking = false }, 200)
        obs.strikeTimer = 2000 + Math.random() * 1500
      }
      break
      
    case 'ufo':
      obs.wobble = Math.sin(now / 300) * 5
      obs.beamTimer -= dt * 1000
      if (obs.beamTimer <= 0) {
        obs.beamActive = !obs.beamActive
        obs.beamTimer = obs.beamActive ? 1000 : 2000 + Math.random() * 1000
      }
      break
  }
}

/**
 * Check collision between player and obstacle
 */
export function checkCollision(obs, playerX, playerY, playerR, fudge = 0) {
  switch (obs.type) {
    case 'bar':
      // Traditional gap collision
      const wx = (playerX + playerR > obs.x) && (playerX - playerR < obs.x + obs.width)
      if (wx) {
        const gt = obs.gapY - obs.gapH / 2 + fudge
        const gb = obs.gapY + obs.gapH / 2 - fudge
        return !((playerY - playerR >= gt) && (playerY + playerR <= gb))
      }
      return false
      
    case 'bubble':
      return circleCollision(playerX, playerY, playerR, obs.x, obs.y, obs.radius - fudge)
      
    case 'fish':
      return rectCollision(playerX, playerY, playerR, 
        obs.x - obs.width/2, obs.y - obs.height/2, obs.width, obs.height, fudge)
      
    case 'pterodactyl':
      return circleCollision(playerX, playerY, playerR, obs.x, obs.y, obs.wingspan / 3)
      
    case 'shark':
      return rectCollision(playerX, playerY, playerR,
        obs.x - obs.length/2, obs.y - obs.height/2, obs.length, obs.height, fudge)
      
    case 'dragon':
      // Body collision
      if (circleCollision(playerX, playerY, playerR, obs.x, obs.y, obs.size / 2)) {
        return true
      }
      // Fire breath collision
      if (obs.breathing) {
        const fireStartX = obs.x - obs.size / 2
        const fireEndX = fireStartX - obs.fireLength
        if (playerX > fireEndX && playerX < fireStartX && 
            Math.abs(playerY - obs.y) < 25) {
          return true
        }
      }
      return false
      
    case 'asteroid':
      return circleCollision(playerX, playerY, playerR, obs.x, obs.y, obs.radius - fudge)
      
    case 'ghost':
      // Only collide when visible (alpha > 0.5)
      if (obs.alpha > 0.5) {
        return circleCollision(playerX, playerY, playerR, obs.x, obs.y, obs.size / 2)
      }
      return false
      
    case 'lightning':
      if (obs.striking) {
        return Math.abs(playerX - obs.x) < obs.width / 2
      }
      return false
      
    case 'ufo':
      // UFO body
      if (rectCollision(playerX, playerY, playerR,
          obs.x - obs.width/2, obs.y - obs.height/2 + obs.wobble, obs.width, obs.height, fudge)) {
        return true
      }
      // Tractor beam
      if (obs.beamActive) {
        if (playerX > obs.x - 20 && playerX < obs.x + 20 && playerY > obs.y) {
          return true
        }
      }
      return false
      
    default:
      return false
  }
}

// Helper functions
function circleCollision(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2
  const dy = y1 - y2
  return (dx * dx + dy * dy) < (r1 + r2) * (r1 + r2)
}

function rectCollision(cx, cy, r, rx, ry, rw, rh, fudge = 0) {
  const closestX = Math.max(rx + fudge, Math.min(cx, rx + rw - fudge))
  const closestY = Math.max(ry + fudge, Math.min(cy, ry + rh - fudge))
  const dx = cx - closestX
  const dy = cy - closestY
  return (dx * dx + dy * dy) < (r * r)
}

function generateAsteroidPoints(numPoints) {
  const points = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    const radius = 0.7 + Math.random() * 0.3
    points.push({ angle, radius })
  }
  return points
}

function generateLightningBolts(x, H) {
  const bolts = []
  let y = 0
  while (y < H) {
    const nextY = y + 20 + Math.random() * 40
    const offsetX = (Math.random() - 0.5) * 30
    bolts.push({ x1: x + (bolts.length > 0 ? bolts[bolts.length-1].offsetX : 0), y1: y, x2: x + offsetX, y2: nextY, offsetX })
    y = nextY
  }
  return bolts
}

// ==================== DRAWING FUNCTIONS ====================

function drawBar(ctx, obs, theme) {
  ctx.fillStyle = theme.obstacle || '#334155'
  ctx.fillRect(obs.x, 0, obs.width, obs.gapY - obs.gapH / 2)
  ctx.fillRect(obs.x, obs.gapY + obs.gapH / 2, obs.width, ctx.canvas.height)
}

function drawBubble(ctx, obs, theme) {
  ctx.save()
  ctx.globalAlpha = obs.alpha * 0.6
  
  // Outer bubble
  const gradient = ctx.createRadialGradient(
    obs.x - obs.radius * 0.3, obs.y - obs.radius * 0.3, 0,
    obs.x, obs.y, obs.radius
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
  gradient.addColorStop(0.5, 'rgba(150, 220, 255, 0.4)')
  gradient.addColorStop(1, 'rgba(100, 180, 255, 0.2)')
  
  ctx.beginPath()
  ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()
  
  // Highlight
  ctx.beginPath()
  ctx.arc(obs.x - obs.radius * 0.3, obs.y - obs.radius * 0.3, obs.radius * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fill()
  
  ctx.restore()
}

function drawFish(ctx, obs, theme) {
  ctx.save()
  ctx.translate(obs.x, obs.y)
  if (obs.direction < 0) ctx.scale(-1, 1)
  
  const w = obs.width, h = obs.height
  
  // Body
  ctx.fillStyle = obs.color
  ctx.beginPath()
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Tail
  ctx.beginPath()
  ctx.moveTo(w / 2 - 5, 0)
  ctx.lineTo(w / 2 + 15, -h / 2)
  ctx.lineTo(w / 2 + 15, h / 2)
  ctx.closePath()
  ctx.fill()
  
  // Eye
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(-w / 4, -h / 6, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'black'
  ctx.beginPath()
  ctx.arc(-w / 4 - 1, -h / 6, 2, 0, Math.PI * 2)
  ctx.fill()
  
  // Fin
  ctx.fillStyle = obs.color
  ctx.globalAlpha = 0.7
  ctx.beginPath()
  ctx.moveTo(0, -h / 2)
  ctx.lineTo(-10, -h)
  ctx.lineTo(10, -h / 2)
  ctx.closePath()
  ctx.fill()
  
  ctx.restore()
}

function drawPterodactyl(ctx, obs, theme) {
  ctx.save()
  ctx.translate(obs.x, obs.y)
  
  const wingAngle = Math.sin(obs.flapPhase) * 0.5
  const ws = obs.wingspan / 2
  
  // Body
  ctx.fillStyle = '#65a30d'
  ctx.beginPath()
  ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Head
  ctx.beginPath()
  ctx.ellipse(-25, -5, 15, 10, -0.3, 0, Math.PI * 2)
  ctx.fill()
  
  // Beak
  ctx.fillStyle = '#ca8a04'
  ctx.beginPath()
  ctx.moveTo(-38, -5)
  ctx.lineTo(-55, 0)
  ctx.lineTo(-38, 5)
  ctx.closePath()
  ctx.fill()
  
  // Crest
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.moveTo(-20, -15)
  ctx.lineTo(-35, -25)
  ctx.lineTo(-25, -10)
  ctx.closePath()
  ctx.fill()
  
  // Wings
  ctx.fillStyle = '#84cc16'
  
  // Left wing
  ctx.save()
  ctx.rotate(wingAngle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(ws, -30)
  ctx.lineTo(ws + 10, 0)
  ctx.lineTo(ws - 10, 10)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  
  // Right wing
  ctx.save()
  ctx.rotate(-wingAngle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(ws, 30)
  ctx.lineTo(ws + 10, 0)
  ctx.lineTo(ws - 10, -10)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  
  // Eye
  ctx.fillStyle = 'yellow'
  ctx.beginPath()
  ctx.arc(-28, -8, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'black'
  ctx.beginPath()
  ctx.arc(-29, -8, 2, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
}

function drawShark(ctx, obs, theme) {
  ctx.save()
  ctx.translate(obs.x, obs.y)
  
  const l = obs.length, h = obs.height
  
  // Body
  const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2)
  gradient.addColorStop(0, '#475569')
  gradient.addColorStop(0.5, '#64748b')
  gradient.addColorStop(1, '#94a3b8')
  ctx.fillStyle = gradient
  
  ctx.beginPath()
  ctx.moveTo(-l/2, 0)
  ctx.quadraticCurveTo(-l/4, -h/2, l/4, -h/3)
  ctx.lineTo(l/2, 0)
  ctx.lineTo(l/4, h/3)
  ctx.quadraticCurveTo(-l/4, h/2, -l/2, 0)
  ctx.fill()
  
  // Dorsal fin
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.moveTo(-5, -h/3)
  ctx.lineTo(0, -h - 10)
  ctx.lineTo(15, -h/3)
  ctx.closePath()
  ctx.fill()
  
  // Tail fin
  ctx.beginPath()
  ctx.moveTo(l/2 - 10, 0)
  ctx.lineTo(l/2 + 20, -h/2)
  ctx.lineTo(l/2 + 5, 0)
  ctx.lineTo(l/2 + 15, h/3)
  ctx.closePath()
  ctx.fill()
  
  // Eye
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(-l/3, -5, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'black'
  ctx.beginPath()
  ctx.arc(-l/3 - 1, -5, 3, 0, Math.PI * 2)
  ctx.fill()
  
  // Mouth
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-l/2 + 5, 5)
  ctx.quadraticCurveTo(-l/3, 5 + obs.mouthOpen * 10, -l/4, 0)
  ctx.stroke()
  
  // Teeth
  if (obs.mouthOpen > 0.3) {
    ctx.fillStyle = 'white'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(-l/2 + 10 + i * 8, 5)
      ctx.lineTo(-l/2 + 14 + i * 8, 12)
      ctx.lineTo(-l/2 + 18 + i * 8, 5)
      ctx.fill()
    }
  }
  
  ctx.restore()
}

function drawDragon(ctx, obs, theme) {
  ctx.save()
  ctx.translate(obs.x, obs.y)
  
  const s = obs.size
  const wingAngle = Math.sin(obs.wingPhase) * 0.4
  
  // Fire breath
  if (obs.breathing) {
    const fireGrad = ctx.createLinearGradient(-s/2, 0, -s/2 - obs.fireLength, 0)
    fireGrad.addColorStop(0, 'rgba(255, 200, 0, 0.9)')
    fireGrad.addColorStop(0.3, 'rgba(255, 100, 0, 0.7)')
    fireGrad.addColorStop(1, 'rgba(255, 50, 0, 0)')
    
    ctx.fillStyle = fireGrad
    ctx.beginPath()
    ctx.moveTo(-s/2, -10)
    ctx.lineTo(-s/2 - obs.fireLength, -25)
    ctx.lineTo(-s/2 - obs.fireLength, 25)
    ctx.lineTo(-s/2, 10)
    ctx.closePath()
    ctx.fill()
  }
  
  // Wings
  ctx.fillStyle = obs.color + '99'
  ctx.save()
  ctx.rotate(wingAngle)
  ctx.beginPath()
  ctx.moveTo(0, -5)
  ctx.lineTo(s, -s)
  ctx.lineTo(s + 20, -s/2)
  ctx.lineTo(s - 10, 5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  
  ctx.save()
  ctx.rotate(-wingAngle)
  ctx.beginPath()
  ctx.moveTo(0, 5)
  ctx.lineTo(s, s)
  ctx.lineTo(s + 20, s/2)
  ctx.lineTo(s - 10, -5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  
  // Body
  ctx.fillStyle = obs.color
  ctx.beginPath()
  ctx.ellipse(0, 0, s/2, s/3, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Head
  ctx.beginPath()
  ctx.ellipse(-s/2 - 10, 0, s/4, s/5, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Horns
  ctx.fillStyle = '#78716c'
  ctx.beginPath()
  ctx.moveTo(-s/2 - 5, -s/5)
  ctx.lineTo(-s/2 - 15, -s/2)
  ctx.lineTo(-s/2, -s/5 + 5)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-s/2 - 15, -s/5)
  ctx.lineTo(-s/2 - 25, -s/2 - 10)
  ctx.lineTo(-s/2 - 10, -s/5 + 5)
  ctx.fill()
  
  // Eye
  ctx.fillStyle = 'yellow'
  ctx.beginPath()
  ctx.arc(-s/2 - 15, -3, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'black'
  ctx.beginPath()
  ctx.arc(-s/2 - 16, -3, 2, 0, Math.PI * 2)
  ctx.fill()
  
  // Tail
  ctx.strokeStyle = obs.color
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(s/2, 0)
  ctx.quadraticCurveTo(s, -20, s + 30, 10)
  ctx.stroke()
  
  // Tail spike
  ctx.fillStyle = obs.color
  ctx.beginPath()
  ctx.moveTo(s + 25, 10)
  ctx.lineTo(s + 45, 0)
  ctx.lineTo(s + 25, 20)
  ctx.fill()
  
  ctx.restore()
}

function drawAsteroid(ctx, obs, theme) {
  ctx.save()
  ctx.translate(obs.x, obs.y)
  ctx.rotate(obs.rotation)
  
  // Rocky body
  const gradient = ctx.createRadialGradient(
    -obs.radius * 0.3, -obs.radius * 0.3, 0,
    0, 0, obs.radius
  )
  gradient.addColorStop(0, '#78716c')
  gradient.addColorStop(0.5, '#57534e')
  gradient.addColorStop(1, '#44403c')
  
  ctx.fillStyle = gradient
  ctx.beginPath()
  
  const firstPoint = obs.points[0]
  ctx.moveTo(
    Math.cos(firstPoint.angle) * obs.radius * firstPoint.radius,
    Math.sin(firstPoint.angle) * obs.radius * firstPoint.radius
  )
  
  for (let i = 1; i <= obs.points.length; i++) {
    const p = obs.points[i % obs.points.length]
    ctx.lineTo(
      Math.cos(p.angle) * obs.radius * p.radius,
      Math.sin(p.angle) * obs.radius * p.radius
    )
  }
  
  ctx.closePath()
  ctx.fill()
  
  // Craters
  ctx.fillStyle = '#292524'
  for (let i = 0; i < 3; i++) {
    const cx = (Math.random() - 0.5) * obs.radius
    const cy = (Math.random() - 0.5) * obs.radius
    const cr = 3 + Math.random() * 5
    ctx.beginPath()
    ctx.arc(cx, cy, cr, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.restore()
}

function drawGhost(ctx, obs, theme) {
  ctx.save()
  ctx.translate(obs.x, obs.y)
  ctx.globalAlpha = obs.alpha
  
  const s = obs.size
  
  // Body glow
  ctx.shadowColor = 'rgba(200, 200, 255, 0.5)'
  ctx.shadowBlur = 20
  
  // Main body
  const gradient = ctx.createRadialGradient(0, -s/4, 0, 0, 0, s/2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(1, 'rgba(200, 200, 255, 0.3)')
  
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, -s/4, s/2.5, Math.PI, 0, false)
  ctx.lineTo(s/2.5, s/4)
  
  // Wavy bottom
  const waves = 4
  for (let i = 0; i <= waves; i++) {
    const x = s/2.5 - (i / waves) * s * 0.8
    const y = s/4 + (i % 2 === 0 ? 10 : 0)
    if (i === waves) {
      ctx.lineTo(-s/2.5, s/4)
    } else {
      ctx.lineTo(x, y)
    }
  }
  
  ctx.closePath()
  ctx.fill()
  
  // Eyes
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(50, 50, 80, 0.8)'
  ctx.beginPath()
  ctx.ellipse(-8, -s/4, 6, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(8, -s/4, 6, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Pupils
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(-6, -s/4 - 2, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(10, -s/4 - 2, 2, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
}

function drawLightning(ctx, obs, theme) {
  if (!obs.striking) {
    // Warning glow
    ctx.fillStyle = 'rgba(255, 255, 100, 0.1)'
    ctx.fillRect(obs.x - obs.width, 0, obs.width * 2, ctx.canvas.height / window.devicePixelRatio)
    return
  }
  
  ctx.save()
  
  // Flash
  ctx.fillStyle = 'rgba(255, 255, 200, 0.3)'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  // Bolts
  ctx.strokeStyle = '#fef08a'
  ctx.lineWidth = 4
  ctx.shadowColor = '#facc15'
  ctx.shadowBlur = 20
  
  ctx.beginPath()
  for (const bolt of obs.bolts) {
    ctx.moveTo(bolt.x1, bolt.y1)
    ctx.lineTo(bolt.x2, bolt.y2)
  }
  ctx.stroke()
  
  // Brighter center
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()
  
  ctx.restore()
}

function drawUFO(ctx, obs, theme) {
  ctx.save()
  ctx.translate(obs.x, obs.y + obs.wobble)
  
  const w = obs.width, h = obs.height
  
  // Tractor beam
  if (obs.beamActive) {
    const beamGrad = ctx.createLinearGradient(0, 0, 0, 200)
    beamGrad.addColorStop(0, 'rgba(100, 255, 100, 0.4)')
    beamGrad.addColorStop(1, 'rgba(100, 255, 100, 0)')
    
    ctx.fillStyle = beamGrad
    ctx.beginPath()
    ctx.moveTo(-15, h/2)
    ctx.lineTo(-40, 200)
    ctx.lineTo(40, 200)
    ctx.lineTo(15, h/2)
    ctx.closePath()
    ctx.fill()
  }
  
  // Main body
  const bodyGrad = ctx.createLinearGradient(0, -h, 0, h)
  bodyGrad.addColorStop(0, '#9ca3af')
  bodyGrad.addColorStop(0.5, '#6b7280')
  bodyGrad.addColorStop(1, '#4b5563')
  
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // Dome
  ctx.fillStyle = 'rgba(150, 220, 255, 0.7)'
  ctx.beginPath()
  ctx.ellipse(0, -h/3, w/4, h/2, 0, Math.PI, 0, false)
  ctx.fill()
  
  // Dome highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.beginPath()
  ctx.ellipse(-5, -h/2, 5, 8, -0.3, 0, Math.PI * 2)
  ctx.fill()
  
  // Lights
  const numLights = 5
  for (let i = 0; i < numLights; i++) {
    const angle = (i / numLights) * Math.PI + Math.PI
    const lx = Math.cos(angle) * w/2.5
    const ly = Math.sin(angle) * h/3
    
    const lightOn = (Date.now() / 200 + i) % numLights < 2
    ctx.fillStyle = lightOn ? '#22c55e' : '#166534'
    ctx.beginPath()
    ctx.arc(lx, ly, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.restore()
}

export {
  drawBar, drawBubble, drawFish, drawPterodactyl, drawShark,
  drawDragon, drawAsteroid, drawGhost, drawLightning, drawUFO
}