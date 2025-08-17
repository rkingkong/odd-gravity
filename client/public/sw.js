const VERSION = 'obc-sw-v17';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  const keys = await caches.keys(); await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))); await self.clients.claim();
})()); });
const offlineDaily = () => new Response(JSON.stringify({ seed:19700101, modeName:'Offline', gravityFlipEveryMs:3000, obstacleSpeed:3, freezeDurationMs:550 }), { headers:{'Content-Type':'application/json'}});
const offlineLeaderboard = () => new Response(JSON.stringify({ items:[] }), { headers:{'Content-Type':'application/json'}});
self.addEventListener('fetch', e => {
  const { request } = e; const url = new URL(request.url); if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    e.respondWith((async () => { const c=await caches.open(VERSION); const cached=await c.match('/index.html');
      try { const fresh=await fetch(request); c.put('/index.html', fresh.clone()); return fresh; } catch { return cached || new Response('<h1>Offline</h1>', {headers:{'Content-Type':'text/html'}}); }
    })()); return;
  }
  if (url.pathname.startsWith('/api/')) {
    e.respondWith((async () => { try { return await fetch(request); } catch {
      if (url.pathname.startsWith('/api/daily')) return offlineDaily();
      if (url.pathname.startsWith('/api/leaderboard')) return offlineLeaderboard();
      if (url.pathname.startsWith('/api/health')) return new Response(JSON.stringify({ ok:false, offline:true }), { headers:{'Content-Type':'application/json'}});
      throw new Error('offline');
    }})()); return;
  }
  if (['script','style','image','font'].includes(request.destination) || url.pathname.endsWith('.json')) {
    e.respondWith((async () => { const c=await caches.open(VERSION); const cached=await c.match(request);
      if (cached) return cached; try { const res=await fetch(request); c.put(request, res.clone()); return res; } catch { return new Response('', {status:404}); }
    })());
  }
});
