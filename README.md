# RoyaleMY 🇲🇾

A fan-made Clash Royale community platform built for Malaysian players. Search players, find clans, discover meta decks, browse community tournaments, and explore Malaysian leaderboards — all in one place.

> **Disclaimer:** This site is not affiliated with, endorsed, sponsored, or specifically approved by Supercell. Clash Royale and all related assets are trademarks of Supercell Oy.

---

## Features

### Player Tools
- **Player Lookup** — Search any player by tag, view profile stats, current deck, and recent battle log with opponent deck links.
- **Smart Deck Finder** — Enter your player tag to see live meta decks matched against your card collection, with compatibility scoring.
- **Deck Stats Analyzer** — Paste any Clash Royale deck link for deep analysis: archetype, elixir distribution, combat strengths/weaknesses, and similar meta decks.

### Clan & Community
- **Clan Finder** — Search clans by name, trophies, or members. Browse featured Malaysian clans and view clan details including River Race.
- **Community Decks** — Browse, submit, and upvote community-built decks. Sort by top rated or trending.
- **Deck Comments** — Discuss strategy and ask questions on community decks.
- **Deck Sharing** — Copy deck links with Open Graph / Twitter Card rich previews.
- **MY Rankings** — Malaysian leaderboards for Path of Legend, Top Clans, and Clan Wars.

### Tournament System
- **Tournament Hub** — Public listing of community tournaments with live countdown timers.
- **Tournament Submission** — Community members submit tournaments for admin approval.
- **Registration System** — Players register with their Clash Royale player tag and an optional TikTok username (no name required).
- **Waitlist** — Automatically join a waitlist when full; auto-promoted when a spot opens.
- **Automated Status Transitions** — Tournaments advance through `registration_open` → `registration_closed` → `live` → `completed` based on dates.
- **Automated Reminders** — In-site and push notifications at 24h and 1h before start.
- **Match Tracker / Brackets** — Admins record match pairings and results round-by-round.
- **Status Workflow** — Full lifecycle: `pending` → `approved` → `registration_open` → `registration_closed` → `live` → `completed`.
- **TikTok Integration** — Organizers can share TikTok username and live stream URL on tournament pages.
- **Results Tracking** — Record 1st, 2nd, and 3rd place winners with prize status tracking.
- **Tournament Archive** — Browse completed tournaments with full results history.
- **Hall of Fame** — Aggregate player stats across tournaments (wins, top-3 finishes, total participations).
- **Push Notifications** — Browser push subscriptions for tournament updates (status changes, winner announcements, reminders).

### Live Tournament Broadcast
- **Browser Source Overlay** — Dedicated `/live/tournament/:id` page optimized for OBS and TikTok Live Studio.
- **Transparent & Compact Modes** — URL parameters for chroma-key and dense layouts.
- **Auto-refreshing Leaderboard** — Polls every 5 seconds and shows top players, hot streak, biggest climber, most crowns, and most active.
- **Battle Validation** — Only counts battles between registered participants during the tournament window; ignores ladder, friendly, clan war, challenge, and other tournament battles.
- **Manual Sync** — Admins can force an immediate battle sync from the tournament admin panel.
- See [`docs/LIVE_OVERLAY.md`](docs/LIVE_OVERLAY.md) for the full overlay guide.

### Platform Features
- **Roadmap** — Public feature suggestion board with voting. Admins can approve, reject, and update status of suggestions.
- **Admin Panel** — Unified admin interface across tournaments, roadmap, community decks, and clans via a single shared key.
- **Admin Logs** — Server diagnostics, request logs, and system info viewer.
- **PWA Support** — Installable on Android, iOS, and desktop with offline caching and service worker updates.
- **In-Site Notifications** — Tournament notification feed with unread counts.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, React Router DOM |
| **Backend** | Express.js, Node.js 20 |
| **Database** | SQLite (`better-sqlite3`), WAL mode |
| **Hosting** | Netlify (frontend), JustRunMyApp (backend) |
| **Deployment** | Docker, GitHub Actions |
| **External APIs** | Clash Royale API |
| **Push Notifications** | Web Push (VAPID) |

---

## Project Structure

```
RoyaleMY/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── components/      # React pages and UI components
│   │   ├── services/api.js  # API client
│   │   ├── utils/           # Deck parser, archetype analyzer, card mapping
│   │   └── data/            # Static card data and deck recommendations
│   ├── public/              # Static assets, PWA manifest, service worker
│   └── dist/                # Build output (Netlify)
├── server/                  # Express backend
│   ├── data/                # Local SQLite database (dev only)
│   ├── routes/              # API route modules
│   ├── db.js                # Database init, schema, prepared statements
│   ├── index.js             # Express server entry
│   └── logger.js            # Structured logging
├── scripts/
│   └── download-cards.ps1   # Card image downloader & cards.json generator
├── .github/workflows/
│   └── deploy-jrnm.yml      # Docker image CI/CD for JustRunMyApp
├── Dockerfile               # Backend Docker image
├── PWA.md                   # PWA caching & update documentation
├── AGENTS.md                # Agent/coder context & data safety rules
└── package.json             # npm workspaces root
```

