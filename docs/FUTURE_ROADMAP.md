# RoyaleMY Future Roadmap

This document contains a complete audit of the RoyaleMY codebase, identifying unfinished features, product opportunities, admin gaps, and technical improvements. Every recommendation is grounded in the current architecture, existing database schema, and actual user flows.

---

## Changelog

### Recently Completed (2026-06-13)

- ✅ **Consolidated admin area** — Moved all admin pages and inline admin panels into a dedicated `client/src/admin/` directory with a shared `AdminLayout` shell. Added `/admin/tournaments`, `/admin/clans`, `/admin/decks`, `/admin/roadmap`, and `/admin/notifications`. Removed admin-panel rendering from public pages (`/tournaments`, `/clan`, `/roadmap`, `/communitydecks`).
- ✅ **Generalized notification system** — Migrated `tournament_notifications` to a site-wide `notifications` table with `scope` (tournament/clan/deck/roadmap/global), `title`, `message`, `link`, and `resource_id`. Added `global_push_subscriptions` table for site-wide push. Created `/api/notifications` public endpoints and `/api/admin/notifications` admin endpoints. Built `AdminNotifications.jsx` for creating, filtering, deleting, and resending push notifications.

### Recently Completed (2025-06-09)

#### Batch 1

- ✅ **Security headers** — Added `helmet` middleware to Express
- ✅ **Authenticated cache clear** — `POST /api/admin/clear-cache` now requires admin key
- ✅ **Database composite indexes** — Added `(status, start_date)` on tournaments and `(status, votes DESC, created_at DESC)` on decks
- ✅ **Fixed SW cache-busting** — Removed `?_t=${Date.now()}` from tournament API calls
- ✅ **Dead code removal** — Removed broken chests tab, unused CSS, and commented clan data
- ✅ **Rate limiting** — Added limits on tournament registration (10/hr), push subscriptions (10/hr), deck votes (30/hr), and roadmap votes (30/hr)
- ✅ **Duplicate detection** — Prevents duplicate tournament, clan, state player, and deck submissions
- ✅ **Frontend code splitting** — Route-level `React.lazy()` + `Suspense`; initial bundle dropped from **616KB to 226KB**
- ✅ **Admin CSV export** — Export tournament registrations from the admin panel
- ✅ **Unified admin dashboard** — New `/admin` page showing pending counts across all modules

#### Batch 2

- ✅ **Capped in-memory cache** — Max 500 entries with LRU-like eviction
- ✅ **Async log trimming** — Moved `COUNT(*)` from every write to a 5-minute interval
- ✅ **XSS input sanitization** — Strip HTML tags from all user-generated content submissions
- ✅ **Reduced DB upload limit** — 50MB → 10MB
- ✅ **Graceful shutdown** — SIGTERM/SIGINT handlers close server and DB cleanly
- ✅ **Dropped unused indexes** — `idx_state_players_state` and `idx_logs_timestamp`
- ✅ **React.memo** — Wrapped all heavy page components to reduce unnecessary re-renders

#### Batch 3

- ✅ **useMemo for expensive computations** — Memoized elixir distribution, rarity breakdown, battle log processing, tournament filtering
- ✅ **SW cache size limits** — Prune image cache to 200, API cache to 100, shell/font caches to 50 entries
- ✅ **Request correlation IDs** — Generate `crypto.randomUUID()` per request and include in logs
- ✅ **NDJSON logging in production** — Structured JSON output when `NODE_ENV=production`

#### Batch 4 — Medium-Term Improvements (2025-06-09)

- ✅ **Admin key in headers** — Moved `?key=` query param to `X-Admin-Key` header across all admin routes and frontend API client
- ✅ **Bulk admin operations** — Added `/admin/bulk` endpoints for tournaments, clans, decks, state players, and features
- ✅ **Admin search and filter** — Status filters and text search in every admin panel
- ✅ **Tournament waitlist** — Added `waitlist_position` to registrations; auto-waitlist when full; admin promote from waitlist
- ✅ **Admin audit trail** — New `admin_actions` table with resource, action, details, IP, and timestamp
- ✅ **Automated tournament reminders** — Background job checks every 5 minutes for 24h and 1h reminders
- ✅ **Refactored monolithic `server/index.js`** — Extracted CR API proxy to `services/crApi.js` and meta decks to `services/metaDecks.js`
- ✅ **Tournament calendar view** — Toggle between list and calendar grid in tournament discovery
- ✅ **Docker multi-stage build + health checks** — Slimmer production image with `HEALTHCHECK` instruction
- ✅ **CI pre-deploy verification** — Added install and build steps before Docker push; removed `--no-cache`

---

## 1. Incomplete Features

Features that exist in code but are broken, unreachable, or incomplete.

### 1.1 MY Rankings — State Rankings
- **Current status:** Placeholder UI only
- **Evidence:** The `states` tab in `MYRankings.jsx` renders a hardcoded 🚧 "In Progress" message. A large block of CSS for state filters and submission forms exists but is unused. The `state_players` table and backend routes exist, but zero frontend code calls them.
- **What is missing:** Wire up the existing `state_players` API to the frontend, build the state filter UI, populate real data
- **Estimated effort:** Medium

