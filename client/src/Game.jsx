import React, { useEffect, useRef, useState } from 'react'
import { submitScoreWithQueue } from './api'
import { useSfx, vibrate, resumeAudio } from './useAudio'
import { MODE_PRESETS, applyMode } from './modes'

/** Per-mode colors */
const THEMES = {
  'Odd Gravity': { trail:'#38bdf8', ball:'#0ea5e9', obstacle:'#334155', flash:'rgba(20,184,166,0.12)' },
  'Flux':        { trail:'#d946ef', ball:'#a21caf', obstacle:'#475569', flash:'rgba(236,72,153,0.12)' },
  'Pulse':       { trail:'#22c55e', ball:'#16a34a', obstacle:'#334155', flash:'rgba(34,197,94,0.12)' },
  'Chaotic':     { trail:'#f59e0b', ball:'#d97706', obstacle:'#334155', flash:'rgba(245,158,11,0.12)' },
  'Inverted':    { trail:'#93c5fd', ball:'#60a5fa', obstacle:'#111827', flash:'rgba(96,165,250,0.12)' },
  'Classic':     { trail:'#38bdf8', ball:'#0ea5e9', obstacle:'#334155', flash:'rgba(20,184,166,0.12)' },
}
const themeFor = (name)=>THEMES[name] || THEMES.Classic

/** Worlds rotate each level */
const WORLDS = [
  { name:'Clouds',  bg:'sky',   obstacle:'#394454', colMul:0.90, gapBonus:+12 },
  { name:'Caverns', bg:'cave',  obstacle:'#2b313b', colMul:1.00, gapBonus:+4  },
  { name:'Circuit', bg:'tech',  obstacle:'#1f2937', colMul:1.05, gapBonus:-2  },
  { name:'Nebula',  bg:'space', obstacle:'#151a32', colMul:1.00, gapBonus:-8  },
]
const worldForLevel = (levelIndex)=>WORLDS[levelIndex % WORLDS.length]

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const lerp=(a,b,t)=>a+(b-a)*t
const easeOut=(t)=>1-Math.pow(1-t,2)

