import React, { useEffect, useState } from 'react'
import API, { flushScoreQueue } from './api'
import Game from './Game'
import Leaderboard from './Leaderboard'
import InstallPrompt from './InstallPrompt'
import Settings from './Settings'
import Achievements from './Achievements'
import { MODE_PRESETS, getModeNames } from './modes'

function withOverrides(base) {
  try {
    const p = new URLSearchParams(location.search)
    if (![...p.keys()].length) return base
    const o = { ...(base || {}), seed: 'demo' }
    if (p.get('mode')) o.modeName = p.get('mode')
    if (p.get('flip')) o.gravityFlipEveryMs = Number(p.get('flip'))
    if (p.get('speed')) o.obstacleSpeed = Number(p.get('speed'))
    if (p.get('freeze')) o.freezeDurationMs = Number(p.get('freeze'))
    return o
  } catch {
    return base
  }
}

export default function App() {
  const [playerId, setPlayerId] = useState(localStorage.getItem('obc_player_id') || '')
  const [health, setHealth] = useState(null)
  const [daily, setDaily] = useState(null)
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState(() => localStorage.getItem('obc_mode') || 'Odd Gravity')
  const [gameKey, setGameKey] = useState(0)

  useEffect(() => {
    document.title = 'Odd Gravity'
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setHealth(await API.health())
      } catch {
        setHealth({ ok: false, offline: true })
      }
      
      let pid = playerId
      if (!pid) {
        try {
          const r = await API.register()
          pid = r.playerId
          setPlayerId(pid)
          localStorage.setItem('obc_player_id', pid)
        } catch {
          // Generate local ID if offline
          pid = 'local-' + Math.random().toString(36).slice(2, 10)
          setPlayerId(pid)
          localStorage.setItem('obc_player_id', pid)
        }
      } else {
        try {
          await API.register(pid)
        } catch {}
      }
      
      try {
        const d = await API.daily()
        setDaily(withOverrides(d))
      } catch {
        // Use offline defaults
        setDaily({
          seed: 'offline',
          modeName: 'Classic',
          gravityFlipEveryMs: 3000,
          obstacleSpeed: 3,
          freezeDurationMs: 550
        })
      }
      
      const sent = await flushScoreQueue(pid)
      if (sent) setStatus(`Synced ${sent} offline score(s)`)
    })()
  }, [])

  useEffect(() => {
    const onOnline = async () => {
      const pid = localStorage.getItem('obc_player_id')
      const sent = await flushScoreQueue(pid)
      if (sent) setStatus(`Synced ${sent} offline score(s)`)
      
      // Re-fetch daily
      try {
        const d = await API.daily()
        setDaily(withOverrides(d))
      } catch {}
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  const modeNames = getModeNames()
  
  function onModeChange(e) {
    const value = e.target.value
    setMode(value)
    localStorage.setItem('obc_mode', value)
    setGameKey(k => k + 1) // Force remount
  }

  const isDemo = daily?.seed === 'demo'
  const isOffline = health?.offline || daily?.seed === 'offline'

  return (
    <div className="page">
      <InstallPrompt />
      
      {/* Header */}
      <header style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 className="h1" style={{ margin: 0 }}>Odd Gravity</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <select className="btn" value={mode} onChange={onModeChange}>
              {modeNames.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <Settings />
            <Achievements />
          </div>
        </div>
        
        {isOffline && (
          <div className="pill" style={{ marginTop: 8, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            📡 Offline mode — scores will sync when online
          </div>
        )}
        
        {isDemo && (
          <div className="pill" style={{ marginTop: 8 }}>
            🧪 Demo override: {daily.modeName} · flip {daily.gravityFlipEveryMs}ms · speed {daily.obstacleSpeed}
          </div>
        )}
      </header>

      {/* Game */}
      <Game key={`game-${gameKey}-${mode}`} daily={daily} playerId={playerId} modeName={mode} />
      
      {/* Status */}
      {status && (
        <div className="small" style={{ marginTop: 10, textAlign: 'center', color: 'var(--success)' }}>
          ✓ {status}
        </div>
      )}
      
      {/* Leaderboard */}
      <Leaderboard />

      {/* Footer */}
      <footer style={{ marginTop: 24, textAlign: 'center' }}>
        <div className="controls" style={{ justifyContent: 'center' }}>
          <button 
            className="btn" 
            onClick={() => {
              navigator.share?.({
                title: 'Odd Gravity',
                text: 'Can you beat my score in Odd Gravity? 🎮',
                url: location.origin
              }).catch(() => {})
            }}
          >
            📤 Share
          </button>
          <button className="btn secondary" onClick={() => location.reload()}>
            🔄 Reload
          </button>
        </div>

        <div className="small" style={{ marginTop: 16, opacity: 0.5 }}>
          <div>Player: {playerId?.slice(0, 8) || '...'}</div>
          <div>
            {health?.ok ? '🟢 Connected' : '🔴 Offline'} · 
            Mode: {daily?.modeName || 'Loading...'}
          </div>
        </div>
      </footer>

      {/* Mode Info Panel */}
      <ModeInfo currentMode={mode} />
    </div>
  )
}

// Mode info panel showing what each mode does
function ModeInfo({ currentMode }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const modeDetails = {
    'Classic': {
      color: '#38bdf8',
      traits: ['⚖️ Standard speed & freeze', '⏱️ 3 second gravity flips', '🎯 Great for learning']
    },
    'Odd Gravity': {
      color: '#0ea5e9',
      traits: ['⚡ 30% FASTER gravity flips!', '⏱️ ~2 second flip timer', '🔥 More intense than Classic']
    },
    'Inverted': {
      color: '#60a5fa',
      traits: ['⬆️ GRAVITY REVERSED at start!', '🌌 Dark space theme', '🤯 Very disorienting']
    },
    'Flux': {
      color: '#d946ef',
      traits: ['🌊 Ball WOBBLES up & down!', '🐢 20% slower obstacles', '🎢 Unpredictable movement']
    },
    'Pulse': {
      color: '#22c55e',
      traits: ['💨 35% FASTER obstacles!', '⚡ 50% shorter freeze!', '😱 Intense & unforgiving']
    },
    'Chaotic': {
      color: '#f59e0b',
      traits: ['🎲 RANDOM gravity flips!', '⚠️ No warning - just flips!', '🤪 Pure chaos mode']
    },
    'Bouncy': {
      color: '#a78bfa',
      traits: ['🏀 BOUNCE off top/bottom!', "💚 Can't die from walls", '🏃 25% faster to compensate']
    }
  }
  
  return (
    <details className="mode-info-panel" open={isOpen} onToggle={e => setIsOpen(e.target.open)}>
      <summary className="btn secondary" style={{ marginTop: 16 }}>
        ℹ️ About Game Modes
      </summary>
      <div className="mode-info-content">
        {Object.entries(modeDetails).map(([name, info]) => (
          <div 
            key={name} 
            className={`mode-info-item ${name === currentMode ? 'active' : ''}`}
            style={{ '--mode-color': info.color }}
          >
            <div className="mode-info-header">
              <span className="mode-dot" style={{ background: info.color }} />
              <strong>{name}</strong>
              {name === currentMode && <span className="pill" style={{ marginLeft: 8, fontSize: 10 }}>Active</span>}
            </div>
            <ul className="mode-traits">
              {info.traits.map((trait, i) => (
                <li key={i}>{trait}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <style>{`
        .mode-info-panel {
          margin-top: 20px;
        }
        
        .mode-info-panel > summary {
          cursor: pointer;
          list-style: none;
        }
        
        .mode-info-content {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-top: 12px;
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        
        .mode-info-item {
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .mode-info-item.active {
          border-color: var(--mode-color);
          background: rgba(255, 255, 255, 0.04);
        }
        
        .mode-info-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .mode-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .mode-traits {
          margin: 0;
          padding-left: 18px;
          font-size: 12px;
          color: var(--fg-muted);
        }
        
        .mode-traits li {
          margin: 4px 0;
        }
      `}</style>
    </details>
  )
}