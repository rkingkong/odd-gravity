/**
 * GAME.JSX CRITICAL PATCHES
 * 
 * Apply these changes to your existing Game.jsx file.
 * These fixes prevent memory leaks and improve mobile experience.
 */

// ============================================================
// PATCH 1: Add at the top of the main useEffect (after canvas setup)
// ============================================================

// Add these variables at the start of useEffect:
let isRunning = true  // Track if game should continue running
let animationFrameId = null  // Store animation frame ID for cleanup

// ============================================================
// PATCH 2: Add visibility change handler inside useEffect
// ============================================================

// Add this after your input handlers setup:

// Auto-pause when tab/app loses focus
function handleVisibilityChange() {
  if (document.hidden && gameState === 'playing' && !paused) {
    console.log('🎮 Game auto-paused (tab hidden)')
    togglePause()
  }
}
document.addEventListener('visibilitychange', handleVisibilityChange)

// Also handle window blur (for when user switches windows)
function handleWindowBlur() {
  if (gameState === 'playing' && !paused) {
    console.log('🎮 Game auto-paused (window blur)')
    togglePause()
  }
}
window.addEventListener('blur', handleWindowBlur)

// ============================================================
// PATCH 3: Update the game loop to check isRunning
// ============================================================

// Modify your frame() function:
function frame(now) {
  // Add this check at the very start of frame():
  if (!isRunning) return
  
  // ... rest of your existing frame logic ...
  
  // At the end, replace:
  // requestAnimationFrame(frame)
  // With:
  animationFrameId = requestAnimationFrame(frame)
}

// Start the loop with:
animationFrameId = requestAnimationFrame(frame)

// ============================================================
// PATCH 4: Update the cleanup/return function in useEffect
// ============================================================

// Replace your existing return/cleanup with this comprehensive version:

return () => {
  console.log('🧹 Cleaning up game...')
  
  // Stop the game loop
  isRunning = false
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  // Remove event listeners from canvas
  canvas.removeEventListener('mousedown', press)
  canvas.removeEventListener('touchstart', touchHandler)
  canvas.removeEventListener('contextmenu', preventDefault)
  
  // Remove window event listeners
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', cssFit)
  window.removeEventListener('obc-toggle-pause', togglePause)
  window.removeEventListener('blur', handleWindowBlur)
  
  // Remove document event listeners
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  // Remove visualViewport listener if it exists
  window.visualViewport?.removeEventListener('resize', cssFit)
  
  // Disconnect ResizeObserver
  if (ro) {
    ro.disconnect()
  }
  
  console.log('✅ Game cleanup complete')
}

// ============================================================
// PATCH 5: Add game over event dispatch (for service worker updates)
// ============================================================

// In your gameOver() function, add at the end:
function gameOver() {
  // ... existing game over logic ...
  
  // Dispatch event so service worker can show update notification
  window.dispatchEvent(new CustomEvent('obc-game-over', { 
    detail: { score: localScore, mode: modeName } 
  }))
}

// ============================================================
// PATCH 6: Prevent context menu on long press (add to input handlers)
// ============================================================

// Add after your canvas event listeners:
const preventDefault = (e) => e.preventDefault()
canvas.addEventListener('contextmenu', preventDefault)

// ============================================================
// PATCH 7: Add loading state before canvas is ready
// ============================================================

// Add this early return in your Game component (before the main return):
if (!daily) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <div className="loading-text">Loading game...</div>
    </div>
  )
}

// ============================================================
// FULL EXAMPLE: Complete useEffect structure with patches
// ============================================================

/*
useEffect(() => {
  const canvas = canvasRef.current
  const shell = shellRef.current
  if (!canvas || !shell) return

  // === PATCH 1: Track running state ===
  let isRunning = true
  let animationFrameId = null

  // ... your existing setup code ...

  // === PATCH 2: Visibility handlers ===
  function handleVisibilityChange() {
    if (document.hidden && gameState === 'playing' && !paused) {
      togglePause()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  function handleWindowBlur() {
    if (gameState === 'playing' && !paused) {
      togglePause()
    }
  }
  window.addEventListener('blur', handleWindowBlur)

  // ... your existing input handlers ...

  // === PATCH 6: Prevent context menu ===
  const preventDefault = (e) => e.preventDefault()
  canvas.addEventListener('contextmenu', preventDefault)

  // === PATCH 3: Game loop with isRunning check ===
  function frame(now) {
    if (!isRunning) return
    
    // ... your existing frame logic ...
    
    animationFrameId = requestAnimationFrame(frame)
  }
  
  animationFrameId = requestAnimationFrame(frame)

  // === PATCH 4: Comprehensive cleanup ===
  return () => {
    isRunning = false
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    
    canvas.removeEventListener('mousedown', press)
    canvas.removeEventListener('touchstart', touchHandler)
    canvas.removeEventListener('contextmenu', preventDefault)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', cssFit)
    window.removeEventListener('obc-toggle-pause', togglePause)
    window.removeEventListener('blur', handleWindowBlur)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.visualViewport?.removeEventListener('resize', cssFit)
    ro?.disconnect()
  }
}, [daily, playerId, modeName]) // Your existing deps
*/