export default function Game({ daily, playerId }) {
  const shellRef = useRef(null)
  const canvasRef = useRef(null)
  const [state, setState] = useState('ready') // ready | playing | paused | gameover
  const [lastSubmitted, setLastSubmitted] = useState(null)
  const [banner, setBanner] = useState(null)

  const { beep, chord } = useSfx()

  // ----- Read daily (server) then apply user-selected mode preset -----
  const seed = daily?.seed ?? 'classic'
  const baseDaily = {
    modeName: daily?.modeName || 'Odd Gravity',
    flipMs:   daily?.gravityFlipEveryMs ?? 3000,
    speed:    daily?.obstacleSpeed ?? 3,
    freezeMs: daily?.freezeDurationMs ?? 550,
    themeKey: daily?.modeName || 'Odd Gravity',
  }
  const selectedModeName =
    (typeof window !== 'undefined' && (localStorage.getItem('obc_mode') || 'Odd Gravity')) || 'Odd Gravity'
  const active = applyMode(baseDaily, MODE_PRESETS[selectedModeName])

  // Expose frequently used values
  const modeName = active.modeName
  const baseFlipMs = active.flipMs
  const baseObstacleSpeed = active.speed
  const baseFreezeMs = active.freezeMs
  const BASE_THEME = themeFor(active.themeKey)

  useEffect(() => {
    const canvas = canvasRef.current
    const shell = shellRef.current
    if (!canvas || !shell) return

    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const W = 360, H = 640, ASPECT = H / W

    function cssFit() {
      const rect = shell.getBoundingClientRect()
      const vvH = window.visualViewport?.height || window.innerHeight
      const reservedBelow = 260
      const availableHeight = Math.max(320, vvH - rect.top - reservedBelow)
      const maxW = Math.min(560, document.documentElement.clientWidth * 0.96)
      const cssW = Math.max(300, Math.min(maxW, availableHeight / ASPECT))
      canvas.style.width = Math.round(cssW)+'px'
      canvas.style.height = Math.round(cssW*ASPECT)+'px'
    }
    cssFit()
    const ro = new ResizeObserver(cssFit)
    ro.observe(document.body)
    window.addEventListener('resize', cssFit)
    window.visualViewport?.addEventListener('resize', cssFit)

    canvas.width = W * DPR
    canvas.height = H * DPR
    const ctx = canvas.getContext('2d')
    ctx.setTransform(DPR,0,0,DPR,0,0)

    // ---------- GAME CONSTANTS ----------
    const LEVEL_SIZE = 12          // obstacles per level
    const LEVEL_STEP = 0.07        // +7% per completed level
    const WITHIN_LEVEL_SPAN = 0.15 // gentle ramp inside each level (max)
    const GRACE_SEC = 3            // ignore first 3s after starting for ramp

    // Start easier: big gaps that shrink over d ∈ [0,1]
    const GAP_START=280, GAP_END=120
    const SPEED_BASE = baseObstacleSpeed*60
    const PLAYER_X=96, R=12, G=520

    // background specks
    const dots = Array.from({length:40},()=>({x:Math.random()*W,y:Math.random()*H,s:0.3+Math.random()*1.2}))
    let particles=[], trail=[]
    function puff(x,y,color){ for(let i=0;i<10;i++){ const a=Math.random()*Math.PI*2,sp=40+Math.random()*120; particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.5,color,g:300}) } }
    function confetti(x=W/2,y=H*0.35){ const cols=['#f43f5e','#f59e0b','#22c55e','#06b6d4','#8b5cf6']; for(let i=0;i<90;i++){ const a=Math.random()*Math.PI*2,sp=80+Math.random()*200,c=cols[i%cols.length]; particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.9+Math.random()*0.7,color:c,g:200}) } }

    // obstacles & spacing helpers
    let obstacles=[], rightmostX=0

    // Extra breathing room at the start of each level
    const FIRST_EASY_WALLS  = 6   // first 6 walls: biggest spacing
    const SECOND_EASY_WALLS = 10  // next 4 walls: medium spacing

    function baseSpawn(d){        // shrinks as difficulty rises
      return lerp(240, 200, d)    // easy → hard
    }
    function spawnDist(d){
      const within = (localScore - levelStartScore)
      let early = 0
      if (within < FIRST_EASY_WALLS)       early = 90
      else if (within < SECOND_EASY_WALLS) early = 50
      return baseSpawn(d) + early
    }

    const randGapY=()=>{ const m=80; return m+Math.random()*(H-m*2) }

    function spawnInitial(){
      obstacles=[]; rightmostX=W+6
      const sp = spawnDist(0)
      for(let i=0;i<9;i++) obstacles.push({x:rightmostX+i*sp,gapY:randGapY(),passed:false})
      rightmostX+=(9-1)*sp
    }

    // run state
    let y=H*0.5, vy=0, gravityDir=active.startGravity, lastFlip=performance.now()
    let freezeUntil=0, localScore=0, gameState='ready', paused=false
    let runStart=performance.now()
    let levelIndex=0, levelStartScore=0

    function announceLevel(){
      const w = worldForLevel(levelIndex)
      setBanner({ text: `Level ${levelIndex+1}: ${w.name}  (+7% difficulty)`, until: performance.now()+2200 })
    }

    function reset(){
      localScore=0; levelIndex=0; levelStartScore=0
      y=H*0.5; vy=0; trail=[]; gravityDir=active.startGravity
      lastFlip=performance.now(); freezeUntil=0
      spawnInitial(); gameState='ready'; setState('ready')
      runStart=performance.now()
      announceLevel()
    }
    function start(){ if(gameState!=='ready')return; runStart=performance.now(); gameState='playing'; setState('playing') }
    function togglePause(){ if(gameState!=='playing' && !paused) return; paused=!paused; setState(paused?'paused':'playing') }
    function gameOver(){
      if(gameState==='gameover')return
      gameState='gameover'; setState('gameover'); vibrate?.([20,60,20]); chord([196,130],0.18)
      try{
        const dk=`obc_best_${seed}`, bestDaily=parseInt(localStorage.getItem(dk)||'0',10), bestAll=parseInt(localStorage.getItem('obc_best_all')||'0',10)
        let text=''
        if(localScore>bestAll){localStorage.setItem('obc_best_all',String(localScore)); text='New ALL-TIME Best!'; confetti()}
        if(localScore>bestDaily){localStorage.setItem(dk,String(localScore)); text = text || 'New Daily Best!'; confetti()}
        if(text) setBanner({text,until:performance.now()+3000})
      }catch{}
      if(playerId){ submitScoreWithQueue({playerId,score:localScore,modeName})
        .then(r=>setLastSubmitted({queued:!!r?.queued,score:localScore,at:Date.now()}))
        .catch(()=>setLastSubmitted({queued:true,score:localScore,at:Date.now()})) }
    }
    async function onPress(){
      await resumeAudio()
      if (paused) return
      if(gameState==='ready') return start()
      if(gameState==='gameover') return reset()
      const d = difficulty(performance.now())
      const freeze = baseFreezeMs*lerp(1.25,0.90,d)
      vy += -gravityDir*220
      freezeUntil=performance.now()+freeze
      puff(PLAYER_X,y, theme().trail)
      vibrate?.(10); beep(520,0.05,'sine',0.02)
    }

    // inputs
    const press=e=>{e?.preventDefault?.(); onPress()}
    canvas.addEventListener('mousedown',press)
    canvas.addEventListener('touchstart',(e)=>{ if(e.touches?.length>=2){e.preventDefault(); togglePause(); return} press(e) },{passive:false})
    const onKey=e=>{ if(e.code==='Space'||e.code==='Enter'||e.key===' '){e.preventDefault(); onPress()} if(e.code==='KeyP') togglePause() }
    window.addEventListener('keydown',onKey)
    window.addEventListener('obc-toggle-pause',togglePause)
    canvas.addEventListener('contextmenu',e=>e.preventDefault())

    reset()

    // difficulty: baseline +7% per completed level + gentle ramp within level
    function difficulty(now){
      const baseline = LEVEL_STEP * levelIndex
      const tSec = Math.max(0, (now - runStart)/1000 - GRACE_SEC)
      const progressWithinLevel = clamp((localScore - levelStartScore) / LEVEL_SIZE, 0, 1)
      const within = clamp(0.6*progressWithinLevel + 0.4*(tSec/45), 0, 1) // mix score & time
      const d = baseline + WITHIN_LEVEL_SPAN * easeOut(within)
      return clamp(d, 0, 1)
    }

    function theme(){
      const w = worldForLevel(levelIndex)
      return { ...BASE_THEME, obstacle: w.obstacle }
    }

    let last=performance.now()
    function frame(now){
      const dt=Math.min(0.033,(now-last)/1000); last=now
      const d = difficulty(now)
      const world = worldForLevel(levelIndex)
      const T = theme()

      const GAP_H = clamp(lerp(GAP_START + (world.gapBonus||0), GAP_END, d), 120, 340)
      const SPEED = SPEED_BASE * lerp(0.60, 1.12, d)
      const flipMs = Math.round(lerp(baseFlipMs*1.35, baseFlipMs*0.90, d))
      const fudge = lerp(22, 3, d) // kinder early, strict later

      // Thinner columns at start → grow with difficulty; world multiplier applies
      const THIN_START = 26
      const THICK_END  = 50
      const COL_W = clamp(lerp(THIN_START, THICK_END, d) * (world.colMul || 1), 22, 56)

      if(gameState==='playing' && !paused){
        // Mode-aware flips
        if (active.flip !== 'none') {
          if(now-lastFlip>=flipMs){ gravityDir*=-1; lastFlip=now; beep(360,0.06,'triangle',0.018) }
          // chaos flips
          if (active.behaviors.chaos) {
            if (now - lastFlip > (active.behaviors.chaosMinMs || 400) && Math.random() < 0.005) {
              gravityDir *= -1; lastFlip = now; beep(460,0.05,'square',0.02)
            }
          }
        }

        // gravity + optional sine wobble (Flux)
        vy += (G*gravityDir)*dt
        if (active.behaviors.sineAmp > 0) {
          const w = (2*Math.PI) / (active.behaviors.sinePeriodMs || 1200)
          vy += (G * active.behaviors.sineAmp) * Math.sin(now * w) * dt
        }
        y += vy*dt

        const frozen = now < freezeUntil
        if(!frozen) for(const o of obstacles) o.x -= SPEED*dt

        while(obstacles.length && obstacles[0].x+COL_W<0) obstacles.shift()
        if(obstacles.length) rightmostX=Math.max(rightmostX,obstacles[obstacles.length-1].x)
        while(obstacles.length<10){
          const nx=(obstacles.length?rightmostX:W)+spawnDist(d)
          obstacles.push({x:nx,gapY:randGapY(),passed:false})
          rightmostX=nx
        }

        for(const o of obstacles){
          if(!o.passed && (o.x+COL_W)<(PLAYER_X-R)){
            o.passed=true; localScore++; beep(700,0.05,'square',0.018)
            // Level progression: every LEVEL_SIZE obstacles
            if(localScore - levelStartScore >= LEVEL_SIZE){
              levelIndex += 1
              levelStartScore = localScore
              announceLevel()
              chord([330,220],0.2)
            }
          }
        }

        // bounds & collisions (bouncy option)
        const outTop = (y-R<0), outBottom = (y+R>H)
        if(outTop || outBottom){
          if (active.behaviors.bouncy) {
            if (outTop){ y=R+1; vy=Math.abs(vy)*0.6 }
            else { y=H-R-1; vy=-Math.abs(vy)*0.6 }
            vibrate?.(6)
          } else {
            gameOver()
          }
        } else {
          for(const o of obstacles){
            const wx=(PLAYER_X+R>o.x)&&(PLAYER_X-R<o.x+COL_W)
            if(wx){
              const gt=o.gapY-GAP_H/2 + fudge
              const gb=o.gapY+GAP_H/2 - fudge
              const inGap=(y-R>=gt)&&(y+R<=gb)
              if(!inGap){ gameOver(); break }
            }
          }
        }
      }

      // background: prefer mode bg, otherwise world bg
      drawBackground(ctx,W,H, active.bg || world.bg)

      // specks drift
      ctx.fillStyle='#dbeafe'
      for(const d0 of dots){ ctx.beginPath(); ctx.arc(d0.x,d0.y,d0.s,0,Math.PI*2); ctx.fill(); d0.x-=d0.s*4*dt; if(d0.x<-2){ d0.x=W+Math.random()*16; d0.y=Math.random()*H } }

      const frozenNow = performance.now()<freezeUntil
      ctx.fillStyle = frozenNow ? '#8ea3b8' : (T.obstacle||'#334155')
      for(const o of obstacles){
        ctx.fillRect(o.x,0,COL_W,o.gapY-(GAP_H/2))
        ctx.fillRect(o.x,o.gapY+(GAP_H/2),COL_W,H-(o.gapY+(GAP_H/2)))
      }
      if(frozenNow){ ctx.fillStyle='rgba(173,216,230,0.15)'; ctx.fillRect(0,0,W,H) }

      // particles
      for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.life-=dt; if(p.life<=0){particles.splice(i,1); continue}
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=(p.g||300)*dt
        ctx.globalAlpha=Math.max(0,p.life*1.6)
        ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1 }

      // trail + player
      trail.push({x:PLAYER_X,y}); if(trail.length>20) trail.shift()
      for(let i=0;i<trail.length;i++){ const t=trail[i]; const alpha=i/(trail.length*1.4); ctx.globalAlpha=alpha; ctx.beginPath(); ctx.arc(t.x,t.y,R*(i/trail.length*0.6),0,Math.PI*2); ctx.fillStyle=theme().trail; ctx.fill() }
      ctx.globalAlpha=1
      ctx.beginPath(); ctx.arc(PLAYER_X,y,R,0,Math.PI*2)
      const pg=ctx.createRadialGradient(PLAYER_X-4,y-4,2,PLAYER_X,y,R); pg.addColorStop(0,theme().trail); pg.addColorStop(1,BASE_THEME.ball)
      ctx.fillStyle=pg; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#0369a1'; ctx.stroke()

      // HUD
      const dHud = (gameState==='playing') ? difficulty(now) : 0
      ctx.fillStyle='#0f172a'; ctx.font='bold 28px system-ui'; ctx.fillText(String(localScore),16,40)
      ctx.font='12px system-ui'
      ctx.fillText(`Mode: ${modeName}`,16,60)
      ctx.fillText(`Level: ${levelIndex+1} · World: ${world.name} · Difficulty: ${Math.round(dHud*100)}%`,16,92)
      const msLeft=Math.max(0,(paused?0:flipMs)-(performance.now()-lastFlip))
      ctx.fillText(`Gravity: ${state==='paused'?'||':(gravityDir>0?'↓':'↑')} (${Math.ceil(msLeft/1000)}s)`,16,108)

      if(state==='paused') center(ctx,W,H,'Paused — two-finger tap to resume','#0f172a')
      else if(state==='ready') center(ctx,W,H,'Tap to Start','#0f172a')
      else if(state==='gameover') center(ctx,W,H,'Game Over — tap to restart','#b91c1c')

      if (banner && performance.now() < banner.until){
        ctx.fillStyle = '#0f172a'; ctx.font='bold 18px system-ui'
        const m=ctx.measureText(banner.text); ctx.fillText(banner.text,(W-m.width)/2,32)
      }

      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)

    return ()=>{ ro.disconnect(); window.removeEventListener('resize',cssFit); window.visualViewport?.removeEventListener('resize',cssFit); window.removeEventListener('keydown',onKey); window.removeEventListener('obc-toggle-pause',togglePause); canvas.removeEventListener('mousedown',press); canvas.removeEventListener('touchstart',press) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily, playerId, selectedModeName]) // remount logic in App also bumps key

  return (
    <div style={{display:'grid',placeItems:'center'}}>
      <div ref={shellRef} className="gameShell card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px 2px', width:'100%'}}>
          <span className="pill">{modeName}</span>
          <button className="btn secondary" onClick={()=>window.dispatchEvent(new CustomEvent('obc-toggle-pause'))} style={{padding:'6px 10px'}}>Pause/Resume</button>
        </div>
        <canvas ref={canvasRef} />
      </div>
      <div className="small" style={{marginTop:8}}>
        One button: tap/click/space — freezes obstacles + impulse.
        {lastSubmitted && <span style={{marginLeft:8}}>Last score {lastSubmitted.score} {lastSubmitted.queued ? '(queued)' : '(sent)'}</span>}
      </div>
    </div>
  )
}

