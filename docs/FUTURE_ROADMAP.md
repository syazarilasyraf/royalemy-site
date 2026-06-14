# RoyaleMY Future Roadmap

This document tracks what is actually built, what is half-built, and what should come next for RoyaleMY. It is written as a decision-making aid: each section ends with a concrete recommendation for the next sprint.

> **Last audited:** 2026-06-14  
> **Scope:** Frontend (React/Vite), Backend (Express/SQLite), Deployment (Docker/JustRunMyApp/Netlify)

---

## Executive Summary

RoyaleMY has evolved from a simple CR-API wrapper into a real community platform. The recent consolidation of the admin area and the generalized notification system are solid foundations. However, several "completed" roadmap items are only partially done, and the public product still has large gaps that matter more to users than backend polish.

**The biggest opportunities right now are:**

1. **Finish State Rankings** — the backend is complete; only the frontend is missing.
2. **Build Player Profiles** — link Hall of Fame entries to a real player page with tournament history.
3. **Complete the Tournament Platform** — brackets/match tracking, auto-promotion from waitlist, and reliable reminder pushes.
4. **Add Social Discovery** — global search, deck comments/trending, shareable links.

The technical debt list is real but mostly invisible to users. Tackle it after the public gaps above are closed, or in parallel when a feature touches the same code.

---

## 1. What Is Actually Shipped

A reality-checked changelog. Items marked ⚠️ are "shipped but flawed"; items marked ❌ are still missing despite earlier claims.

### Recently Completed (2026-06-13)

- ✅ **Consolidated admin area** — New `/admin/*` routes with `AdminLayout`, dashboard, audit trail, logs, and per-module panels.
- ⚠️ **Admin area is not fully isolated** — `TournamentFinder.jsx` still renders inline admin controls when `?admin=` is present (edit cards, promote waitlist, status changes, export). The admin panel exists, but the public page still doubles as one.
- ✅ **Generalized notification system** — `notifications` table replaces `tournament_notifications` with `scope` (tournament/clan/deck/roadmap/global). Site-wide push via `global_push_subscriptions`.
- ✅ **`AdminNotifications.jsx`** — create scoped notifications, filter, delete, resend push.

### Previously Completed (2025-06-09 batches)

- ✅ **Security headers** (`helmet`), authenticated cache clear, rate limiting, XSS sanitization, reduced DB upload limit (10MB).
- ✅ **Database indexes** — `(status, start_date)` on tournaments, `(status, votes DESC, created_at DESC)` on decks.
- ✅ **Frontend code splitting** — initial bundle dropped from ~616KB to ~226KB.
- ✅ **Admin CSV export** — tournament registrations.
- ✅ **Capped in-memory cache** — 500 entries, FIFO eviction.
- ✅ **Graceful shutdown**, `React.memo`, `useMemo`, SW cache size limits.
- ✅ **Request correlation IDs + NDJSON logging** in production.
- ✅ **Admin key in HTTP headers** — `X-Admin-Key` is used by the API client for most calls.
- ⚠️ **Admin key still leaks in URLs** — the admin area propagates the key via `?admin=KEY`, and the backend still accepts `?key=` as a fallback. CSV export uses `?key=` because `window.open` cannot set headers.
- ✅ **Bulk admin operations** — tournaments, clans, decks, roadmap features, state players.
- ✅ **Admin search and filter** — status filters + text search in every admin panel.
- ✅ **Tournament waitlist** — `waitlist_position`/`status`, manual promote from admin and public page.
- ⚠️ **No auto-promotion** when a spot opens or `max_players` increases. Waitlisted players can be stuck until an admin manually promotes them.
- ✅ **Admin audit trail** — `admin_actions` table + `AdminAuditTrail.jsx`.
- ⚠️ **Audit trail does not identify the admin** — `admin_key_hash` column exists but is never populated; only IP is recorded.
- ✅ **Automated tournament reminders** — 5-minute interval checks for 24h and 1h reminders.
- ⚠️ **Reminders only create in-site notifications** — no push is sent. There is also a timezone mismatch (`datetime('now')` UTC vs local `start_date`) and a narrow 1-hour firing window.
- ⚠️ **`server/index.js` refactor** — CR HTTP client and meta-deck builder were moved to `services/`, but the route handlers for players, clans, locations, cards, etc. are still inline. The file is still ~832 lines.
- ✅ **Tournament calendar view** — list/calendar toggle in `TournamentFinder.jsx`.
- ✅ **Docker multi-stage build + healthcheck**.
- ✅ **CI pre-deploy verification** — install + build before Docker push.

