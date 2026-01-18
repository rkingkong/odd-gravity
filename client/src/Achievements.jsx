import React, { useState, useEffect } from 'react'

// Achievement definitions (should match Game.jsx)
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

export default function Achievements() {
  const [isOpen, setIsOpen] = useState(false)
  const [unlocked, setUnlocked] = useState({})
  
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('obc_achievements') || '{}')
      setUnlocked(stored)
    } catch {
      setUnlocked({})
    }
  }, [isOpen])
  
  const totalAchievements = Object.keys(ACHIEVEMENTS).length
  const unlockedCount = Object.keys(unlocked).length
  const progressPercent = Math.round((unlockedCount / totalAchievements) * 100)
  
  if (!isOpen) {
    return (
      <button 
        className="btn secondary achievements-btn" 
        onClick={() => setIsOpen(true)}
        style={{ position: 'relative' }}
      >
        🏆 Achievements
        {unlockedCount > 0 && (
          <span className="achievement-badge">{unlockedCount}</span>
        )}
      </button>
    )
  }
  
  return (
    <div className="achievements-modal-backdrop" onClick={() => setIsOpen(false)}>
      <div className="achievements-modal" onClick={e => e.stopPropagation()}>
        <div className="achievements-header">
          <h2>🏆 Achievements</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>
        
        <div className="achievements-progress">
          <div className="progress-text">
            <span>{unlockedCount} / {totalAchievements} Unlocked</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="achievements-grid">
          {Object.entries(ACHIEVEMENTS).map(([key, ach]) => {
            const isUnlocked = !!unlocked[key]
            const unlockedAt = unlocked[key] ? new Date(unlocked[key]).toLocaleDateString() : null
            
            return (
              <div 
                key={key} 
                className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="achievement-card-icon">
                  {isUnlocked ? ach.icon : '🔒'}
                </div>
                <div className="achievement-card-info">
                  <div className="achievement-card-name">
                    {isUnlocked ? ach.name : '???'}
                  </div>
                  <div className="achievement-card-desc">
                    {isUnlocked ? ach.desc : 'Keep playing to unlock!'}
                  </div>
                  {unlockedAt && (
                    <div className="achievement-card-date">
                      Unlocked: {unlockedAt}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="achievements-footer">
          <button 
            className="btn secondary" 
            onClick={() => {
              if (confirm('Reset all achievements? This cannot be undone.')) {
                localStorage.removeItem('obc_achievements')
                setUnlocked({})
              }
            }}
          >
            Reset Progress
          </button>
        </div>
      </div>
      
      <style>{`
        .achievements-btn {
          position: relative;
        }
        
        .achievement-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: var(--warning);
          color: #000;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }
        
        .achievements-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        
        .achievements-modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }
        
        .achievements-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .achievements-header h2 {
          margin: 0;
          font-size: 20px;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: var(--fg-muted);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        
        .close-btn:hover {
          color: var(--fg);
        }
        
        .achievements-progress {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .progress-text {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
          color: var(--fg-muted);
        }
        
        .progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--success));
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        
        .achievements-grid {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
          display: grid;
          gap: 12px;
        }
        
        .achievement-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 10px;
          transition: all 0.2s;
        }
        
        .achievement-card.unlocked {
          border-color: rgba(245, 158, 11, 0.3);
          background: rgba(245, 158, 11, 0.05);
        }
        
        .achievement-card.locked {
          opacity: 0.6;
        }
        
        .achievement-card-icon {
          font-size: 28px;
          flex-shrink: 0;
        }
        
        .achievement-card-info {
          flex: 1;
          min-width: 0;
        }
        
        .achievement-card-name {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }
        
        .achievement-card-desc {
          font-size: 12px;
          color: var(--fg-muted);
        }
        
        .achievement-card-date {
          font-size: 10px;
          color: var(--fg-muted);
          margin-top: 4px;
          opacity: 0.7;
        }
        
        .achievements-footer {
          padding: 12px 20px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}