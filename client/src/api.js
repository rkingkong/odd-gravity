const API = {
  async health(){ return (await fetch('/api/health')).json() },
  async register(existingId){ const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(existingId?{playerId:existingId}:{})}); return r.json() },
  async daily(){ return (await fetch('/api/daily')).json() },
  async leaderboard(params={period:'daily',mode:'any',limit:20}){ const r=await fetch('/api/leaderboard?'+new URLSearchParams(params)); return r.json() },
  async score({playerId,score,modeName}){ const r=await fetch('/api/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerId,score,modeName})}); if(!r.ok) throw new Error('score submit failed'); return r.json() }
};
const KEY='obc_score_queue_v1'; const loadQ=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}; const saveQ=q=>localStorage.setItem(KEY,JSON.stringify(q));
export async function flushScoreQueue(playerId){ let q=loadQ(); if(!q.length) return 0; let sent=0; for(let i=0;i<q.length;i++){try{await API.score({playerId,score:q[i].score,modeName:q[i].modeName});sent++}catch{break}} if(sent) saveQ(q.slice(sent)); return sent }
export async function submitScoreWithQueue({playerId,score,modeName}){ try{await API.score({playerId,score,modeName}); return {ok:true,queued:false} }catch{ const q=loadQ(); q.push({score,modeName,ts:Date.now()}); saveQ(q); return {ok:true,queued:true} } }
export default API;
