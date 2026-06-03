# RoyaleMY PWA Documentation

## Overview

RoyaleMY is a Progressive Web App (PWA). Users can install it on their home screen on Android, iOS, and desktop devices for a native app-like experience.

---

## How Installation Works

### Requirements

For a browser to offer installation, the app must meet these criteria:
1. **HTTPS** — Served over a secure connection (Netlify provides this)
2. **Web App Manifest** — `/manifest.webmanifest` with valid `name`, `short_name`, `start_url`, `display`, and icons
3. **Service Worker** — Registered with a fetch handler
4. **Icons** — At least 192x192 and 512x512 PNG icons

### Install Flow

1. The browser detects the manifest and service worker on first visit.
2. On supported browsers (Chrome, Edge, Samsung Internet), the browser fires the `beforeinstallprompt` event.
3. Our app captures this event and shows a floating **"Install RoyaleMY"** button.
4. When the user clicks the button, we call `prompt()` on the stored event, showing the native browser install dialog.
5. After successful installation, the `appinstalled` event fires and the button is hidden.

### Platform-Specific Behavior

| Platform | Install Method |
|----------|---------------|
| Android (Chrome) | Native install prompt or "Add to Home Screen" menu |
| Android (Edge) | Native install prompt |
| iPhone/iPad (Safari) | Share → "Add to Home Screen" (no `beforeinstallprompt`) |
| Desktop Chrome | Address bar install icon or "Install..." menu |
| Desktop Edge | Address bar install icon or Apps menu |

### iOS Notes

iOS Safari does **not** support `beforeinstallprompt`. Users must manually add the app via the Share sheet. We show a mobile-friendly install banner to guide them.

---

## How Caching Works

The service worker (`/sw.js`) uses multiple cache layers:

### 1. App Shell Cache (`royalemy-shell-v1`)

**Contents:**
- `/` (start_url)
- `/index.html`
- `/offline.html`
- `/royalemy.png`

**Strategy:** `stale-while-revalidate`
- Serve from cache immediately for instant loads.
- Fetch updated version in the background and update the cache for next visit.

### 2. Image Cache (`royalemy-images-v1`)

**Contents:**
- Card images (`/cards/*.webp`)
- App icons (`/icons/*.png`)

**Strategy:** `cache-first`
- Serve from cache if available.
- Fetch from network if not cached, then store for offline use.

### 3. Font Cache (`royalemy-fonts-v1`)

**Contents:**
- Google Fonts CSS (`fonts.googleapis.com`)
- Font files (`fonts.gstatic.com`)

**Strategy:** `cache-first`
- Fonts rarely change; cache aggressively.

### 4. API Cache (`royalemy-api-v1`)

**Selective caching based on endpoint:**

| Endpoint | Strategy | Reason |
|----------|----------|--------|
| `/api/cards` | Cache First | Card data changes very rarely (24h server TTL) |
| `/api/locations` | Cache First | Location list is static (24h server TTL) |
| `/api/meta-decks` | Network First | Meta changes over time (30m server TTL) |
| All other `/api/*` | Network Only | Player, clan, and ranking data must be fresh |

### Offline Behavior

- **Navigation:** If the user is offline and requests a page, the service worker serves `offline.html`.
- **API calls:** If an API call fails while offline, the error propagates to the React app, which already handles loading/error states.
- **Cached content:** Previously visited pages, card images, and fonts remain available offline.

---

## How to Update the PWA

When you deploy new code, you must update the service worker so browsers know to fetch the new assets.

### Step 1: Bump Cache Versions

Open `client/public/sw.js` and update the cache name constants:

```js
// Before
const SHELL_CACHE = 'royalemy-shell-v1';

// After
const SHELL_CACHE = 'royalemy-shell-v2';
```

You should bump the version whenever:
- You change `index.html` or the app shell structure
- You want to force a cache refresh for images or fonts

**Note:** You do not need to bump API cache versions unless the caching logic itself changes.

### Step 2: Rebuild and Redeploy

```bash
# Build the client
cd client && npm run build

# Deploy (e.g., to Netlify)
```

### Step 3: Update Behavior

1. The new service worker installs in the background on the user's next visit.
2. It precaches the new app shell assets in a new cache (`v2`).
3. On activation, it deletes the old cache (`v1`).
4. The service worker calls `skipWaiting()`, so it activates immediately instead of waiting for all tabs to close.
5. Users see the updated app on their next navigation or refresh.

### Forcing Immediate Updates

The current setup uses `skipWaiting()` in the install handler and `clients.claim()` in the activate handler. This means updates apply as soon as possible. If you want to notify users that an update is available, you can extend `registerSW.js` to show a "Reload to update" toast.

---

## File Reference

| File | Purpose |
|------|---------|
| `client/public/manifest.webmanifest` | PWA manifest (name, icons, theme, display mode) |
| `client/public/sw.js` | Service worker (caching, offline fallback) |
| `client/public/offline.html` | Offline page shown when no connection |
| `client/public/icons/` | App icons (192, 512, maskable, Apple touch) |
| `client/src/registerSW.js` | Service worker registration logic |
| `client/src/components/InstallButton.jsx` | Floating install button |
| `client/src/components/InstallBanner.jsx` | Dismissible mobile install banner |
| `PWA.md` | This documentation |

---

## Troubleshooting

**Install button not showing?**
- Make sure the site is served over HTTPS.
- Chrome requires a user gesture or sufficient engagement before allowing install.
- Check the DevTools Console for PWA registration errors.

**Offline page not showing?**
- Verify the service worker is registered in Application > Service Workers.
- Check that `offline.html` is listed in the cache under `royalemy-shell-v1`.

**Old assets after deploy?**
- Did you bump the cache version in `sw.js`?
- Try unregistering the service worker in DevTools > Application > Service Workers and refresh.

**iOS status bar color wrong?**
- iOS Safari uses `black-translucent` for the status bar style, which overlays the page content.
- Ensure your header has enough top padding in standalone mode.
