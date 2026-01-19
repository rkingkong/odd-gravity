import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center', color: '#e2e8f0', maxWidth: '400px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💥</div>
            <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Oops! Something went wrong</h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
              Don't worry - your scores are safe!
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#0ea5e9',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔄 Restart Game
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
