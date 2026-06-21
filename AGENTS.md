# AGENTS.md — RoyaleMY Project Context

This file provides critical context for any agent (AI or human) working on this codebase. Read this before making changes.

---

## Architecture

```
┌─────────────┐      HTTPS       ┌─────────────────┐      local/volume     ┌──────────┐
│   Netlify   │ ◄──────────────► │  JustRunMyApp   │ ◄───────────────────► │ SQLite   │
│  (Frontend) │   VITE_API_URL   │    (Backend)    │      /data/roadmap.db │  (DB)    │
└─────────────┘                  └─────────────────┘                       └──────────┘
```

- **Frontend:** React + Vite, deployed to Netlify (`royalemy.com` custom domain)
- **Backend:** Express.js, deployed to JustRunMyApp via Docker
- **Database:** SQLite (`better-sqlite3`) on persistent volume at `/data`

**Never assume the backend runs locally.** Production backend is on JustRunMyApp. Local development uses `localhost:3001`.

---

## 🚨 Data Safety Rules (CRITICAL)

### Rule 1: Never modify the database file path logic without understanding the deployment

The database path is determined by `server/db.js`:
```js
const dbDir = process.env.DB_DIR || path.join(__dirname, 'data');
```

| Environment | Expected `DB_DIR` | Database Location |
|-------------|-------------------|-------------------|
| Local dev | (not set) | `server/data/roadmap.db` |
| JustRunMyApp | `/data` | `/data/roadmap.db` (persistent volume) |

**If you change `db.js` path logic, you risk breaking volume persistence.**

### Rule 2: Never commit database files or WAL files to git

The following must remain gitignored and untracked:
- `*.db` (SQLite databases)
- `*.db-shm` (shared memory files)
- `*.db-wal` (write-ahead log files)

If you see these as tracked in git, remove them immediately:
```bash
git rm --cached server/data/*.db-shm server/data/*.db-wal
```

### Rule 3: Always checkpoint WAL on schema changes

The server already runs this on startup:
```js
db.pragma('wal_checkpoint(TRUNCATE)');
```

This ensures all data is in the main `.db` file before the server accepts traffic. Do not remove this.

### Rule 4: Schema migrations must be idempotent

When adding tables or columns, use patterns that work on both fresh and existing databases:

```js
// Good: CREATE TABLE IF NOT EXISTS
db.exec(`CREATE TABLE IF NOT EXISTS new_table (...)`);

// Good: Check before adding column
function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}
if (!columnExists('existing_table', 'new_column')) {
  db.exec(`ALTER TABLE existing_table ADD COLUMN new_column TEXT`);
}
```

**Never drop tables or columns unless explicitly instructed.**

---

## Key Files

| File | Purpose | Change Risk |
|------|---------|-------------|
| `server/db.js` | Database initialization, schema, prepared statements | **HIGH** — affects data persistence |
| `server/index.js` | Express server, API routes, CORS, middleware | Medium |
| `server/routes/communityTournaments.js` | Tournament API | Medium |
| `server/routes/admin.js` | Admin dashboard, logs, audit trail, rate limits | Low |
| `Dockerfile` | Docker image for JustRunMyApp | **HIGH** — affects deployment |
| `client/src/services/api.js` | Frontend API client | Low |
| `client/src/components/TournamentFinder.jsx` | Tournament UI | Low |
| `server/services/tournamentLive.js` | Live battle validation, sync, and ranking engine | Medium |
| `server/routes/tournamentLive.js` | Public live tournament API endpoints | Low |
| `client/src/components/TournamentLiveOverlay.jsx` | Browser Source overlay for OBS/TikTok Live Studio | Low |
| `client/public/_redirects` | Netlify SPA routing | Medium |
| `client/public/sw.js` | Service worker (PWA cache) | Medium |

---

## Deployment Flow

### Frontend (Netlify)
1. Push to GitHub `main` branch
2. Netlify auto-builds from `client/` directory
3. Build command: `npm run build`
4. Publish directory: `client/dist`
5. **Required env var:** `VITE_API_URL=https://YOUR-BACKEND-URL/api`
6. **Live overlay URLs** (Browser Source):
   - Standard: `/live/tournament/:id`
   - Transparent: `/live/tournament/:id?transparent=true`
   - Compact: `/live/tournament/:id?compact=true`

