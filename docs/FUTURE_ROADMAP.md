# RoyaleMY Future Roadmap

This document contains a complete audit of the RoyaleMY codebase, identifying unfinished features, product opportunities, admin gaps, and technical improvements. Every recommendation is grounded in the current architecture, existing database schema, and actual user flows.

---

## 1. Incomplete Features

Features that exist in code but are broken, unreachable, or incomplete.

### 1.1 Player Lookup — Chests Tab
- **Current status:** Partially implemented but broken
- **Evidence:** `PlayerLookup.jsx` contains `fetchChests()` logic and JSX for `activeTab === 'chests'`, but the tab button is missing, `chests` state is undeclared, and `getPlayerUpcomingChests` is not imported from `api.js`
- **What is missing:** Add tab button, declare `const [chests, setChests] = useState([])`, import the API function
- **Estimated effort:** Small (to remove dead code) / Medium (to finish implementation)

### 1.2 MY Rankings — State Rankings
- **Current status:** Placeholder UI only
- **Evidence:** The `states` tab in `MYRankings.jsx` renders a hardcoded 🚧 "In Progress" message. A large block of CSS for state filters and submission forms exists but is unused. The `state_players` table and backend routes exist, but zero frontend code calls them.
- **What is missing:** Wire up the existing `state_players` API to the frontend, build the state filter UI, populate real data
- **Estimated effort:** Medium

### 1.3 Tournament Automated Reminders
- **Current status:** Schema exists, logic missing
- **Evidence:** `community_tournaments` has `notified_24h` and `notified_1h` columns. A prepared statement `updateTournamentNotified` existed until recently but was never called. No cron job or interval logic sends reminders.
- **What is missing:** A scheduled job (or admin-triggered action) that checks upcoming tournaments and sends push notifications / in-site notifications at 24h and 1h before start
- **Estimated effort:** Medium

### 1.4 ArenaDeckRecommender — Dead CSS
- **Current status:** Unused styles
- **Evidence:** `.coming-soon-section`, `.coming-soon-grid`, `.coming-soon-card`, `.coming-soon-badge` classes in `ArenaDeckRecommender.css` are never referenced in the JSX. `.card-fallback` is always `display: none` with no toggle logic.
- **What is missing:** Remove dead CSS or implement the intended features
- **Estimated effort:** Small

### 1.5 ClanFinder — Commented Featured Clans
- **Current status:** Dead data
- **Evidence:** Three commented-out clan objects sit in `featuredMalaysianClans` array in `ClanFinder.jsx`
- **What is missing:** Remove commented code
- **Estimated effort:** Small

---

## 2. Product Opportunities

Features that naturally extend the existing product without requiring architectural rewrites.

### 2.1 Tournament Enhancements

| Feature | Description | Architecture Fit |
|---------|-------------|------------------|
| **Waitlist System** | When `max_players` is reached, new registrants join a waitlist instead of being rejected. Auto-promote if spots open. | Extends existing `tournament_registrations` table with `waitlist_position` or `status` column. |
| **Tournament Brackets** | Simple match tracker for 1v1 tournaments. Admins record match results round-by-round. | New table `tournament_matches(tournament_id, round, player1_tag, player2_tag, winner_tag)`. |
| **Duplicate Detection** | Flag tournaments with identical names or hosts submitting multiple events in short windows. | Check on `POST /api/community-tournaments` before insert. |
| **Automated Status Transitions** | Cron that advances tournament status based on `start_date` and `registration_deadline`. | Uses existing `start_date`, `registration_deadline`, and `status` fields. |
| **Tournament Calendar View** | Switch tournament list from cards to a calendar/grid view for easier discovery. | Pure frontend change using existing `/api/community-tournaments` data. |
| **Registration CSV Export** | Admins can download registrant lists as CSV for use in external bracket tools. | New admin endpoint, reads `tournament_registrations`. |
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
| **Notification Badge** | Show unread notification count on the header bell icon. | Reuses existing `/api/community-tournaments/notifications` endpoint. |

---

## 3. Admin & Moderation Improvements

### 3.1 Critical Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **Admin key in URL query params** | Key leaks to browser history, server logs, and referrer headers. | Move `?key=` to `X-Admin-Key` header or `Authorization: Bearer` scheme. |
| **No audit trail** | Cannot determine which admin performed destructive actions. | Create `admin_actions` table: `id, action, resource, resource_id, details, ip_address, created_at`. |
| **Unauthenticated cache clear** | Any visitor can clear the CR API cache. | Add `validateAdminKeyForEndpoint` to `POST /api/admin/clear-cache`. |
| **No bulk operations** | Approving 10 tournaments requires 10 separate clicks. | Add bulk endpoints: `POST /api/*/admin/bulk` with `{ action, ids[] }`. |
| **Missing State Players admin UI** | Backend routes exist but there is zero frontend admin panel. | Build admin table for `state_players` following the existing deck/clan admin pattern. |

### 3.2 Operational Tools

