import { readPrefs } from './prefs'
let ctx
function ensure(){
  if (!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)()
  return ctx
}
export async function resumeAudio(){
  const c = ensure()
  if (c.state === 'suspended') { try{ await c.resume() }catch{} }
}
export function useSfx(){
  const beep = (f=440, t=0.08, type='sine', gain=0.03) => {
    if (!readPrefs().audio) return
    const c = ensure()
    const o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.value = f
    g.gain.value = gain; o.connect(g); g.connect(c.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t)
    o.stop(c.currentTime + t)
  }
  const chord = (freqs=[440,660], t=0.12) => { freqs.forEach((f,i)=>beep(f, t, i? 'triangle':'sine', 0.025)) }
  return { beep, chord }
}
export const vibrate = (pat)=>{ if (!readPrefs().vibrate) return; navigator.vibrate?.(pat) }
