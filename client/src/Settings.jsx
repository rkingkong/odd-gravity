import React, { useState } from 'react'
import { usePrefs } from './prefs'

export default function Settings(){
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = usePrefs()
  return (
    <div className="settingsWrap">
      <button className="iconbtn" aria-label="Settings" onClick={()=>setOpen(v=>!v)}>⚙️</button>
      {open && (
        <div className="popover" role="dialog" aria-label="Settings">
          <label className="switch">
            <input type="checkbox" checked={!!prefs.audio} onChange={e=>setPrefs({audio:e.target.checked})}/>
            <span>Sound</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={!!prefs.vibrate} onChange={e=>setPrefs({vibrate:e.target.checked})}/>
            <span>Vibration</span>
          </label>
        </div>
      )}
    </div>
  )
}