### 1.2 Tournament Automated Reminders
- **Current status:** Schema exists, logic missing
- **Evidence:** `community_tournaments` has `notified_24h` and `notified_1h` columns. No cron job or interval logic sends reminders.
- **What is missing:** A scheduled job (or admin-triggered action) that checks upcoming tournaments and sends push notifications / in-site notifications at 24h and 1h before start
- **Estimated effort:** Medium

---

## 2. Product Opportunities

Features that naturally extend the existing product without requiring architectural rewrites.

### 2.1 Tournament Enhancements

| Feature | Description | Architecture Fit |
|---------|-------------|------------------|
| **Waitlist System** | When `max_players` is reached, new registrants join a waitlist instead of being rejected. Auto-promote if spots open. | Extends existing `tournament_registrations` table with `waitlist_position` or `status` column. |
| **Tournament Brackets** | Simple match tracker for 1v1 tournaments. Admins record match results round-by-round. | New table `tournament_matches(tournament_id, round, player1_tag, player2_tag, winner_tag)`. |
| **Automated Status Transitions** | Cron that advances tournament status based on `start_date` and `registration_deadline`. | Uses existing `start_date`, `registration_deadline`, and `status` fields. |
| **Tournament Calendar View** | Switch tournament list from cards to a calendar/grid view for easier discovery. | Pure frontend change using existing `/api/community-tournaments` data. |
| **Tournament Countdown Push** | Auto-send push notification when a tournament goes live. | Reuses existing push subscription infrastructure. |

### 2.2 Ranking & Statistics Enhancements

| Feature | Description | Architecture Fit |
|---------|-------------|------------------|
| **State Rankings Completion** | Finish the existing stub by wiring `state_players` table to the frontend. | Backend already exists; needs frontend implementation. |
| **Player Profile Pages** | Link Hall of Fame entries to a player detail page showing tournament history. | Reuses `player_stats` + `tournament_registrations` + `community_tournaments`. |
| **Historical Rankings Snapshots** | Periodically snapshot Malaysian leaderboards to show "rising/falling" trends. | New table `ranking_snapshots(location_id, type, data, captured_at)`. |
| **Clan War Tracking** | Track featured Malaysian clans' war performance over time. | Extend `community_clans` with war snapshot data or new table. |

### 2.3 Community Features

| Feature | Description | Architecture Fit |
|---------|-------------|------------------|
| **Deck Comments** | Allow users to comment on community decks with strategy tips. | New table `deck_comments(deck_id, author_name, comment, created_at)`. |
| **Deck Share Links** | Generate shareable URLs for specific community decks. | Pure frontend using existing deck ID routes. |
| **Tournament Share Cards** | Generate Open Graph images or shareable links for tournaments. | Frontend meta tags + backend optional OG image generation. |
| **Trending Decks** | Sort community decks by "trending" (recent votes + velocity) instead of just total votes. | New computed sort or cached score in `community_decks`. |
| **Player Tag Search in Tournaments** | Search all tournaments to see where a specific player tag has registered. | Query `tournament_registrations` by `player_tag`. |

### 2.4 Discovery & Quality of Life

| Feature | Description | Architecture Fit |
|---------|-------------|------------------|
| **Global Search** | Search across tournaments, clans, decks, and players from one input. | Combines existing APIs; frontend-only aggregation. |
| **Tournament Filters** | Filter by format, prize type, date range, or host name. | Add query params to existing `GET /api/community-tournaments`. |
| **Deck Filters** | Filter by archetype, average elixir, or card inclusion. | Add query params to existing `GET /api/community-decks`. |
| **Upcoming Events Banner** | Highlight next 3 upcoming tournaments on the home page. | Reuses existing `/api/community-tournaments` data. |
| **Notification Badge** | Show unread notification count on the header bell icon. | Reuses `/api/notifications` endpoint with read tracking per endpoint. |

---

## 3. Admin & Moderation Improvements

### 3.1 Critical Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **Admin key in URL query params** | Key leaks to browser history, server logs, and referrer headers. | Move `?key=` to `X-Admin-Key` header or `Authorization: Bearer` scheme. |
| **No audit trail** | Cannot determine which admin performed destructive actions. | Create `admin_actions` table: `id, action, resource, resource_id, details, ip_address, created_at`. |
| **No bulk operations** | Approving 10 tournaments requires 10 separate clicks. | Add bulk endpoints: `POST /api/*/admin/bulk` with `{ action, ids[] }`. |
| **Missing State Players admin UI** | Backend routes exist but there is zero frontend admin panel. | Build admin table for `state_players` following the existing deck/clan admin pattern. |

### 3.2 Operational Tools