---

## 2. What Is Broken or Half-Built

These are the highest-priority fixes because they are visible to users or undermine trust in the platform.

### 2.1 State Rankings — Public UI Is a Placeholder

- **Backend:** Complete. `state_players` table, `server/routes/statePlayers.js`, public list/detail/submit, admin endpoints, duplicate detection.
- **Frontend:** `MYRankings.jsx` renders a hardcoded "🚧 In Progress" message. ~200 lines of CSS for state filters/forms are unused. No component calls the `state_players` API.
- **Admin:** There is **no** `AdminStatePlayers.jsx` and no `/admin/state-players` route, despite full backend support.
- **Data:** Local DB has 0 state players.
- **Impact:** A major community feature is advertised but undeliverable.
- **Recommendation:** Build the state rankings tab and admin panel. This is the quickest high-impact win.

### 2.2 Tournament Waitlist Does Not Auto-Promote

- **Current behavior:** Players are waitlisted when `max_players` is reached. Admins can promote manually.
- **Missing:** Auto-promotion when a registered player is removed or `max_players` is increased.
- **Bug:** Waitlisted players are counted in `participant_count`, so a tournament can look full while registered slots are actually free.
- **Impact:** Admins must micromanage every waitlist; UX is worse than no waitlist.
- **Recommendation:** Add `promoteNextWaitlisted(tournamentId)` and call it after registration deletion and max-players increase. Re-number `waitlist_position` after promotion.

### 2.3 Tournament Reminders Do Not Send Push

- **Current behavior:** `setupTournamentReminders()` creates `notifications` rows at 24h and 1h.
- **Missing:** It never calls `sendPushNotifications()`. The `notified_24h`/`notified_1h` flags are also never reset if `start_date` changes.
- **Bug:** Timezone comparison between SQLite UTC and local server time can fire reminders at the wrong hour or skip them entirely.
- **Impact:** Players who subscribed to push will not get reminder notifications.
- **Recommendation:** Send push via the existing subscription table, widen the firing window (or use a `reminder_job` table), and store all datetimes in UTC.

### 2.4 Admin Key Still in URLs

- **Current behavior:** `AdminLayout` stores/shares the key as `?admin=KEY`. Backend accepts `req.query.key` fallback. CSV export uses `?key=`.
- **Impact:** Key leaks to browser history, server logs, and referrer headers.
- **Recommendation:**
  1. Remove `req.query.key` fallback in `validateAdminKey`.
  2. Store the admin key in `sessionStorage` and provide it via `AdminKeyContext` (already created but unused).
  3. For CSV export, serve the file through a fetch + blob download so the header can be used.

### 2.5 Audit Trail Does Not Identify the Admin

- **Current behavior:** `admin_actions` records action, resource, details, and IP.
- **Missing:** `admin_key_hash` is defined but never inserted.
- **Impact:** You cannot tell which admin key performed a destructive action.
- **Recommendation:** Hash the key with `crypto.createHash('sha256')` and insert it into `admin_key_hash`.

### 2.6 `server/index.js` Is Still Monolithic

- **Current behavior:** ~832 lines. Players, clans, locations, cards, chests, and admin DB endpoints are inline.
- **Impact:** Hard to test, review, and extend.
- **Recommendation:** Extract route modules: `routes/players.js`, `routes/clans.js`, `routes/locations.js`, `routes/cards.js`, `routes/adminDb.js`.

