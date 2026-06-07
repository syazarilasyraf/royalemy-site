# RoyaleMY 🇲🇾

A fan-made Clash Royale community platform for Malaysian players.

> **Disclaimer:** This site is not affiliated with, endorsed, sponsored, or specifically approved by Supercell. Clash Royale and all related assets are trademarks of Supercell Oy.

---

## Architecture

| Layer | Platform | URL |
|-------|----------|-----|
| **Frontend** | Netlify | `https://royalemy.netlify.app` |
| **Backend** | JustRunMyApp | `https://gitr_jm64t-613.f.jrnm.app` (example) |
| **Database** | SQLite (persistent volume) | `/data/roadmap.db` |

**Frontend** (`client/`) is a Vite + React SPA built and deployed to Netlify.

**Backend** (`server/`) is an Express.js API server deployed to JustRunMyApp via Docker.

**Database** is SQLite (`better-sqlite3`) stored on a persistent volume at `/data` so data survives redeploys.

---

## ⚠️ Critical: Database Persistence

Data loss has happened before on redeploy. The following configuration **must** be in place:

### JustRunMyApp Configuration

| Setting | Required Value |
|---------|---------------|
| Environment Variable `DB_DIR` | `/data` |
| Persistent Volume Mount | `/data` |

**How it works:**
- The server writes the SQLite database to `/data/roadmap.db`
- JustRunMyApp mounts a persistent volume to `/data`
- This volume survives container restarts and redeploys
- **Never** remove the volume or change `DB_DIR` without migrating the database file first

### What was fixed to prevent data loss

1. **WAL files removed from git** — `.db-shm` and `.db-wal` are no longer tracked
2. **Startup checkpoint** — Server runs `PRAGMA wal_checkpoint(TRUNCATE)` on boot so all committed data is in the main `.db` file
3. **Database path logging** — Server logs `[DB] Database directory: /data` on startup so you can verify the path

---

## Backup & Restore

### Before every major update: BACK UP

**Option A: Download from JustRunMyApp Dashboard**
1. Open JustRunMyApp dashboard
2. Find your app → Files / Volumes
3. Download `roadmap.db` from `/data/`

**Option B: Local development backup**
```bash
# Copy local database to a backup
cp server/data/roadmap.db "server/data/roadmap-backup-$(date +%Y%m%d-%H%M%S).db"
```

### Restore data to deployed server

If data was lost and you have a backup:
1. Go to JustRunMyApp dashboard → Files / Volumes
2. Upload your `roadmap.db` backup to `/data/`
3. Restart the app

### Migrate local data to deployed server

If you developed locally and want to push that data live:
1. Stop your local server
2. Go to JustRunMyApp dashboard
3. Upload `server/data/roadmap.db` to the volume at `/data/`
4. Restart the deployed app
5. Verify: `curl https://YOUR-BACKEND/api/community-tournaments`

---

## Environment Variables

### Frontend (`client/.env` or Netlify dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Full URL to backend API. Example: `https://gitr_jm64t-613.f.jrnm.app/api` |

**Netlify:** Set `VITE_API_URL` in the Netlify dashboard under Site Settings → Environment Variables. The frontend is built with this URL baked in.

### Backend (`server/.env` or JustRunMyApp dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `CR_API_TOKEN` | **Yes** | Clash Royale API token from [developer.clashroyale.com](https://developer.clashroyale.com/) |
| `PORT` | No | Server port. Default: `3001` |
| `FRONTEND_URL` | **Yes** | Netlify URL for CORS. Example: `https://royalemy.netlify.app` |
| `CORS_ORIGINS` | No | Additional allowed origins (comma-separated) |
| `ROADMAP_ADMIN_KEY` | **Yes** | Random secret string for admin panel access |
| `DB_DIR` | No | Database directory path. Default: `server/data/` locally. **Must be `/data` on JustRunMyApp** |

---

## Local Development

```bash
# Install all dependencies
npm run install:all

# Terminal 1: Start backend
cd server
npm start

# Terminal 2: Start frontend dev server
cd client
npm run dev
```

- Backend runs at **http://localhost:3001**
- Frontend runs at **http://localhost:5173**
- Vite dev server proxies `/api` to `localhost:3001` automatically
- Local database is created at `server/data/roadmap.db`

### Health check
```bash
curl http://localhost:3001/api/health
```

---

## Deployment

### Frontend → Netlify