### Backend (JustRunMyApp)
1. Push to GitHub
2. JustRunMyApp pulls code and builds Docker image from `Dockerfile`
3. Container starts with env vars from dashboard
4. **Required:** `DB_DIR=/data` env var + volume mounted at `/data`

### Database Safety on Deploy
- `.db` file is NOT in git (correctly `.gitignore`d)
- Volume at `/data` persists across container rebuilds
- WAL files are checkpointed on startup
- Server logs database path on boot for verification

---

## Tournament System

The platform has a full community tournament system. Do not rebuild it from scratch.

### Status Workflow
```
pending → approved → registration_open → registration_closed → live → completed
```

Plus: `rejected`, `cancelled`

### Public visibility
- `approved`, `registration_open`, `registration_closed`, `live` → visible on public page
- `completed` → visible in archive
- `pending`, `rejected`, `cancelled` → admin only

### Data Model
Tournaments are stored in `community_tournaments` table with these key fields:
- `name`, `description`, `host_name` (organizer)
- `start_date`, `end_date`, `registration_deadline`
- `format`, `max_players`, `prize`
- `rules`, `tournament_password`
- `tiktok_username`, `tiktok_live_url`
- `status`, `prize_status`
- `winner_1st`, `winner_2nd`, `winner_3rd`

### Related Tables
- `tournament_registrations` — player signups
- `notifications` — generalized in-site notifications (scope: tournament/clan/deck/roadmap/global)
- `player_stats` — Hall of Fame foundation (wins, top 3, participations)

---

## Common Pitfalls

### Pitfall 1: Assuming local database = deployed database
Local dev uses `server/data/roadmap.db`. Production uses `/data/roadmap.db` on JustRunMyApp. They are completely separate.

### Pitfall 2: Changing Dockerfile ENV that conflicts with dashboard env vars
The Dockerfile should NOT hardcode `ENV DB_DIR=...` because JustRunMyApp dashboard env vars should control the path.

### Pitfall 3: Forgetting to rebuild client after API changes
If you change API routes or response shapes, rebuild the client before deploying:
```bash
cd client && npm run build
```

### Pitfall 4: SQLite datetime comparisons in SQL
SQLite stores datetimes as text. Comparing `datetime('now')` (UTC) against browser-submitted local datetimes causes timezone bugs. **Use status-based filtering instead of datetime SQL comparisons** for tournament visibility.

### Pitfall 5: Removing fields from forms without updating the INSERT statement
If you remove a form field, update both:
1. The frontend form state
2. The backend `INSERT` statement in `db.js`
3. The API route validation

---

## Testing Database Changes Locally

```bash
cd server
node -e "
const { db, statements } = await import('./db.js');
console.log('Tables:', db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all().map(r => r.name));
console.log('DB path:', db.name);
"
```

---

## Backup & Restore (for humans and agents)

### Before making major schema changes
1. Stop the server
2. Copy `server/data/roadmap.db` to a backup
3. Make your changes
4. Test locally
5. If broken, restore the backup

### Pushing local data to production
1. Stop local server
2. Download production `roadmap.db` from JustRunMyApp dashboard (as backup)
3. Upload your local `server/data/roadmap.db` to JustRunMyApp `/data/`
4. Restart app

---

## Environment Reference

### Frontend (Netlify)
| Var | Example |
|-----|---------|
| `VITE_API_URL` | `https://gitr_jm64t-613.f.jrnm.app/api` |

### Netlify Edge Functions
| File | Purpose |
|------|---------|
| `client/netlify/edge-functions/share-deck.mjs` | Serves rich social previews for deck shares on the public domain |
| `client/netlify.toml` | Edge function routing config |

### Backend (JustRunMyApp)
| Var | Required | Example |
|-----|----------|---------|
| `CR_API_TOKEN` | Yes | JWT from CR developer portal |
| `FRONTEND_URL` | Yes | `https://royalemy.netlify.app` |
| `ROADMAP_ADMIN_KEY` | Yes | Random secret string |
| `DB_DIR` | Yes (prod) | `/data` |
| `VAPID_PUBLIC_KEY` | No* | Web Push public key |
| `VAPID_PRIVATE_KEY` | No* | Web Push private key |
| `VAPID_SUBJECT` | No | Contact email for push |
| `PORT` | No | `3001` |

\* Required only if using browser push notifications.

---

## Contact / Maintainer

- TikTok: [@wandfk](https://www.tiktok.com/@wandfk)
- Platform: RoyaleMY — Malaysian Clash Royale community
