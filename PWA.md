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

The service worker (`/sw.js`) is built from `client/src/sw.js` using Workbox
via `vite-plugin-pwa` (`injectManifest`). It uses several runtime cache layers
in addition to the Workbox precache for the app shell.

### 1. App Shell (Workbox Precache)

The build step injects a content-hashed manifest of the build assets
(`index.html`, JS/CSS chunks, `offline.html`, `royalemy.png`, etc.). Each
deploy produces a new hash, so browsers automatically fetch the new app shell.
There is no need to manually bump a cache version.

### 2. Image Cache (`images`)

**Contents:**
- Card images (`/cards/*.webp`)
- App icons (`/icons/*.png`)

**Strategy:** `cache-first`
- Serve from cache if available.
- Fetch from network if not cached, then store for offline use.

### 3. Font Cache (`fonts`)

**Contents:**
- Google Fonts CSS (`fonts.googleapis.com`)
- Font files (`fonts.gstatic.com`)

**Strategy:** `cache-first`
- Fonts rarely change; cache aggressively.

### 4. API Cache

**Selective caching based on endpoint:**

| Endpoint | Strategy | Reason |
|----------|----------|--------|
| `/api/cards` | Cache First | Card data changes very rarely (24h server TTL) |
| `/api/locations` | Network First | Location list is mostly static but should refresh when online |
| `/api/meta-decks` | Network First | Meta changes over time (30m server TTL) |
| All other `/api/*` | Network Only | Player, clan, and ranking data must be fresh |

### JS/CSS Bundles

**Strategy:** `network-first`
- Always fetch the latest bundles from the network.
- Cache for offline fallback only.

### Offline Behavior

- **Navigation:** If the user is offline and requests a page, the service worker serves `offline.html`.
- **API calls:** If an API call fails while offline, the error propagates to the React app, which already handles loading/error states.
- **Cached content:** Previously visited pages, card images, and fonts remain available offline.

---

## How to Update the PWA

When you deploy new code, the service worker will automatically detect the new
`sw.js` file on the user's next visit and install it in the background.

### Update Behavior

1. The new service worker installs in the background on the user's next visit.
2. `vite-plugin-pwa` injects a content-hashed precache manifest, so the new
   worker caches the updated app shell and static assets automatically.
3. `cleanupOutdatedCaches()` removes outdated Workbox precaches; the new
   worker also deletes legacy `royalemy-*` caches from the old hand-rolled
   service worker on activation.
4. The service worker calls `skipWaiting()`, so it activates immediately
   instead of waiting for all tabs to close.
5. Because the app shell and JS/CSS use a **network-first** strategy, online
   users always fetch the latest code.
6. If a new service worker is installed while the user is actively using the
   app, an **"A new version of RoyaleMY is available"** prompt appears with a
   **Refresh now** button.

### Rebuild and Redeploy

```bash
# Build the client
cd client && npm run build

# Deploy (e.g., to Netlify)
```

---

## File Reference

| File | Purpose |
|------|---------|
| `client/public/manifest.webmanifest` | PWA manifest (name, icons, theme, display mode) |
| `client/src/sw.js` | Service worker source (caching, offline fallback, push notifications) |
| `client/public/offline.html` | Offline page shown when no connection |
| `client/public/icons/` | App icons (192, 512, maskable, Apple touch) |
| `client/src/registerSW.js` | Service worker registration logic |
| `client/src/components/InstallButton.jsx` | Floating install button |
| `client/src/components/InstallBanner.jsx` | Dismissible mobile install banner |
| `client/src/components/UpdatePrompt.jsx` | "Refresh now" prompt shown when a new version is available |
| `PWA.md` | This documentation |

---

## Troubleshooting

**Install button not showing?**
- Make sure the site is served over HTTPS.
- Chrome requires a user gesture or sufficient engagement before allowing install.
- Check the DevTools Console for PWA registration errors.

**Offline page not showing?**
- Verify the service worker is registered in Application > Service Workers.
- Check that `offline.html` is listed in the Workbox precache under `workbox-precache-v2-...`.

**Old assets after deploy?**
- The app shell and JS/CSS use network-first, so online users should get the latest code immediately.
- If a user still sees old assets, they may be offline or the service worker failed to update. Ask them to refresh, or unregister the service worker in DevTools > Application > Service Workers and refresh.

**iOS status bar color wrong?**
- iOS Safari uses `black-translucent` for the status bar style, which overlays the page content.
- Ensure your header has enough top padding in standalone mode.
