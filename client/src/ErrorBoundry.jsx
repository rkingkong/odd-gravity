import React from 'react'

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 * Prevents the entire app from crashing and shows a friendly error screen
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    
    // Log error for debugging
    console.error('🎮 Game Error:', error)
    console.error('Component Stack:', errorInfo?.componentStack)
    
    // TODO: Send to error tracking service (Sentry, Firebase Crashlytics, etc.)
    // Example:
    // Sentry.captureException(error, { extra: errorInfo })
  }

  handleRestart = () => {
    // Clear any corrupted local state that might cause the error to repeat
    try {
      // Don't clear player ID or scores, just potential corrupted game state
      const keysToPreserve = ['obc_player_id', 'obc_best_all', 'obc_achievements', 'obc_mode']
      const preserved = {}
      keysToPreserve.forEach(key => {
        const val = localStorage.getItem(key)
        if (val) preserved[key] = val
      })
      
      // Restore preserved data
      Object.entries(preserved).forEach(([key, val]) => {
        localStorage.setItem(key, val)
      })
    } catch (e) {
      console.warn('Could not preserve localStorage:', e)
    }
    
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">💥</div>
            <h1>Oops! Something went wrong</h1>
            <p>The game encountered an unexpected error.</p>
            <p className="error-detail">
              Don't worry - your scores and progress are safe!
            </p>
            
            <div className="error-actions">
              <button className="btn primary" onClick={this.handleRestart}>
                🔄 Restart Game
              </button>
              <button 
                className="btn secondary" 
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              >
                {this.state.showDetails ? 'Hide' : 'Show'} Details
              </button>
            </div>
            
            {this.state.showDetails && (
              <details className="error-details" open>
                <summary>Error Details</summary>
                <pre>
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
          
          <style>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              padding: 20px;
            }
            
            .error-content {
              text-align: center;
              max-width: 400px;
              color: #e2e8f0;
            }
            
            .error-icon {
              font-size: 64px;
              margin-bottom: 16px;
              animation: shake 0.5s ease-in-out;
            }
            
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-10px); }
              40%, 80% { transform: translateX(10px); }
            }
            
            .error-content h1 {
              font-size: 24px;
              margin: 0 0 8px 0;
              color: #f8fafc;
            }
            
            .error-content p {
              margin: 8px 0;
              color: #94a3b8;
            }
            
            .error-detail {
              font-size: 14px;
              color: #22c55e;
              margin: 16px 0;
            }
            
            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 24px;
              flex-wrap: wrap;
            }
            
            .error-boundary .btn {
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              border: none;
              font-size: 14px;
              transition: transform 0.1s, box-shadow 0.1s;
            }
            
            .error-boundary .btn:hover {
              transform: translateY(-2px);
            }
            
            .error-boundary .btn.primary {
              background: #0ea5e9;
              color: white;
              box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
            }
            
            .error-boundary .btn.secondary {
              background: #334155;
              color: #e2e8f0;
            }
            
            .error-details {
              margin-top: 24px;
              text-align: left;
              background: #1e293b;
              border-radius: 8px;
              padding: 12px;
            }
            
            .error-details summary {
              cursor: pointer;
              color: #94a3b8;
              font-size: 12px;
            }
            
            .error-details pre {
              margin: 12px 0 0 0;
              padding: 12px;
              background: #0f172a;
              border-radius: 4px;
              font-size: 11px;
              color: #f87171;
              overflow-x: auto;
              max-height: 200px;
              white-space: pre-wrap;
              word-break: break-word;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}