| Tool | Description | Effort |
|------|-------------|--------|
| **Unified Admin Dashboard** | Single page showing pending counts across all modules + quick links. | Small |
| **Admin Search & Filter** | Search tournaments by name/host, filter by status and date. Extends to clans, decks, and features. | Small |
| **CSV Export** | Export tournament registrations, player stats, and community clans as CSV. | Small |
| **Duplicate Detection** | Flag duplicate clan tags, player tags, or tournament names on submission. | Small |
| **Rate Limit Monitoring** | Admin endpoint showing recent 429 hits and top offending IPs. | Medium |
| **Backup Management** | List, download, and restore specific `.db.bak.*` backups from the admin panel. | Medium |
| **Push Subscription Viewer** | See subscription counts per tournament and send custom broadcasts. | Medium |
| **Content Preview** | For clan/state submissions, show the CR API data that was fetched at submission time. | Small |

---

## 4. Technical Improvements

### 4.1 Performance

| Issue | Location | Recommendation | Effort |
|-------|----------|----------------|--------|
| **Unbounded in-memory cache** | `server/index.js:33` | Cap cache size and implement LRU eviction, or switch to `lru-cache`. | Small |
| **No frontend code splitting** | `client/src/App.jsx` | Use `React.lazy()` + `Suspense` for route-level splitting. Start with `TournamentFinder` and `AdminLogs`. | Small |
| **Cache-busting timestamps defeat SW** | `client/src/services/api.js` | Remove `?_t=${Date.now()}` from tournament endpoints; use `cache: 'no-store'` instead. | Small |
| **Logger COUNT(*) on every write** | `server/logger.js:31` | Move log trimming to a `setInterval` or probabilistic check. | Small |
| **No component memoization** | All large components | Wrap stable sub-components with `React.memo` and expensive computations with `useMemo`. | Small |
| **Unbounded SW caches** | `client/public/sw.js` | Implement cache size limits and prune old entries. | Medium |

### 4.2 Security

| Issue | Location | Recommendation | Effort |
|-------|----------|----------------|--------|
| **Admin key in query params** | All route files + `api.js` | Move to header-based auth. | Medium |
| **Missing security headers** | `server/index.js` | Add `helmet` middleware (CSP, X-Frame-Options, HSTS). | Small |
| **No XSS input sanitization** | `server/routes/community*.js` | Strip/sanitize HTML from user-generated content before storage. | Small |
| **Missing rate limits on votes/registrations** | `server/routes/*.js` | Add `express-rate-limit` to `POST /:id/vote`, `POST /:id/register`, `POST /roadmap/vote`. | Small |
| **Large DB upload limit** | `server/index.js:282` | Reduce `express.raw` limit from 50MB to ~10MB. | Small |
| **No graceful shutdown** | `server/index.js` | Add `SIGTERM`/`SIGINT` handlers to close server and DB connection cleanly. | Small |

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
| **Missing composite indexes** | `server/db.js` | Add `(status, start_date)` on `community_tournaments` and `(status, votes DESC, created_at DESC)` on `community_decks`. | Small |
| **Unused indexes** | `server/db.js` | Drop `idx_state_players_state` and `idx_logs_timestamp`. | Small |
| **Orphaned columns** | `server/db.js` | Drop `tournament_tag`, `discord_link`, `contact_info`, `notified_24h`, `notified_1h` from `community_tournaments` if no feature is planned. | Small |
| **Migration drops table** | `server/db.js:274` | Use `ALTER TABLE ADD COLUMN` instead of dropping `push_subscriptions`. | Small |
| **No explicit DB close** | `server/db.js` | Export `closeDb()` and call during graceful shutdown. | Small |

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

1. **Add security headers** (`helmet`) — Small effort, immediate security improvement.
2. **Rate-limit votes and registrations** — Prevents spam and ballot stuffing.
3. **Authenticate cache clear endpoint** — Close open admin hole.
4. **Add missing DB composite indexes** — Immediate query speedup for tournament and deck listings.
5. **Remove dead code** — Chests tab cleanup, dead CSS, commented clans.
6. **Add frontend code splitting** — Reduce initial bundle size.
7. **Add admin CSV export** — High operational value for tournament organizers.
8. **Add unified admin dashboard** — Single page with pending counts across all modules.
9. **Fix cache-busting timestamps** — Stop defeating the service worker cache.
10. **Add duplicate detection** on submissions — Reduce moderator workload.

### Medium-Term Improvements

1. **Move admin key to headers** — Major security improvement but requires updating every admin route and the frontend API client.
2. **Build State Players frontend** — Completes an existing half-built feature.
3. **Add bulk admin operations** — Bulk approve/reject/delete across all content types.
4. **Add admin search and filter** — Status filters and text search in every admin panel.
5. **Implement tournament waitlist** — Improves registration UX significantly.
6. **Add admin audit trail** — `admin_actions` table for accountability.
7. **Implement automated tournament reminders** — Uses existing schema columns.
8. **Add request correlation IDs + structured logging** — Improves observability.
9. **Refactor monolithic `server/index.js`** — Extract services and reduce file size.
10. **Add tournament calendar view** — Improves tournament discovery.

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
