# 🚀 Odd Gravity - Production Updates

This folder contains all the files needed to make Odd Gravity production-ready for the Google Play Store.

## 📁 What's Included

```
production-updates/
├── deploy.sh                    # Automated deployment script
├── index.html                   # Updated HTML with mobile optimizations
├── public/
│   ├── manifest.webmanifest    # Complete PWA manifest
│   ├── privacy.html            # Privacy policy (required for stores)
│   └── sw.js                   # Updated service worker (v20)
└── src/
    ├── ErrorBoundary.jsx       # Crash handler component
    ├── Game-patches.js         # Instructions for Game.jsx changes
    ├── main.jsx                # Updated entry point
    └── styles-additions.css    # Additional CSS for production
```

## 🔧 How to Apply Updates

### Option 1: Automated (Recommended)

```bash
cd /path/to/production-updates
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Create a backup of your current files
- Copy all new files to the right locations
- Append CSS additions
- Optionally build the project

### Option 2: Manual

1. **Copy new files:**
   ```bash
   cp src/ErrorBoundary.jsx /opt/obc/client/src/
   cp src/main.jsx /opt/obc/client/src/
   cp index.html /opt/obc/client/
   cp public/* /opt/obc/client/public/
   ```

2. **Append CSS additions:**
   ```bash
   cat src/styles-additions.css >> /opt/obc/client/src/styles.css
   ```

3. **Apply Game.jsx patches manually** (see below)

4. **Build:**
   ```bash
   cd /opt/obc/client
   npm run build
   ```

## 📝 Manual Game.jsx Changes

Open `src/Game-patches.js` for detailed instructions. The key changes are:

### 1. Add visibility handling (auto-pause when tab hidden)

```javascript
// Inside useEffect, after input handlers:
function handleVisibilityChange() {
  if (document.hidden && gameState === 'playing' && !paused) {
    togglePause()
  }
}
document.addEventListener('visibilitychange', handleVisibilityChange)
```

### 2. Fix cleanup to prevent memory leaks

```javascript
// Update the return/cleanup in useEffect:
return () => {
  isRunning = false
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  
  // Remove ALL event listeners
  canvas.removeEventListener('mousedown', press)
  canvas.removeEventListener('touchstart', touchHandler)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  // ... etc
}
```

### 3. Track animation frame for proper cleanup

```javascript
// At start of useEffect:
let isRunning = true
let animationFrameId = null

// In frame function:
function frame(now) {
  if (!isRunning) return
  // ... game logic ...
  animationFrameId = requestAnimationFrame(frame)
}
```

## ✅ What These Updates Fix

| Issue | Solution |
|-------|----------|
| App crashes show blank screen | ErrorBoundary catches errors gracefully |
| Memory leaks on component unmount | Proper cleanup of event listeners & animation frame |
| Pull-to-refresh interrupts gameplay | CSS `overscroll-behavior: none` |
| Game continues when tab hidden | Auto-pause on visibility change |
| No privacy policy for stores | Complete privacy.html included |
| Basic PWA manifest | Full manifest with icons, screenshots, shortcuts |
| Service worker update issues | Better versioning and update notifications |

## 📱 After Applying Updates

### 1. Update Privacy Policy Email
Edit `public/privacy.html` and replace `privacy@oddgravity.game` with your actual email.

### 2. Create App Icons
You need these icon sizes:
- `icon-512.png` - 512x512 (Play Store)
- `icon-192.png` - 192x192 (PWA)
- `icon-144.png` - 144x144 (Android)
- `icon-96.png` - 96x96 (shortcut)
- `icon-72.png` - 72x72 (tablet)
- `icon-48.png` - 48x48 (small)
- `maskable-512.png` - 512x512 with padding (Android adaptive)
- `maskable-192.png` - 192x192 with padding

**Tip:** Use [Maskable.app](https://maskable.app/) to create maskable icons.

### 3. Create Screenshots
Capture at 1080x1920 resolution:
1. Gameplay showing obstacles
2. A creature encounter
3. Mode selection screen

### 4. Test Thoroughly
- [ ] All 7 game modes work
- [ ] Offline mode works
- [ ] Tab switching pauses game
- [ ] No errors in console
- [ ] Score submission works
- [ ] Leaderboard loads

### 5. Build for Production
```bash
cd /opt/obc/client
npm run build
npm run preview  # Test locally
```

### 6. Generate Android APK
1. Go to https://www.pwabuilder.com
2. Enter your game URL
3. Click "Package for stores" → "Android"
4. Download the APK/AAB

### 7. Submit to Play Store
1. Create account at https://play.google.com/console ($25)
2. Create new app
3. Upload AAB file
4. Fill in store listing
5. Submit for review

## 🐛 Troubleshooting

### Build fails after applying updates
```bash
# Check for syntax errors
npm run lint

# Clear cache and rebuild
rm -rf node_modules/.vite
npm run build
```

### ErrorBoundary not working
Make sure the import is correct in main.jsx:
```javascript
import ErrorBoundary from './ErrorBoundary.jsx'
```

### Service worker not updating
1. Increment VERSION in sw.js
2. Clear browser cache (Ctrl+Shift+R)
3. Unregister old SW in DevTools → Application → Service Workers

### Privacy page returns 404
Make sure `privacy.html` is in the `public/` folder (not `src/`).

## 📞 Support

If you run into issues:
1. Check the browser console for errors
2. Test in incognito mode (no cached SW)
3. Verify all files are in the correct locations

Good luck with the launch! 🎮🚀
