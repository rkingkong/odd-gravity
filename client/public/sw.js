/**
 * Odd Gravity Service Worker
 * Version: v20 - Production Ready
 * 
 * Features:
 * - Offline gameplay support
 * - Cache-first for static assets
 * - Network-first for API calls with offline fallback
 * - Score queuing when offline
 * - Automatic cache cleanup on update
 */

const VERSION = 'obc-sw-v20';

// Files to cache immediately on install
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/privacy.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// API paths that need special handling
const API_PATHS = [
  '/api/health',
  '/api/daily',
  '/api/leaderboard',
  '/api/register',
  '/api/score'
];

// ========== INSTALL ==========
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${VERSION}`);
  
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${VERSION}`);
  
  event.waitUntil(
    (async () => {
      // Delete old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key !== VERSION)
          .map(key => {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          })
      );
      
      // Take control of all pages immediately
      await self.clients.claim();
      
      // Notify all clients about the update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED', version: VERSION });
      });
    })()
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;
  
  // Navigation requests (page loads)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPI(request, url.pathname));
    return;
  }
  
  // Static assets (JS, CSS, images, fonts)
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
});

// ========== HANDLERS ==========

/**
 * Handle navigation requests (page loads)
 * Strategy: Network first, cache fallback
 */
async function handleNavigation(request) {
  const cache = await caches.open(VERSION);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put('/index.html', response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match('/index.html');
    
    if (cached) {
      return cached;
    }
    
    // No cache, return offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Odd Gravity - Offline</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            background: #0b1220;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
          }
          h1 { margin-bottom: 16px; }
          button {
            background: #0ea5e9;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div>
          <h1>📡 You're Offline</h1>
          <p>Please check your internet connection.</p>
          <button onclick="location.reload()">Try Again</button>
        </div>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Handle API requests
 * Strategy: Network first with offline fallbacks
 */
async function handleAPI(request, pathname) {
  try {
    // Try network first
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Network failed, return offline fallback
    console.log(`[SW] API offline fallback: ${pathname}`);
    
    if (pathname.startsWith('/api/health')) {
      return jsonResponse({ ok: false, offline: true });
    }
    
    if (pathname.startsWith('/api/daily')) {
      return jsonResponse({
        seed: Date.now(),
        modeName: 'Classic',
        gravityFlipEveryMs: 3000,
        obstacleSpeed: 3,
        freezeDurationMs: 280,
        offline: true
      });
    }
    
    if (pathname.startsWith('/api/leaderboard')) {
      return jsonResponse({ items: [], offline: true });
    }
    
    if (pathname.startsWith('/api/register')) {
      // Generate local ID for offline play
      const localId = 'offline-' + Math.random().toString(36).slice(2, 10);
      return jsonResponse({ playerId: localId, offline: true });
    }
    
    if (pathname.startsWith('/api/score')) {
      // Score submission failed - client should queue it
      return new Response(
        JSON.stringify({ error: 'offline', queued: true }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Unknown API endpoint
    return new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle static assets (JS, CSS, images, fonts)
 * Strategy: Cache first, network fallback, then cache the response
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(VERSION);
  
  // Check cache first
  const cached = await cache.match(request);
  if (cached) {
    // Return cache immediately, but update in background
    updateCacheInBackground(cache, request);
    return cached;
  }
  
  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed and not in cache
    return new Response('', { status: 404 });
  }
}

// ========== HELPERS ==========

function isStaticAsset(request) {
  const validDestinations = ['script', 'style', 'image', 'font'];
  if (validDestinations.includes(request.destination)) {
    return true;
  }
  
  const url = new URL(request.url);
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2', '.json'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

function jsonResponse(data) {
  return new Response(
    JSON.stringify(data),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

function updateCacheInBackground(cache, request) {
  // Don't await - let it happen in background
  fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    })
    .catch(() => {
      // Ignore background update failures
    });
}

// ========== MESSAGE HANDLING ==========
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'getVersion') {
    event.ports[0].postMessage(VERSION);
  }
});

console.log(`[SW] Loaded ${VERSION}`);
