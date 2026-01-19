import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './styles.css'

// Render app with error boundary
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

// ========== SERVICE WORKER REGISTRATION ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service Worker registered:', registration.scope)
      
      // Check for updates periodically (every hour)
      setInterval(() => {
        registration.update().catch(console.warn)
      }, 60 * 60 * 1000)
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        console.log('🔄 New Service Worker found, installing...')
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New version available
              console.log('✨ New version available!')
              
              // Show update notification
              showUpdateNotification()
            } else {
              // First install
              console.log('📦 Content cached for offline use')
            }
          }
        })
      })
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
    }
  })
}

// Show a non-intrusive update notification
function showUpdateNotification() {
  // Only show if user isn't in the middle of a game
  // Check if there's an active game state
  const isPlaying = document.querySelector('.gameShell canvas')
  
  if (isPlaying) {
    // Wait for game over before prompting
    window.addEventListener('obc-game-over', showPrompt, { once: true })
  } else {
    showPrompt()
  }
  
  function showPrompt() {
    const notification = document.createElement('div')
    notification.className = 'update-notification'
    notification.innerHTML = `
      <span>✨ New version available!</span>
      <button onclick="window.location.reload()">Update</button>
      <button onclick="this.parentElement.remove()">Later</button>
    `
    document.body.appendChild(notification)
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      notification.remove()
    }, 10000)
  }
}

// ========== GLOBAL ERROR HANDLING ==========
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  // Could send to analytics here
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // Could send to analytics here
})

// ========== PERFORMANCE MONITORING (Development Only) ==========
if (import.meta.env.DEV) {
  // Log long tasks that might cause jank
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(1)}ms`)
          }
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // longtask not supported in all browsers
    }
  }
}