function drawBackground(ctx,W,H,kind){
  if(kind==='sky'){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#f9fbff'); g.addColorStop(1,'#eef2ff'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
    ctx.fillStyle='rgba(255,255,255,0.6)'
    for(let i=0;i<3;i++){ const y=40+i*180,r=90; ctx.beginPath(); ctx.ellipse(60,y,r,r*0.45,0,0,Math.PI*2); ctx.fill() }
  } else if(kind==='cave'){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#eef2ff'); g.addColorStop(1,'#e5ebfb'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
    ctx.fillStyle='#d7def2'
    for(let x=0;x<W;x+=20){ const h=8+Math.sin(x*0.2)*6; ctx.fillRect(x,0,20,h); ctx.fillRect(x,H-h,20,h) }
  } else if(kind==='tech'){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#eef6ff'); g.addColorStop(1,'#e8f0ff'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
    ctx.strokeStyle='rgba(0,70,130,0.08)'; ctx.lineWidth=1
    for(let x=10;x<W;x+=30){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
    for(let y=20;y<H;y+=30){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
  } else if(kind==='space'){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0b1226'); g.addColorStop(1,'#131a33'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
    ctx.fillStyle='rgba(255,255,255,0.25)'
    for(let i=0;i<60;i++){ const x=Math.random()*W,y=Math.random()*H,r=Math.random()*1.2; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill() }
  } else {
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#f7faff'); g.addColorStop(1,'#eaf1ff'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
  }
}

function center(ctx,W,H,text,color){
  ctx.save()
  ctx.fillStyle=color
  ctx.font='bold 18px system-ui'
  const m=ctx.measureText(text)
  ctx.fillText(text,(W-m.width)/2,H*0.45)
  ctx.restore()
}
