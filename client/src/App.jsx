import React, { useEffect, useState } from 'react'
import API, { flushScoreQueue } from './api'
import Game from './Game'
import Leaderboard from './Leaderboard'
import InstallPrompt from './InstallPrompt'
import Settings from './Settings'
import { MODE_PRESETS } from './modes'

function withOverrides(base){
  try{
    const p = new URLSearchParams(location.search)
    if (![...p.keys()].length) return base
    const o = { ...(base||{}), seed: 'demo' }
    if (p.get('mode'))   o.modeName = p.get('mode')
    if (p.get('flip'))   o.gravityFlipEveryMs = Number(p.get('flip'))
    if (p.get('speed'))  o.obstacleSpeed = Number(p.get('speed'))
    if (p.get('freeze')) o.freezeDurationMs = Number(p.get('freeze'))
    return o
  }catch{ return base }
}

export default function App(){
  const [playerId,setPlayerId]=useState(localStorage.getItem('obc_player_id')||'')
  const [health,setHealth]=useState(null)
  const [daily,setDaily]=useState(null)
  const [status,setStatus]=useState('')

  // Mode picker state (persisted) + a key to force <Game/> remount on change
  const [mode, setMode] = useState(() => localStorage.getItem('obc_mode') || 'Odd Gravity')
  const [gameKey, setGameKey] = useState(0)

  useEffect(()=>{ document.title = 'Odd Gravity' }, [])

  // Ensure mode is stored on first run
  useEffect(() => {
    if (!localStorage.getItem('obc_mode')) localStorage.setItem('obc_mode', mode)
  }, [mode])

  useEffect(()=>{(async()=>{
    try{ setHealth(await API.health()) }catch{ setHealth({ok:false,offline:true}) }
    let pid = playerId
    if(!pid){
      const r=await API.register(); pid=r.playerId; setPlayerId(pid)
      localStorage.setItem('obc_player_id',pid)
    } else {
      await API.register(pid)
    }
    try{
      const d = await API.daily()
      setDaily(withOverrides(d))
    }catch{}
    const sent = await flushScoreQueue(pid)
    if (sent) setStatus(`Flushed ${sent} offline score(s).`)
  })()},[])

  useEffect(()=>{
    const onOnline = async () => {
      const pid=localStorage.getItem('obc_player_id')
      const sent=await flushScoreQueue(pid)
      if(sent) setStatus(`Flushed ${sent} offline score(s).`)
    }
    window.addEventListener('online',onOnline)
    return ()=>window.removeEventListener('online',onOnline)
  },[])

  const isDemo = daily?.seed === 'demo'

  function onModeChange(e){
    const v = e.target.value
    setMode(v)
    localStorage.setItem('obc_mode', v)
    setGameKey(k => k + 1) // re-mount Game so the new mode applies immediately
  }

  return (
    <div className="page">
      <InstallPrompt />
      <div className="row" style={{alignItems:'center', gap:8, flexWrap:'wrap'}}>
        <h1 className="h1" style={{margin:0, flex:'1 1 auto'}}>Odd Gravity</h1>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <label className="small" htmlFor="mode" style={{opacity:0.85}}>Mode:</label>
          <select id="mode" className="btn" value={mode} onChange={onModeChange}>
            {Object.keys(MODE_PRESETS).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <Settings />
        </div>
      </div>

      {isDemo && (
        <div className="pill" style={{marginBottom:6}}>
          Demo override: {daily.modeName} · flip {daily.gravityFlipEveryMs}ms · speed {daily.obstacleSpeed} · freeze {daily.freezeDurationMs}ms
        </div>
      )}

      {/* key forces re-mount when mode changes so Game picks up new physics/colors */}
      <Game key={gameKey} daily={daily} playerId={playerId} />

      <div className="small" style={{marginTop:10}}>{status}</div>

      <Leaderboard />

      <div className="controls" style={{marginTop:18}}>
        <button
          className="btn"
          onClick={()=>navigator.share?.({title:'Odd Gravity',text:'Play Odd Gravity!',url:location.origin}).catch(()=>{})}
        >
          Share
        </button>
        <button className="btn secondary" onClick={()=>location.reload()}>Reload</button>
      </div>

      <p className="small" style={{marginTop:10, maxWidth:720, textAlign:'center'}}>
        Player: {playerId || '(registering...)'} · Health: {health ? JSON.stringify(health) : '…'} · Daily: {daily ? JSON.stringify(daily) : '…'}
      </p>
    </div>
  )
}