---

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# Install all workspace dependencies
npm install

# Terminal 1 — Start backend
cd server
npm start

# Terminal 2 — Start frontend dev server
cd client
npm run dev
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`
- Vite proxies `/api` to `localhost:3001` automatically
- Local database is created at `server/data/roadmap.db`

### Health Check
```bash
curl http://localhost:3001/api/health
```

---

## Environment Variables

### Frontend (`client/.env` or Netlify Dashboard)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | **Yes** | Full URL to backend API | `https://your-backend.f.jrnm.app/api` |

### Backend (`server/.env` or JustRunMyApp Dashboard)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CR_API_TOKEN` | **Yes** | Clash Royale API token | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9...` |
| `FRONTEND_URL` | **Yes** | Netlify URL for CORS and share previews | `https://royalemy.com` |
| `ROADMAP_ADMIN_KEY` | **Yes** | Shared secret for admin endpoints | `your-random-secret-key` |
| `DB_DIR` | Yes (prod) | Database directory path | `/data` |
| `VAPID_PUBLIC_KEY` | No* | Web Push public key | `BFCdK...` |
| `VAPID_PRIVATE_KEY` | No* | Web Push private key | `vLRx7...` |
| `VAPID_SUBJECT` | No | Contact email for push | `mailto:admin@royalemy.gg` |
| `CORS_ORIGINS` | No | Additional CORS origins (comma-separated) | `https://deploy-preview-123--royalemy.netlify.app` |
| `PORT` | No | Server port | `3001` |
| `LIVE_TOURNAMENT_SYNC_INTERVAL_MS` | No | Live tournament battle sync interval | `30000` |
| `LIVE_BATTLELOG_CACHE_TTL` | No | Live battle-log cache TTL (seconds) | `30` |
| `LIVE_TOURNAMENT_SYNC_CONCURRENCY` | No | Parallel CR API fetches per sync | `5` |

\* Required only if using browser push notifications for tournaments.

> **Never commit `.env` files to git.** They are excluded by `.gitignore`.

---

## Database

- **Type:** SQLite (`better-sqlite3`)
- **Mode:** WAL (Write-Ahead Logging) enabled
- **Local path:** `server/data/roadmap.db`
- **Production path:** `/data/roadmap.db` (persistent volume on JustRunMyApp)

### Persistence Strategy
- On startup, the server runs `PRAGMA wal_checkpoint(TRUNCATE)` to ensure all committed data is in the main `.db` file.
- The `DB_DIR` environment variable controls the database directory. In production this **must** be `/data` with a persistent volume mounted at the same path.
- `.db-shm` and `.db-wal` files are excluded from git and should never be committed.

### Backup & Restore

**Backup before major changes:**
```bash
cp server/data/roadmap.db "server/data/roadmap-backup-$(date +%Y%m%d-%H%M%S).db"
```

**Restore to production:**
1. Download the backup `roadmap.db`
2. Upload to JustRunMyApp dashboard → Files / Volumes → `/data/`
3. Restart the app

---

## Deployment

### Frontend → Netlify

