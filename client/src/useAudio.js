import { useCallback, useRef } from 'react'

let audioContext = null
let isAudioResumed = false

export async function resumeAudio() {
  if (isAudioResumed) return
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    isAudioResumed = true
  } catch (e) {
    console.warn('Audio resume failed:', e)
  }
}

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

function isSoundEnabled() {
  try {
    return localStorage.getItem('obc_sound') !== 'off'
  } catch {
    return true
  }
}

export function vibrate(pattern) {
  try {
    if (localStorage.getItem('obc_vibe') === 'off') return
    if (navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  } catch {}
}

export function useSfx() {
  const lastBeepRef = useRef(0)
  
  const beep = useCallback((freq = 440, duration = 0.1, type = 'sine', volume = 0.1) => {
    if (!isSoundEnabled()) return
    
    // Throttle rapid beeps
    const now = performance.now()
    if (now - lastBeepRef.current < 30) return
    lastBeepRef.current = now
    
    try {
      const ctx = getContext()
      if (ctx.state !== 'running') return
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      
      // Quick attack, smooth release
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration + 0.05)
    } catch (e) {
      console.warn('Beep failed:', e)
    }
  }, [])

  const chord = useCallback((freqs = [440, 550], duration = 0.3, volume = 0.08) => {
    if (!isSoundEnabled()) return
    
    try {
      const ctx = getContext()
      if (ctx.state !== 'running') return
      
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0, ctx.currentTime)
      masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02)
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      masterGain.connect(ctx.destination)
      
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = i === 0 ? 'triangle' : 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        osc.connect(masterGain)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + duration + 0.05)
      })
    } catch (e) {
      console.warn('Chord failed:', e)
    }
  }, [])

  // Level up sound - ascending arpeggio
  const levelUp = useCallback(() => {
    if (!isSoundEnabled()) return
    
    try {
      const ctx = getContext()
      if (ctx.state !== 'running') return
      
      const notes = [330, 392, 494, 659]
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.1, ctx.currentTime)
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      masterGain.connect(ctx.destination)
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08)
        osc.connect(masterGain)
        osc.start(ctx.currentTime + i * 0.08)
        osc.stop(ctx.currentTime + i * 0.08 + 0.15)
      })
    } catch (e) {
      console.warn('Level up sound failed:', e)
    }
  }, [])

  // Combo sound - pitch increases with combo
  const comboSound = useCallback((comboLevel) => {
    if (!isSoundEnabled()) return
    
    const baseFreq = 400 + Math.min(comboLevel, 20) * 30
    beep(baseFreq, 0.08, 'square', 0.06)
  }, [beep])

  // Near miss sound
  const nearMiss = useCallback(() => {
    if (!isSoundEnabled()) return
    beep(800, 0.05, 'sine', 0.04)
  }, [beep])

  // Game over sound
  const gameOver = useCallback(() => {
    if (!isSoundEnabled()) return
    chord([196, 147, 98], 0.4, 0.12)
  }, [chord])

  // Achievement sound
  const achievement = useCallback(() => {
    if (!isSoundEnabled()) return
    
    try {
      const ctx = getContext()
      if (ctx.state !== 'running') return
      
      const notes = [523, 659, 784, 1047]
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime)
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      masterGain.connect(ctx.destination)
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
        
        const noteGain = ctx.createGain()
        noteGain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1)
        noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2)
        
        osc.connect(noteGain)
        noteGain.connect(masterGain)
        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + i * 0.1 + 0.25)
      })
    } catch (e) {
      console.warn('Achievement sound failed:', e)
    }
  }, [])

  return { beep, chord, levelUp, comboSound, nearMiss, gameOver, achievement }
}