| Tool | Description | Effort |
|------|-------------|--------|
| **Admin Search & Filter** | Search tournaments by name/host, filter by status and date. Extends to clans, decks, and features. | Small |
| **Rate Limit Monitoring** | Admin endpoint showing recent 429 hits and top offending IPs. | Medium |
| **Backup Management** | List, download, and restore specific `.db.bak.*` backups from the admin panel. | Medium |
| **Push Subscription Viewer** | See subscription counts per tournament and send custom site-wide broadcasts from `/admin/notifications`. | Medium |
| **Content Preview** | For clan/state submissions, show the CR API data that was fetched at submission time. | Small |

---

## 4. Technical Improvements

### 4.1 Performance

_No remaining quick wins in this category._

### 4.2 Security

| Issue | Location | Recommendation | Effort |
|-------|----------|----------------|--------|
| **Admin key in query params** | All route files + `api.js` | Move to header-based auth. | Medium |

### 4.3 API & Code Organization

| Issue | Location | Recommendation | Effort |
|-------|----------|----------------|--------|
| **Monolithic server entry** | `server/index.js` (1,043 lines) | Extract CR proxy to `services/crApi.js`, meta-decks to `services/metaDecks.js`. | Medium |
| **Duplicated middleware** | Every route file | Extract `validateAdminKey`, `getAdminKey`, `sanitizeTag` to `middleware/auth.js`. | Small |
| **No input schema validation** | All route files | Adopt `zod` for request body validation. | Medium |
| **Missing request correlation IDs** | `server/logger.js` | Generate a request ID in Express middleware and include it in all logs. | Small |
| **No structured JSON logging** | `server/logger.js` | Output NDJSON in production for easier aggregation. | Small |

### 4.4 Database

| Issue | Location | Recommendation | Effort |
|-------|----------|----------------|--------|
| **Orphaned columns** | `server/db.js` | Drop `tournament_tag`, `discord_link`, `contact_info`, `notified_24h`, `notified_1h` from `community_tournaments` if no feature is planned. | Small |
| **Migration drops table** | `server/db.js:274` | Use `ALTER TABLE ADD COLUMN` instead of dropping `push_subscriptions`. | Small |

### 4.5 Deployment

| Issue | Location | Recommendation | Effort |
|-------|----------|----------------|--------|
| **Inefficient Docker image** | `Dockerfile` | Switch to multi-stage build or use `npm ci --omit=dev`. Add missing `.dockerignore` entries. | Small |
| **No Docker health check** | `Dockerfile` | Add `HEALTHCHECK` instruction hitting `/api/health`. | Small |
| **CI builds without cache** | `.github/workflows/deploy-jrnm.yml` | Remove `--no-cache` from Docker build. | Small |
| **No pre-deploy verification** | `.github/workflows/deploy-jrnm.yml` | Add a build/test step before pushing the image. | Small |

---

## 5. Prioritization

### High Impact / Low Effort (Quick Wins)

_All quick wins from the roadmap audit have been implemented._

The remaining items are medium-term or long-term features. See below.

### Medium-Term Improvements

1. ✅ **Move admin key to headers** — Major security improvement but requires updating every admin route and the frontend API client.
2. ~~Build State Players frontend~~ — Skipped per request.
3. ✅ **Add bulk admin operations** — Bulk approve/reject/delete across all content types.
4. ✅ **Add admin search and filter** — Status filters and text search in every admin panel.
5. ✅ **Implement tournament waitlist** — Improves registration UX significantly.
6. ✅ **Add admin audit trail** — `admin_actions` table for accountability.
7. ✅ **Implement automated tournament reminders** — Uses existing schema columns.
8. ✅ **Add request correlation IDs + structured logging** — Improves observability.
9. ✅ **Refactor monolithic `server/index.js`** — Extract services and reduce file size.
10. ✅ **Add tournament calendar view** — Improves tournament discovery.

### Long-Term Vision

1. **Tournament bracket/match tracker** — Transforms RoyaleMY from a listing site into a tournament platform.
2. **Player profiles with tournament history** — Links Hall of Fame to player lookup.
3. **Historical ranking snapshots** — Trend analysis for Malaysian competitive scene.
4. **Background sync for offline submissions** — True offline support in the PWA.
5. **Analytics dashboard for admins** — Submission trends, approval rates, engagement metrics.
6. **Multi-role admin system** — Moderators vs super-admins with granular permissions.
7. **Content preview and spam filtering** — Automated moderation to reduce manual work.
8. **Switch to `lru-cache` + add cache metrics** — Production-grade caching with observability.
9. **Input schema validation with `zod`** — Type-safe API contracts across the stack.
10. **Docker multi-stage build + health checks** — Production-grade deployment pipeline.

---

## 6. Appendix: Data Safety Notes

- Schema changes must remain idempotent per `AGENTS.md`.
- Never drop tables or columns in production without a migration plan.
- Always back up `roadmap.db` before applying schema changes.
- If adding new tables, use `CREATE TABLE IF NOT EXISTS`.
- If adding columns to existing tables, check existence first with `PRAGMA table_info()`.