1. Push code to GitHub `main` branch.
2. Netlify auto-builds from the `client/` directory.
3. Build settings:
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`
4. Set `VITE_API_URL` in Netlify environment variables pointing to your backend.

### Backend → JustRunMyApp

1. Push code to GitHub `main` branch.
2. GitHub Actions (`.github/workflows/deploy-jrnm.yml`) builds and pushes the Docker image to the JustRunMyApp registry.
3. JustRunMyApp pulls the image and starts the container.
4. **Required dashboard configuration:**
   - Environment variable: `DB_DIR=/data`
   - Persistent volume mounted at `/data`

### Data Safety Checklist

Before every deployment, verify:
- [ ] `DB_DIR=/data` is set in JustRunMyApp environment variables
- [ ] Persistent volume is mounted at `/data`
- [ ] Server logs show: `[DB] Database directory: /data`
- [ ] You have a fresh backup of `roadmap.db`
- [ ] `.db-shm` and `.db-wal` are not tracked in git

---

## PWA

RoyaleMY is a Progressive Web App. Users can install it on their home screen for a native app-like experience.

### Installation
- **Android (Chrome/Edge):** Native install prompt or "Add to Home Screen"
- **iOS (Safari):** Share → "Add to Home Screen"
- **Desktop (Chrome/Edge):** Address bar install icon

### Offline Support
- App shell is cached with a stale-while-revalidate strategy.
- Card images and fonts are cached with a cache-first strategy.
- Static card/location data is cached; live player/clan data is network-only.
- Offline fallback page: `offline.html`

### Updating
When deploying new code, bump the cache version in `client/public/sw.js` (e.g., `royalemy-shell-v1` → `royalemy-shell-v2`) to force browsers to fetch updated assets. See `PWA.md` for full details.

---

## Admin Features

Admin panels are accessed from the unified admin area at `/admin?admin=YOUR_ADMIN_KEY`. The key is sent to the API via the `X-Admin-Key` header for most operations.

### Admin Dashboard (`/admin?admin=KEY`)
- View pending counts across tournaments, clans, decks, roadmap features, and state players
- See recent rate-limit hits and top offending IPs
- Quick links to all moderation panels

### Tournament Admin (`/admin/tournaments?admin=KEY`)
- Approve / reject tournament submissions
- Update tournament status through the full lifecycle
- Edit tournament details
- Manage registrations and promote players from the waitlist
- Enter winners (1st, 2nd, 3rd)
- Track prize status (`pending` → `contacted` → `paid`)
- Export registrations to CSV
- Bulk approve / reject / delete / change status
- **⚡ Sync Battles** — Force an immediate live battle sync for overlay updates

### Roadmap Admin (`/admin/roadmap?admin=KEY`)
- View all feature suggestions including pending
- Approve suggestions → `planned`
- Reject suggestions
- Update status to any valid state
- Bulk operations

### Community Deck Admin (`/admin/decks?admin=KEY`)
- Approve / reject deck submissions
- Update deck status
- Delete decks
- Bulk operations

### Clan Admin (`/admin/clans?admin=KEY`)
- Approve / reject community clan submissions
- Update clan status
- Delete clans
- Bulk operations

### Notifications Admin (`/admin/notifications?admin=KEY`)
- Create scoped in-site notifications (tournament, clan, deck, roadmap, global)
- Resend push notifications
- Delete notifications

### Audit Trail (`/admin/audit?admin=KEY`)
- View logged admin actions with resource filter and pagination

### Admin Logs (`/admin/logs?admin=KEY`)
- Query server logs with filtering and pagination
- View server memory, uptime, and version info
- Download or upload the database file

---

## Planned Features

Features likely to be implemented based on existing architecture and community needs:

- **Player Profiles** — Link Hall of Fame entries to a detail page combining CR API stats with RoyaleMY tournament history.
- **Global Search** — One search input across tournaments, clans, decks, and players.
- **Tournament Share Cards** — Rich Open Graph previews for individual tournaments.
- **State Rankings** — Complete the "By State" tab in MY Rankings and add a state-player admin panel. The backend is already implemented (deferred until the community grows).

## Known Limitations

Current unfinished or partially broken functionality:

- **State Rankings** — The "By State" tab renders a placeholder. Backend routes and table exist, but the frontend is not wired up. Intentionally deferred until the community grows.
- **State Players Admin UI** — Backend admin endpoints exist, but there is no frontend admin panel for managing state player submissions.
- **Admin Key in URLs** — The admin area still propagates the key via `?admin=KEY`, which can leak to browser history and referrers.
- **Audit Trail Identity** — The audit trail logs actions but does not identify which admin key performed them.
- **Automated Transition Timezone** — Status transitions and reminder jobs assume tournament dates are in the server's local timezone. If the container is UTC but dates are entered in local time, transitions may be off by several hours.

## Technical Roadmap

Engineering improvements to increase reliability, performance, and maintainability:

- **Security** — Remove the `?key=` admin-key fallback and move the admin key out of the URL entirely (`sessionStorage` + context).
- **Code Organization** — Finish extracting CR proxy routes from `server/index.js` into dedicated route modules; consolidate duplicated `logAdminAction` helpers.
- **Input Validation** — Adopt `zod` for request-body validation across the API.
- **Caching** — Replace the FIFO in-memory cache with `lru-cache` and expose hit/miss metrics.
- **Testing** — Add a test suite for services and route integration; run it in CI.

**Recently completed:** `helmet` security headers, authenticated cache clear, rate limiting on votes/registrations/push subscriptions/submissions, route-level code splitting, composite DB indexes, duplicate detection, admin CSV export, unified admin dashboard and area, capped in-memory cache (500 entries), async log trimming, XSS input sanitization, reduced DB upload limit (10MB), graceful shutdown, dropped unused indexes, `React.memo` on all heavy components, `useMemo` for expensive computations, SW cache size limits, request correlation IDs, NDJSON logging in production, admin key in `X-Admin-Key` header, bulk admin operations, admin search and filter, tournament waitlist with auto-promotion, admin audit trail, automated tournament reminders with push, automated tournament status transitions, tournament match tracker / brackets, Docker multi-stage build + healthcheck, CI pre-deploy verification, deck trending sort, deck comments, deck share links with Open Graph previews, **live tournament broadcast overlay** with battle validation, ranking engine, and OBS/TikTok Live Studio Browser Source support (`/live/tournament/:id`).

See `docs/FUTURE_ROADMAP.md` for the complete audit and ranked recommendations.

---

## Maintainer

- TikTok: [@wandfk](https://www.tiktok.com/@wandfk)
- Platform: RoyaleMY — Malaysian Clash Royale community