1. Push code to GitHub
2. Netlify auto-deploys from `main` branch
3. Build settings (if manual):
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`
4. Add `VITE_API_URL` environment variable pointing to your JustRunMyApp backend

### Backend → JustRunMyApp

1. Push code to GitHub
2. JustRunMyApp pulls from the `deploy` or `main` branch
3. Docker image is built using the `Dockerfile`
4. **Critical:** Ensure these are configured in JustRunMyApp dashboard:
   - Environment variable: `DB_DIR=/data`
   - Persistent volume mounted at `/data`

---

## Tournament System

The platform includes a full community tournament system:

### Tournament Lifecycle
```
Pending Approval → Approved → Registration Open → Registration Closed → Live → Completed
```

### Features
- **Tournament submission** — Community members submit tournaments for admin approval
- **Registration system** — Players register with name, CR tag, and TikTok username
- **Status workflow** — Admins control progression through the full lifecycle
- **Live countdown** — Public pages show real-time countdown to tournament start
- **TikTok integration** — Organizers can share TikTok username and live stream URL
- **Results tracking** — Champion, runner-up, third place, and prize status tracking
- **Tournament archive** — Completed tournaments with full results history
- **Hall of Fame** — Player stats foundation (wins, top 3 finishes, total participations)

### Admin Panel
Access: `https://royalemy.netlify.app/tournaments?admin=YOUR_ADMIN_KEY`

Admin actions:
- Approve / reject submissions
- Open / close registration
- Start tournament (set Live)
- Complete tournament
- Enter winners (1st, 2nd, 3rd)
- Track prize status (Pending → Contacted → Paid)
- Delete tournaments

### Tournament Formats
1v1 Single Elimination, 1v1 Double Elimination, 1v1 Swiss, 1v1 Round Robin, 1v1 Best of 3, 1v1 Best of 5, 2v2, Triple Elixir, Sudden Death, Ramp Up, Draft Mode, Mirror Mode, Rage Mode, Classic Decks, Mega Deck, 7x Elixir, Infinite Elixir, Lumberjack Rush

---

## API Endpoints

### Core Data
| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Server health check |
| `GET /api/players/{tag}` | Player profile |
| `GET /api/clans?name={name}` | Clan search |
| `GET /api/cards` | All cards |
| `GET /api/meta-decks` | Live meta decks |

### Community Features
| Endpoint | Description |
|----------|-------------|
| `GET /api/roadmap/features` | Roadmap features |
| `POST /api/roadmap/features` | Submit feature |
| `GET /api/community-tournaments` | Active tournaments |
| `GET /api/community-tournaments/archive` | Completed tournaments |
| `POST /api/community-tournaments` | Submit tournament |
| `POST /api/community-tournaments/{id}/register` | Register for tournament |
| `GET /api/community-decks` | Community decks |
| `POST /api/community-decks` | Submit deck |
| `GET /api/community-clans` | Community clans |
| `GET /api/state-players` | State rankings |

### Admin (requires `?key=ADMIN_KEY`)
| Endpoint | Description |
|----------|-------------|
| `GET /api/roadmap/admin/features` | Admin: all features |
| `GET /api/community-tournaments/admin` | Admin: all tournaments |
| `POST /api/admin/clear-cache` | Clear server cache |
| `GET /api/admin/logs` | Server logs |

---

## Project Structure

```
RoyaleMY/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/api.js  # API client
│   │   └── ...
│   ├── public/              # Static assets, PWA manifest, service worker
│   └── dist/                # Build output (deployed to Netlify)
├── server/                  # Express backend
│   ├── data/                # Local SQLite database (dev only)
│   │   └── roadmap.db       # DO NOT commit to git
│   ├── routes/              # API route handlers
│   ├── db.js                # Database initialization & schema
│   ├── index.js             # Express server entry
│   └── .env                 # Backend environment variables
├── Dockerfile               # Docker image for JustRunMyApp
├── README.md                # This file
├── PWA.md                   # PWA documentation
└── package.json             # Workspace root config
```

---

## Data Safety Checklist

Before every deployment, verify:

- [ ] `DB_DIR=/data` is set in JustRunMyApp environment variables
- [ ] Persistent volume is mounted at `/data`
- [ ] Server logs show: `[DB] Database directory: /data`
- [ ] You have a fresh backup of `roadmap.db`
- [ ] `.db-shm` and `.db-wal` are NOT in git (`git ls-files | grep \\.db`)

---

## Troubleshooting

### "Data lost after deploy"
1. Check JustRunMyApp dashboard → ensure volume at `/data` still exists
2. Check server logs → does it say `[DB] Database directory: /data`?
3. If the path is wrong, fix the `DB_DIR` env var and redeploy
4. Restore from backup if available

### "Cannot connect to server"
1. Verify backend is running: `curl YOUR_BACKEND/api/health`
2. Check `FRONTEND_URL` in backend `.env` matches Netlify URL
3. Check `VITE_API_URL` in Netlify matches backend URL

### "CORS error"
1. Ensure `FRONTEND_URL` includes `https://` (not http)
2. Add preview URLs to `CORS_ORIGINS` if using Netlify deploy previews

### "Database locked" or SQLite errors
1. Only one process should access `roadmap.db` at a time
2. On JustRunMyApp, ensure only one container instance is running
3. WAL mode is enabled; do not manually delete `.db-wal` files

---

Created by [@wandfk](https://www.tiktok.com/@wandfk)

Built for Malaysian Clash Royale players 🇲🇾
