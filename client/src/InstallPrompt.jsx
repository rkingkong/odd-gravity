import React, { useEffect, useState } from 'react'
export default function InstallPrompt(){
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(window.matchMedia?.('(display-mode: standalone)').matches)

  useEffect(()=>{
    const onPrompt = (e)=>{ e.preventDefault(); setDeferred(e) }
    const onChange = ()=> setInstalled(window.matchMedia('(display-mode: standalone)').matches)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', onChange)
    window.addEventListener('appinstalled', ()=>setInstalled(true))
    return ()=>{ window.removeEventListener('beforeinstallprompt', onPrompt) }
  },[])

  if (installed || !deferred) return null
  return (
    <div className="installbar">
      <span className="pill">Install for offline play</span>
      <button className="btn" onClick={async ()=>{
        deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome !== 'dismissed') setDeferred(null)
      }}>Install</button>
      <button className="btn secondary" onClick={()=>setDeferred(null)}>Later</button>
    </div>
  )
}
