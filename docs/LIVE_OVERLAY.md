# RoyaleMY Live Tournament Broadcast Overlay

This guide covers the real-time tournament leaderboard overlay built for streaming on **TikTok Live Studio** and **OBS**.

---

## What it does

The overlay reads tournament data directly from RoyaleMY and displays:

- **Live leaderboard** (top N players by score)
- **Hot Streak** — longest current win streak
- **Biggest Climber** — player who gained the most ranks since the last sync
- **Most Crowns** — highest total crowns earned
- **Most Active** — most matches played

The overlay is a read-only browser page. There are no admin controls, registration buttons, or editing UI visible to viewers.

---

## How scoring works

```
score = (wins × 100) + crowns_earned
```

Wins are always worth more than crowns. Tie-breakers, in order:

1. More wins
2. More crowns earned
3. Fewer crowns conceded
4. More recent battle

---

## Overlay URLs

Replace `:id` with the RoyaleMY tournament ID (the number from the tournament detail page or admin dashboard).

| URL | Use case |
|-----|----------|
| `/live/tournament/:id` | Standard overlay with dark background |
| `/live/tournament/:id?transparent=true` | Transparent background for chroma key / Browser Source |
| `/live/tournament/:id?compact=true` | Smaller, denser layout |
| `/live/tournament/:id?top=5` | Show top 5 instead of top 3 |

You can combine parameters:

```
https://royalemy.com/live/tournament/42?transparent=true&compact=true&top=5
```

---

## Setting up in OBS

1. In OBS, add a new source: **`Browser`**.
2. Set **URL** to your overlay URL, e.g.:
   ```
   https://royalemy.com/live/tournament/42?transparent=true
   ```
3. Set **Width** and **Height** to match your canvas (e.g. `1920` × `1080`).
4. Enable **Shutdown source when not visible** and **Refresh browser when scene becomes active** (optional).
5. The overlay auto-refreshes every **5 seconds**, so you do not need to refresh it manually.

If you used `?transparent=true`, add a **Chroma Key** or **Color Key** filter if needed, or place the source over your existing scene — the background is already transparent.

---

## Setting up in TikTok Live Studio

1. In TikTok Live Studio, click **Add Source** → **Browser**.
2. Paste your overlay URL, e.g.:
   ```
   https://royalemy.com/live/tournament/42?transparent=true
   ```
3. Set the width/height to your stream resolution.
4. Position and resize the layer on your scene.

The overlay will update automatically while the tournament is live.

---

## How battles are tracked

1. Tournament status must be **`live`**.
2. The backend syncs battle logs for all registered participants every **30 seconds** by default.
3. Only valid battles are counted:
   - Must happen during the tournament `start_date` / `end_date` window.
   - Opponent must also be a registered participant.
   - Ladder, friendly, clan war, challenge, and other-tournament battles are ignored.
   - For **Triple Draft** tournaments, only Triple Draft game-mode battles count.
   - Each battle is de-duplicated by a unique ID so it is never counted twice.

---

## Manual sync (for streamers / admins)

The 30-second auto-sync is usually enough, but if you want an update **right now** after a match ends:

1. Go to **Tournament Admin**: `/admin/tournaments?admin=YOUR_ADMIN_KEY`
2. Find the live tournament.
3. Click **⚡ Sync Battles**.
4. The leaderboard API updates immediately; the overlay will pick it up on its next 5-second poll.

You can also call the API directly:

```bash
curl -X POST "https://your-backend.f.jrnm.app/api/tournament/42/sync-battles" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"
```

---

## API endpoints for the overlay

These endpoints are public and read-only:

| Endpoint | Description |
|----------|-------------|
| `GET /api/tournament/:id/leaderboard?limit=N` | Tournament meta + ranked leaderboard + highlights |
| `GET /api/tournament/:id/stats` | Highlights and totals only |
| `GET /api/tournament/:id/participants` | Registered participants |

Admin-only:

| Endpoint | Description |
|----------|-------------|
| `POST /api/tournament/:id/sync-battles` | Force an immediate battle sync |

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVE_TOURNAMENT_SYNC_INTERVAL_MS` | `30000` | How often live tournaments auto-sync battle logs |
| `LIVE_BATTLELOG_CACHE_TTL` | `30` | Cache TTL (seconds) for live battle-log fetches |
| `LIVE_TOURNAMENT_SYNC_CONCURRENCY` | `5` | Parallel CR API battle-log fetches per sync |

These only affect the backend.

---

## Limitations

- The overlay is only as real-time as the **Clash Royale API**. Battles usually appear within seconds after they end, but can occasionally take a minute.
- The 30-second sync interval balances freshness with CR API rate limits. You can lower it via `LIVE_TOURNAMENT_SYNC_INTERVAL_MS`, but keep total requests per minute within CR API limits.
- Manual sync is the fastest way to update immediately after a match.

---

## Future improvements

- **Server-Sent Events (SSE)** — push updates to overlays the instant a sync finishes, removing the 5-second overlay polling delay.
- **Stream alerts** — automatic on-screen notifications for rank changes or new leaders.
- **Featured matches** — highlight specific battles for the stream.