---

## 3. Product Opportunities

Features that extend the platform and are worth doing once the broken/half-built items are fixed.

### 3.1 Tournament Platform (High Impact)

| Feature | Why It Matters | Effort |
|---------|----------------|--------|
| **Tournament brackets / match tracker** | Transforms RoyaleMY from a listing site into a tournament platform. | Large |
| **Automated status transitions** | Move tournaments through `registration_closed` → `live` → `completed` based on deadlines. | Medium |
| **Live push on status change** | Notify subscribers when a tournament goes live. | Small |
| **Tournament filters** | Filter by format, prize, date range, host. | Small |
| **Upcoming events banner** | Show next 3 tournaments on the home page. | Small |

### 3.2 Rankings & Player Identity (High Impact)

| Feature | Why It Matters | Effort |
|---------|----------------|--------|
| **State Rankings completion** | Backend is done; frontend is the blocker. | Medium |
| **Player profile pages** | Combine CR API stats with RoyaleMY tournament history. Link from Hall of Fame. | Medium |
| **Historical ranking snapshots** | Track Malaysian leaderboard trends over time. | Medium |
| **Clan war tracking** | Historical war performance for featured Malaysian clans. | Medium |

### 3.3 Community & Discovery (Medium Impact)

| Feature | Why It Matters | Effort |
|---------|----------------|--------|
| **Global search** | One input to search tournaments, clans, decks, players. | Medium |
| **Deck comments** | Strategy discussions on community decks. | Medium |
| **Trending decks** | Sort by recent vote velocity, not just total votes. | Small |
| **Deck share links** | Copyable URLs and native share for decks. | Small |
| **Tournament share cards / OG images** | Share tournaments on social media with rich previews. | Medium |
| **Notification badge** | Unread count on the header bell (read tracking exists but could be cleaner). | Small |

### 3.4 Admin & Operations (Low User Impact, High Trust)

| Feature | Why It Matters | Effort |
|---------|----------------|--------|
| **Rate limit monitoring UI** | Endpoint exists; add a simple chart/table in `/admin`. | Small |
| **Backup management** | List/download `.db.bak.*` files from admin panel. | Medium |
| **Push subscription viewer** | See global and per-tournament subscription counts. | Small |
| **Content preview** | Show the CR API data fetched at submission time for clans/state players. | Small |
| **Multi-role admin system** | Moderators vs super-admins with granular permissions. | Large |

---

## 4. Technical Debt & Engineering Roadmap

Invisible to users but worth scheduling between feature sprints.

### 4.1 Security

| Issue | Location | Fix |
|-------|----------|-----|
| Admin key in URL query params | `AdminLayout.jsx`, `validateAdminKey`, CSV export | Move key to `sessionStorage` + context; remove query fallback; fetch CSV with header |
| Audit trail lacks admin identity | `admin_actions` inserts across routes | Populate `admin_key_hash` |
| `push_subscriptions` migration drops table | `server/db.js` | Use `ALTER TABLE ADD COLUMN` |

### 4.2 Performance & Reliability

| Issue | Location | Fix |
|-------|----------|-----|
| In-memory cache is FIFO, not LRU | `services/crApi.js` | Switch to `lru-cache`; expose hit/miss metrics |
| No input schema validation | All route files | Adopt `zod` for request bodies |
| Reminder timezone bug | `server/index.js` | Store and compare datetimes in UTC |
| Waitlist count bug | `communityTournaments.js` | Exclude waitlisted players from `participant_count` |

### 4.3 Code Organization

