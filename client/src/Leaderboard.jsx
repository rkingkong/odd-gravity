import React, { useEffect, useState } from 'react'
import API from './api'

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'all', label: 'All-time' },
]

export default function Leaderboard() {
  const [period, setPeriod] = useState('daily')
  const [mode, setMode] = useState('any')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const { items } = await API.leaderboard({ period, mode, limit: 20 })
      setItems(items || [])
    } catch {
      setItems([]); setError('Failed to load leaderboard (maybe offline).')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [period, mode])

  const short = (id) => (id ? id.slice(0, 8) : 'anon')

  return (
    <section style={{marginTop:12}}>
      <div style={{display:'flex',gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'center'}}>
        <strong style={{color:'#e5f3ff'}}>Leaderboard:</strong>
        <select className="select" value={period} onChange={(e)=>setPeriod(e.target.value)}>
          {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select className="select" value={mode} onChange={(e)=>setMode(e.target.value)}>
          <option value="any">Any mode</option>
          <option value="Classic">Classic</option>
          <option value="Chaotic">Chaotic</option>
          <option value="Bouncy">Bouncy</option>
          <option value="Inverted">Inverted</option>
          <option value="Pulse">Pulse</option>
          <option value="Flux">Flux</option>
          <option value="Odd Gravity">Odd Gravity</option>
        </select>
        <button className="btn secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        {error && <span style={{color:'#fca5a5', marginLeft:8}}>{error}</span>}
      </div>

      {!items.length && !loading && <p className="small" style={{marginTop:6}}>No scores yet.</p>}

      {!!items.length && (
        <ol className="list" style={{paddingLeft:18, marginTop:8}}>
          {items.map((r,i)=>(
            <li key={i} style={{margin:'2px 0'}}>
              <b>{r.best_score}</b> — {short(r.player_id)}
              <span style={{color:'#9fbad6'}}> · {new Date(r.last_played).toLocaleString()} · {r.mode_name}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
