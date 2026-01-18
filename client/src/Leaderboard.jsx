import React, { useEffect, useState, useCallback } from 'react'
import API from './api'

export default function Leaderboard() {
  const [period, setPeriod] = useState('daily')
  const [mode, setMode] = useState('any')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  
  const playerId = localStorage.getItem('obc_player_id')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await API.leaderboard({ period, mode, limit: 25 })
      setItems(r.items || [])
      setLastRefresh(new Date())
    } catch {
      setItems([])
      setError('Offline or connection error')
    } finally {
      setLoading(false)
    }
  }, [period, mode])

  useEffect(() => {
    load()
    
    // Auto-refresh every 30 seconds if tab is visible
    let interval
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval)
      } else {
        interval = setInterval(load, 30000)
      }
    }
    
    interval = setInterval(load, 30000)
    document.addEventListener('visibilitychange', handleVisibility)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [load])

  // Find current player's rank
  const playerRank = items.findIndex(item => item.player_id === playerId) + 1
  const playerEntry = items.find(item => item.player_id === playerId)

  // Personal bests from localStorage
  const personalBest = parseInt(localStorage.getItem('obc_best_all') || '0', 10)
  const dailyBest = parseInt(localStorage.getItem(`obc_best_${new Date().toISOString().slice(0, 10)}`) || '0', 10)

  return (
    <div className="leaderboard-section">
      {/* Personal Stats */}
      <div className="personal-stats">
        <div className="stat-box">
          <div className="stat-value">{personalBest}</div>
          <div className="stat-label">All-Time Best</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{dailyBest}</div>
          <div className="stat-label">Today's Best</div>
        </div>
        {playerRank > 0 && (
          <div className="stat-box highlight">
            <div className="stat-value">#{playerRank}</div>
            <div className="stat-label">Your Rank ({period})</div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="lb-header">
        <h3 style={{ margin: 0 }}>🏆 Leaderboard</h3>
        
        <div className="lb-filters">
          <select className="btn" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
            <option value="all">All-Time</option>
          </select>
          
          <select className="btn" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="any">All Modes</option>
            <option value="Odd Gravity">Odd Gravity</option>
            <option value="Flux">Flux</option>
            <option value="Pulse">Pulse</option>
            <option value="Chaotic">Chaotic</option>
            <option value="Inverted">Inverted</option>
            <option value="Classic">Classic</option>
          </select>
          
          <button 
            className="btn secondary" 
            onClick={load}
            disabled={loading}
          >
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      {/* Error/Status */}
      {error && (
        <div className="lb-error">
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="lb-table-wrapper">
        <table className="lb">
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>Player</th>
              <th style={{ width: 80 }}>Score</th>
              <th style={{ width: 90 }}>Mode</th>
              <th style={{ width: 100 }}>When</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="lb-empty">
                  {error ? 'Unable to load scores' : 'No scores yet — be the first!'}
                </td>
              </tr>
            )}
            
            {items.map((item, i) => {
              const isYou = item.player_id === playerId
              const rank = i + 1
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
              
              return (
                <tr 
                  key={`${item.player_id}-${i}`} 
                  className={isYou ? 'lb-you' : ''}
                >
                  <td>
                    {medal || rank}
                  </td>
                  <td>
                    <code>{item.player_id.slice(0, 8)}</code>
                    {isYou && <span className="you-badge">You</span>}
                  </td>
                  <td className="score-cell">
                    {item.best_score}
                  </td>
                  <td>
                    <span className="mode-tag">{item.mode_name}</span>
                  </td>
                  <td className="time-cell">
                    {formatTime(item.last_played)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {lastRefresh && (
        <div className="lb-footer">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      <style>{`
        .leaderboard-section {
          margin-top: 24px;
        }
        
        .personal-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .stat-box {
          flex: 1;
          min-width: 100px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          text-align: center;
        }
        
        .stat-box.highlight {
          border-color: var(--accent);
          background: rgba(14, 165, 233, 0.1);
        }
        
        .stat-box .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent);
        }
        
        .stat-box .stat-label {
          font-size: 11px;
          color: var(--fg-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        
        .lb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .lb-filters {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .lb-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        
        .lb-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-card);
        }
        
        .lb {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        
        .lb th {
          background: rgba(0, 0, 0, 0.2);
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--fg-muted);
          padding: 12px 10px;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        
        .lb td {
          padding: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 13px;
        }
        
        .lb tbody tr:last-child td {
          border-bottom: none;
        }
        
        .lb tbody tr:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        
        .lb-you {
          background: rgba(14, 165, 233, 0.08) !important;
        }
        
        .lb-empty {
          text-align: center;
          padding: 40px 20px !important;
          color: var(--fg-muted);
        }
        
        .you-badge {
          background: var(--accent);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
          font-weight: 600;
        }
        
        .score-cell {
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        
        .mode-tag {
          background: rgba(255, 255, 255, 0.08);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
        }
        
        .time-cell {
          color: var(--fg-muted);
          font-size: 12px;
        }
        
        .lb-footer {
          margin-top: 10px;
          text-align: center;
          font-size: 11px;
          color: var(--fg-muted);
          opacity: 0.7;
        }
        
        @media (max-width: 500px) {
          .lb-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .lb-filters {
            justify-content: space-between;
          }
          
          .personal-stats {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

function formatTime(dateStr) {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  } catch {
    return dateStr
  }
}