| Issue | Location | Fix |
|-------|----------|-----|
| Monolithic `server/index.js` | `server/index.js` | Extract `routes/players.js`, `routes/clans.js`, `routes/locations.js`, `routes/cards.js`, `routes/adminDb.js` |
| Duplicated `logAdminAction` | Every route file | Move to `services/adminActions.js` or `middleware/` |
| `AdminNotifications.jsx` not memoized | `client/src/admin/AdminNotifications.jsx` | Wrap in `React.memo` |
| `AdminKeyContext` unused | `AdminLayout.jsx` | Use it or remove it |

### 4.4 Database Cleanup

| Issue | Decision Needed |
|-------|-----------------|
| Orphaned columns in `community_tournaments` | `tournament_tag`, `discord_link`, `contact_info`, `notified_24h`, `notified_1h` are unused. Either drop them or document why they are reserved. |
| `idx_logs_timestamp` created then dropped | Harmless; remove the dead code. |
| No test suite | Add unit tests for `services/` and route integration tests before the codebase grows further. |

### 4.5 Documentation

| Document | Issue | Fix |
|----------|-------|-----|
| `README.md` | Still lists old public-page admin URLs (`/tournaments?admin=KEY`) | Update to `/admin/*?admin=KEY` or remove query param docs once header-only |
| `README.md` | Says tournament reminders have no automated logic | Remove; logic exists |
| `PWA.md` | References cache names `v1` while code uses `v5` | Update to current cache names |
| `AGENTS.md` | Says `tournament_notifications` is a related table | Update to `notifications` |

---

## 5. Long-Term Vision (2026 and Beyond)

RoyaleMY should become the default Malaysian Clash Royale community hub: a place where players discover tournaments, track their competitive identity, and find clans and decks that fit the local meta.

### 5.1 Tournament Platform

Move beyond listings to a full tournament operations platform:

- **Bracket/match tracker** for single- and double-elimination tournaments.
- **Self-service organizer tools** so hosts can run small tournaments without admin intervention.
- **Live broadcast integration** (TikTok/YouTube embed + live status).
- **Prize pool tracking and proof-of-payment uploads.**
- **Leaderboard seasons** that aggregate tournament performance into monthly or seasonal rankings.

### 5.2 Player Identity

- **Persistent RoyaleMY player profiles** with tournament history, deck preferences, and state affiliation.
- **Verified player tags** so tournament winners cannot be impersonated.
- **Achievement badges** for participation, wins, and community contributions.

### 5.3 Community Discovery

- **Global search** across all content types.
- **Social sharing** with Open Graph images for tournaments, decks, and player profiles.
- **Deck meta reports** based on community submissions and tournament winners.
- **Clan recruitment board** with requirements and application tracking.

### 5.4 Platform Maturity

- **Multi-role admin and moderation** with granular permissions.
- **Automated moderation** for spam detection and content preview.
- **Analytics dashboard** showing submission trends, approval rates, engagement, and push delivery rates.
- **Background sync / offline submissions** for true PWA reliability.
- **Input schema validation (`zod`)** and a proper test suite.
- **Production-grade cache (`lru-cache`)** with metrics and alerting.

---

## 6. Recommended Next Sprint

If you can only pick a few things, do these in order:

1. **State Rankings frontend + admin panel** — unblock a feature that is already 80% built.
2. **Tournament waitlist auto-promotion** — fix the broken UX of the waitlist feature.
3. **Tournament reminder pushes** — actually deliver the value players subscribed for.
4. **Player profile pages** — connect Hall of Fame to a real identity.
5. **Clean up admin key leakage** — remove `?key=` fallback and move `?admin=` to `sessionStorage`.

These five items close the biggest gaps between "shipped" and "actually works." After that, the next batch should be brackets, global search, and deck comments.

---

## 7. Appendix: Data Safety Notes

Per `AGENTS.md`:

- Schema changes must remain idempotent.
- Never drop tables or columns in production without a migration plan.
- Always back up `roadmap.db` before applying schema changes.
- If adding new tables, use `CREATE TABLE IF NOT EXISTS`.
- If adding columns to existing tables, check existence first with `PRAGMA table_info()`.
