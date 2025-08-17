import { useEffect, useState } from 'react'
const KEY = 'obc_prefs'
const DEFAULT = { audio: true, vibrate: true }

export function readPrefs() {
  try { return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) } }
  catch { return DEFAULT }
}
export function writePrefs(patch) {
  const merged = { ...readPrefs(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(merged))
  return merged
}
export function usePrefs() {
  const [prefs, setPrefs] = useState(readPrefs())
  useEffect(() => { setPrefs(readPrefs()) }, [])
  const update = (patch) => setPrefs(writePrefs(patch))
  return [prefs, update]
}
