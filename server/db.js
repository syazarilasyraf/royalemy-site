import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DB_DIR || path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'roadmap.db');

// Ensure database directory exists (needed for persistent volume mounts)
fs.mkdirSync(dbDir, { recursive: true });

console.log(`[DB] ==========================================`);
console.log(`[DB] DB_DIR env var: ${process.env.DB_DIR || '(not set)'}`);
console.log(`[DB] Database directory: ${dbDir}`);
console.log(`[DB] Database file: ${dbPath}`);
console.log(`[DB] File exists before open: ${fs.existsSync(dbPath)}`);

// Search for any .db files on relevant paths to detect misconfigurations
// Only checks expected app paths, NOT the entire filesystem
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'logs']);
function findDbFiles(dir, depth = 0) {
  if (depth > 2) return [];
  const found = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith('.db')) {
        const stat = fs.statSync(fullPath);
        found.push({ path: fullPath, size: stat.size, modified: stat.mtime.toISOString() });
      } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
        found.push(...findDbFiles(fullPath, depth + 1));
      }
    }
  } catch (e) {
    // permission denied or directory doesn't exist
  }
  return found;
}

// Only scan paths that are relevant to this application
const relevantPaths = [
  dbDir,
  path.join(__dirname, 'data'),
  '/data',
  '/app',
  '/app/server/data',
  process.cwd(),
  __dirname,
].filter(Boolean);

const uniqueRoots = [...new Set(relevantPaths.map(p => path.resolve(p)))];
const allDbFiles = [];
const seenPaths = new Set();
for (const root of uniqueRoots) {
  if (fs.existsSync(root)) {
    for (const file of findDbFiles(root)) {
      const normalized = path.resolve(file.path);
      if (!seenPaths.has(normalized)) {
        seenPaths.add(normalized);
        allDbFiles.push(file);
      }
    }
  }
}

if (allDbFiles.length === 0) {
  console.log(`[DB] No .db files found on filesystem`);
} else {
  console.log(`[DB] Found ${allDbFiles.length} .db file(s) on filesystem:`);
  for (const f of allDbFiles) {
    console.log(`[DB]   - ${f.path} (${f.size} bytes, modified: ${f.modified})`);
  }
}

const db = new Database(dbPath);

console.log(`[DB] Database opened successfully`);
console.log(`[DB] ==========================================`);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Checkpoint any pending WAL data into the main database file on startup.
// This ensures data is not trapped in transient WAL files that can be lost
db.pragma('wal_checkpoint(TRUNCATE)');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    votes INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    voter_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feature_id, voter_id)
  );

  CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
  CREATE INDEX IF NOT EXISTS idx_votes_feature ON votes(feature_id);

  CREATE TABLE IF NOT EXISTS community_tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    host_name TEXT NOT NULL,
    tournament_tag TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    registration_deadline DATETIME,
    format TEXT DEFAULT '1v1',
    max_players INTEGER,
    prize TEXT,
    discord_link TEXT,
    contact_info TEXT,
    tournament_password TEXT,
    rules TEXT,
    tiktok_username TEXT,
    tiktok_live_url TEXT,
    winner_1st TEXT,
    winner_2nd TEXT,
    winner_3rd TEXT,
    prize_status TEXT DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'pending',
    notified_24h INTEGER NOT NULL DEFAULT 0,
    notified_1h INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tournaments_status ON community_tournaments(status);
  CREATE INDEX IF NOT EXISTS idx_tournaments_start ON community_tournaments(start_date);
  CREATE INDEX IF NOT EXISTS idx_tournaments_status_start ON community_tournaments(status, start_date);

  CREATE TABLE IF NOT EXISTS tournament_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES community_tournaments(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    player_tag TEXT NOT NULL,
    tiktok_username TEXT,
    status TEXT NOT NULL DEFAULT 'registered',
    waitlist_position INTEGER,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, player_tag)
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON tournament_registrations(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_player ON tournament_registrations(player_tag);

  CREATE TABLE IF NOT EXISTS tournament_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES community_tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 1,
    match_number INTEGER NOT NULL DEFAULT 1,
    player1_tag TEXT NOT NULL,
    player2_tag TEXT NOT NULL,
    player1_name TEXT,
    player2_name TEXT,
    winner_tag TEXT,
    player1_score INTEGER,
    player2_score INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, round, match_number)
  );

  CREATE INDEX IF NOT EXISTS idx_matches_tournament ON tournament_matches(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON tournament_matches(tournament_id, round);

  CREATE TABLE IF NOT EXISTS tournament_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER REFERENCES community_tournaments(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_tournament ON tournament_notifications(tournament_id);

  -- Generalized site-wide notifications (replaces tournament_notifications)
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL DEFAULT 'tournament',
    type TEXT NOT NULL,
    title TEXT,
    message TEXT NOT NULL,
    link TEXT,
    tournament_id INTEGER REFERENCES community_tournaments(id) ON DELETE CASCADE,
    resource_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_scope ON notifications(scope);
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_tournament_id ON notifications(tournament_id);

  CREATE TABLE IF NOT EXISTS notification_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, endpoint)
  );

  CREATE INDEX IF NOT EXISTS idx_notification_reads_endpoint ON notification_reads(endpoint);
  CREATE INDEX IF NOT EXISTS idx_notification_reads_notification ON notification_reads(notification_id);

  CREATE TABLE IF NOT EXISTS player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_tag TEXT NOT NULL UNIQUE,
    player_name TEXT NOT NULL,
    tournament_wins INTEGER NOT NULL DEFAULT 0,
    top_3_finishes INTEGER NOT NULL DEFAULT 0,
    total_participations INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_player_stats_tag ON player_stats(player_tag);

  CREATE TABLE IF NOT EXISTS community_clans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    clan_tag TEXT NOT NULL,
    description TEXT,
    leader_name TEXT NOT NULL,
    discord_link TEXT,
    trophy_requirement INTEGER,
    members_count INTEGER,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_clans_status ON community_clans(status);

  CREATE TABLE IF NOT EXISTS state_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_tag TEXT NOT NULL,
    state_name TEXT NOT NULL,
    submitter_name TEXT,
    trophies INTEGER,
    rank INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_state_players_status ON state_players(status);
  CREATE INDEX IF NOT EXISTS idx_state_players_state ON state_players(state_name);

  CREATE TABLE IF NOT EXISTS community_decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_link TEXT NOT NULL,
    card_ids TEXT NOT NULL,
    author_name TEXT,
    description TEXT,
    avg_elixir REAL,
    tags TEXT,
    votes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_community_decks_status ON community_decks(status);
  CREATE INDEX IF NOT EXISTS idx_decks_status_votes ON community_decks(status, votes DESC, created_at DESC);

  CREATE TABLE IF NOT EXISTS deck_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deck_id) REFERENCES community_decks(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_deck_comments_deck_id ON deck_comments(deck_id);

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

  CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id INTEGER,
    details TEXT,
    ip_address TEXT,
    admin_key_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_admin_actions_resource ON admin_actions(resource);
  CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

  -- Live tournament broadcast system
  CREATE TABLE IF NOT EXISTS tournament_battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES community_tournaments(id) ON DELETE CASCADE,
    battle_id TEXT NOT NULL,
    player1_tag TEXT NOT NULL,
    player2_tag TEXT NOT NULL,
    battle_time DATETIME NOT NULL,
    player1_crowns INTEGER NOT NULL DEFAULT 0,
    player2_crowns INTEGER NOT NULL DEFAULT 0,
    winner_tag TEXT,
    game_mode TEXT,
    battle_type TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, battle_id)
  );

  CREATE INDEX IF NOT EXISTS idx_tournament_battles_tournament ON tournament_battles(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_tournament_battles_battle_id ON tournament_battles(tournament_id, battle_id);
  CREATE INDEX IF NOT EXISTS idx_tournament_battles_player1 ON tournament_battles(tournament_id, player1_tag);
  CREATE INDEX IF NOT EXISTS idx_tournament_battles_player2 ON tournament_battles(tournament_id, player2_tag);
  CREATE INDEX IF NOT EXISTS idx_tournament_battles_time ON tournament_battles(tournament_id, battle_time);

  CREATE TABLE IF NOT EXISTS tournament_live_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES community_tournaments(id) ON DELETE CASCADE,
    player_tag TEXT NOT NULL,
    player_name TEXT,
    rank INTEGER NOT NULL DEFAULT 0,
    previous_rank INTEGER,
    rank_change INTEGER DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    matches_played INTEGER NOT NULL DEFAULT 0,
    crowns_earned INTEGER NOT NULL DEFAULT 0,
    crowns_conceded INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    last_battle_time DATETIME,
    elo_rating INTEGER,
    season_id INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, player_tag)
  );

  CREATE INDEX IF NOT EXISTS idx_live_rankings_tournament ON tournament_live_rankings(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_live_rankings_rank ON tournament_live_rankings(tournament_id, rank);
  CREATE INDEX IF NOT EXISTS idx_live_rankings_player ON tournament_live_rankings(tournament_id, player_tag);
`);

// Drop unused indexes from existing databases
// (Safe — indexes can be recreated if needed; no data is lost)
db.exec(`DROP INDEX IF EXISTS idx_state_players_state`);
db.exec(`DROP INDEX IF EXISTS idx_logs_timestamp`);

// Migration: add new columns if they don't exist (idempotent)
function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

const registrationCols = [
  { name: 'status', type: 'TEXT DEFAULT \'registered\'' },
  { name: 'waitlist_position', type: 'INTEGER' }
];

for (const col of registrationCols) {
  if (!columnExists('tournament_registrations', col.name)) {
    db.exec(`ALTER TABLE tournament_registrations ADD COLUMN ${col.name} ${col.type}`);
  }
}

const tournamentCols = [
  { name: 'registration_deadline', type: 'DATETIME' },
  { name: 'tournament_password', type: 'TEXT' },
  { name: 'rules', type: 'TEXT' },
  { name: 'tiktok_username', type: 'TEXT' },
  { name: 'tiktok_live_url', type: 'TEXT' },
  { name: 'winner_1st', type: 'TEXT' },
  { name: 'winner_2nd', type: 'TEXT' },
  { name: 'winner_3rd', type: 'TEXT' },
  { name: 'prize_status', type: 'TEXT DEFAULT \'pending\'' },
  { name: 'last_battle_sync_at', type: 'DATETIME' },
];

for (const col of tournamentCols) {
  if (!columnExists('community_tournaments', col.name)) {
    db.exec(`ALTER TABLE community_tournaments ADD COLUMN ${col.name} ${col.type}`);
  }
}

// ==================== NOTIFICATIONS MIGRATION ====================
// Migrate legacy tournament_notifications data into the generalized
// notifications table and repoint notification_reads to notifications.
// This is idempotent and runs safely on both fresh and existing DBs.

function tableExists(table) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table) !== undefined;
}

// Migrate tournament notifications to the generalized table.
// We only migrate once: when notifications is empty and tournament_notifications has rows.
if (tableExists('tournament_notifications')) {
  const legacyCount = db.prepare('SELECT COUNT(*) as c FROM tournament_notifications').get().c || 0;
  const modernCount = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c || 0;
  if (legacyCount > 0 && modernCount === 0) {
    try {
      db.exec(`
        INSERT INTO notifications (scope, type, title, message, tournament_id, created_at)
        SELECT 'tournament', type, NULL, message, tournament_id, created_at
        FROM tournament_notifications
        WHERE tournament_id IS NOT NULL
      `);
      const migrated = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c || 0;
      console.log(`[DB] Migrated ${migrated} tournament notifications to notifications table`);
    } catch (e) {
      console.error(`[DB] Failed to migrate tournament notifications: ${e.message}`);
    }
  }
}

// Repoint notification_reads foreign key from tournament_notifications to notifications.
// Check existing FK target by inspecting PRAGMA foreign_key_list.
if (tableExists('notification_reads')) {
  const fks = db.prepare("PRAGMA foreign_key_list(notification_reads)").all();
  const referencesNotifications = fks.some(fk => fk.table === 'notifications');
  if (!referencesNotifications) {
    try {
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec(`
        CREATE TABLE notification_reads_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(notification_id, endpoint)
        );
        CREATE INDEX idx_notification_reads_new_endpoint ON notification_reads_new(endpoint);
        CREATE INDEX idx_notification_reads_new_notification ON notification_reads_new(notification_id);
      `);

      // Migrate read rows by matching legacy tournament_notifications to new notifications.
      if (tableExists('tournament_notifications')) {
        db.exec(`
          INSERT OR IGNORE INTO notification_reads_new (notification_id, endpoint, read_at)
          SELECT n.id, nr.endpoint, nr.read_at
          FROM notification_reads nr
          JOIN tournament_notifications tn ON nr.notification_id = tn.id
          JOIN notifications n ON n.tournament_id = tn.tournament_id
            AND n.type = tn.type
            AND n.message = tn.message
            AND n.created_at = tn.created_at
        `);
      }

      db.exec(`
        DROP TABLE notification_reads;
        ALTER TABLE notification_reads_new RENAME TO notification_reads;
      `);
      db.exec('PRAGMA foreign_keys = ON;');
      console.log('[DB] Migrated notification_reads to reference notifications table');
    } catch (e) {
      console.error(`[DB] Failed to migrate notification_reads: ${e.message}. Reads may reference stale IDs.`);
      db.exec('PRAGMA foreign_keys = ON;');
    }
  }
}

// ==================== PLAYER STATS DEDUPLICATION ====================
// Older databases may have duplicate player_stats rows because the UNIQUE
// constraint on player_tag was not always enforced. Merge duplicates and
// enforce uniqueness so the Hall of Fame does not show the same player twice.

function deduplicatePlayerStats() {
  try {
    const duplicates = db.prepare(`
      SELECT player_tag, COUNT(*) as c FROM player_stats GROUP BY player_tag HAVING c > 1
    `).all();

    if (duplicates.length === 0) {
      return;
    }

    console.log(`[DB] Found ${duplicates.length} duplicate player_tag(s) in player_stats. Merging...`);

    const merge = db.transaction(() => {
      db.exec(`
        CREATE TEMP TABLE player_stats_dedup AS
        SELECT
          player_tag,
          MAX(player_name) as player_name,
          SUM(tournament_wins) as tournament_wins,
          SUM(top_3_finishes) as top_3_finishes,
          SUM(total_participations) as total_participations,
          MAX(updated_at) as updated_at
        FROM player_stats
        GROUP BY player_tag;

        DELETE FROM player_stats;

        INSERT INTO player_stats (player_tag, player_name, tournament_wins, top_3_finishes, total_participations, updated_at)
        SELECT player_tag, player_name, tournament_wins, top_3_finishes, total_participations, updated_at
        FROM player_stats_dedup;

        DROP TABLE player_stats_dedup;
      `);
    });

    merge();
    console.log('[DB] Merged duplicate player_stats rows successfully');
  } catch (e) {
    console.error(`[DB] Failed to deduplicate player_stats: ${e.message}`);
  }
}

deduplicatePlayerStats();

// Enforce unique player_tag via index (idempotent; repairs older DBs that
// created the table before the column-level UNIQUE clause was added)
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_player_stats_tag_unique ON player_stats(player_tag)`);
} catch (e) {
  console.error(`[DB] Failed to create unique index on player_stats.player_tag: ${e.message}`);
}

// Setup push_subscriptions table separately with error recovery
let pushSubscriptionsEnabled = false;
try {
  if (!columnExists('push_subscriptions', 'tournament_id')) {
    db.exec(`
      DROP TABLE IF EXISTS push_subscriptions_new;
      DROP TABLE IF EXISTS push_subscriptions;
      CREATE TABLE push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL REFERENCES community_tournaments(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, endpoint)
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tournament ON push_subscriptions(tournament_id);
    `);
  } else {
    // Table exists with correct schema, just ensure index exists
    db.exec(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tournament ON push_subscriptions(tournament_id);`);
  }
  pushSubscriptionsEnabled = true;
} catch (e) {
  console.error(`[DB] push_subscriptions setup failed: ${e.message}. Push notifications will be disabled.`);
}

// Site-wide/global push subscriptions (separate from per-tournament subs)
let globalPushSubscriptionsEnabled = false;
try {
  if (!tableExists('global_push_subscriptions')) {
    db.exec(`
      CREATE TABLE global_push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_global_push_subscriptions_endpoint ON global_push_subscriptions(endpoint);
    `);
  } else {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_global_push_subscriptions_endpoint ON global_push_subscriptions(endpoint);`);
  }
  globalPushSubscriptionsEnabled = true;
} catch (e) {
  console.error(`[DB] global_push_subscriptions setup failed: ${e.message}. Global push notifications will be disabled.`);
}

// Prepared statements
const statements = {
  // Features
  insertFeature: db.prepare(
    `INSERT INTO features (name, description, status) VALUES (?, ?, ?)`
  ),
  getFeatureById: db.prepare(
    `SELECT * FROM features WHERE id = ?`
  ),
  getAllFeatures: db.prepare(
    `SELECT * FROM features ORDER BY created_at DESC`
  ),
  getPublicFeatures: db.prepare(
    `SELECT * FROM features WHERE status != 'pending' ORDER BY votes DESC, created_at DESC`
  ),
  updateFeatureStatus: db.prepare(
    `UPDATE features SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ),
  incrementVotes: db.prepare(
    `UPDATE features SET votes = votes + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ),
  decrementVotes: db.prepare(
    `UPDATE features SET votes = MAX(0, votes - 1), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ),
  deleteFeature: db.prepare(
    `DELETE FROM features WHERE id = ?`
  ),

  // Votes
  insertVote: db.prepare(
    `INSERT INTO votes (feature_id, voter_id) VALUES (?, ?)`
  ),
  deleteVote: db.prepare(
    `DELETE FROM votes WHERE feature_id = ? AND voter_id = ?`
  ),
  getVote: db.prepare(
    `SELECT * FROM votes WHERE feature_id = ? AND voter_id = ?`
  ),
  getUserVotes: db.prepare(
    `SELECT feature_id FROM votes WHERE voter_id = ?`
  ),

  // Community Tournaments
  insertTournament: db.prepare(
    `INSERT INTO community_tournaments 
     (name, description, host_name, start_date, end_date, registration_deadline, format, max_players, prize, rules, tiktok_username, tiktok_live_url, tournament_password, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  getApprovedTournaments: db.prepare(
    `SELECT ct.*, (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = ct.id AND tr.status = 'registered') as participant_count FROM community_tournaments ct WHERE ct.status IN ('approved', 'registration_open', 'registration_closed', 'live', 'completed') ORDER BY ct.start_date ASC`
  ),
  getArchiveTournaments: db.prepare(
    `SELECT ct.*, (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = ct.id AND tr.status = 'registered') as participant_count FROM community_tournaments ct WHERE ct.status = 'completed' ORDER BY ct.start_date DESC`
  ),
  getAllTournaments: db.prepare(
    `SELECT ct.*, (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = ct.id AND tr.status = 'registered') as participant_count FROM community_tournaments ct ORDER BY ct.created_at DESC`
  ),
  getTournamentById: db.prepare(
    `SELECT * FROM community_tournaments WHERE id = ?`
  ),
  checkDuplicateTournament: db.prepare(
    `SELECT id FROM community_tournaments WHERE name = ? AND host_name = ? AND status IN ('pending', 'approved') AND created_at > datetime('now', '-1 day')`
  ),
  updateTournamentStatus: db.prepare(
    `UPDATE community_tournaments SET status = ? WHERE id = ?`
  ),
  updateTournamentWinners: db.prepare(
    `UPDATE community_tournaments SET winner_1st = ?, winner_2nd = ?, winner_3rd = ? WHERE id = ?`
  ),
  updateTournamentPrizeStatus: db.prepare(
    `UPDATE community_tournaments SET prize_status = ? WHERE id = ?`
  ),
  deleteTournament: db.prepare(
    `DELETE FROM community_tournaments WHERE id = ?`
  ),
  updateTournament: db.prepare(
    `UPDATE community_tournaments
     SET name = ?, description = ?, host_name = ?, start_date = ?, end_date = ?,
         registration_deadline = ?, format = ?, max_players = ?, prize = ?,
         rules = ?, tiktok_username = ?, tiktok_live_url = ?, tournament_password = ?
     WHERE id = ?`
  ),

  // Tournament Registrations
  insertRegistration: db.prepare(
    `INSERT INTO tournament_registrations (tournament_id, player_name, player_tag, tiktok_username, status, waitlist_position) VALUES (?, ?, ?, ?, ?, ?)`
  ),
  getRegistrationsByTournament: db.prepare(
    `SELECT * FROM tournament_registrations WHERE tournament_id = ? AND status = 'registered' ORDER BY registered_at ASC`
  ),
  getWaitlistByTournament: db.prepare(
    `SELECT * FROM tournament_registrations WHERE tournament_id = ? AND status = 'waitlisted' ORDER BY waitlist_position ASC, registered_at ASC`
  ),
  getAllRegistrationsByTournament: db.prepare(
    `SELECT * FROM tournament_registrations WHERE tournament_id = ? ORDER BY registered_at ASC`
  ),
  getRegistrationCount: db.prepare(
    `SELECT COUNT(*) as count FROM tournament_registrations WHERE tournament_id = ? AND status = 'registered'`
  ),
  getWaitlistCount: db.prepare(
    `SELECT COUNT(*) as count FROM tournament_registrations WHERE tournament_id = ? AND status = 'waitlisted'`
  ),
  getMaxWaitlistPosition: db.prepare(
    `SELECT MAX(waitlist_position) as max FROM tournament_registrations WHERE tournament_id = ? AND status = 'waitlisted'`
  ),
  getRegistrationByPlayer: db.prepare(
    `SELECT * FROM tournament_registrations WHERE tournament_id = ? AND player_tag = ?`
  ),
  deleteRegistration: db.prepare(
    `DELETE FROM tournament_registrations WHERE id = ?`
  ),
  updateRegistration: db.prepare(
    `UPDATE tournament_registrations SET player_name = ?, player_tag = ?, tiktok_username = ? WHERE id = ?`
  ),
  updateRegistrationStatus: db.prepare(
    `UPDATE tournament_registrations SET status = ?, waitlist_position = ? WHERE id = ?`
  ),
  decrementWaitlistPositions: db.prepare(
    `UPDATE tournament_registrations SET waitlist_position = waitlist_position - 1 WHERE tournament_id = ? AND status = 'waitlisted' AND waitlist_position > ?`
  ),
  insertTournamentMatch: db.prepare(
    `INSERT INTO tournament_matches (tournament_id, round, match_number, player1_tag, player2_tag, player1_name, player2_name) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
  getTournamentMatches: db.prepare(
    `SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round ASC, match_number ASC`
  ),
  getTournamentMatchById: db.prepare(
    `SELECT * FROM tournament_matches WHERE id = ?`
  ),
  updateTournamentMatchResult: db.prepare(
    `UPDATE tournament_matches SET winner_tag = ?, player1_score = ?, player2_score = ?, status = 'completed', updated_at = datetime('now') WHERE id = ?`
  ),
  updateTournamentMatch: db.prepare(
    `UPDATE tournament_matches SET round = ?, match_number = ?, player1_tag = ?, player2_tag = ?, player1_name = ?, player2_name = ? WHERE id = ?`
  ),
  deleteTournamentMatch: db.prepare(
    `DELETE FROM tournament_matches WHERE id = ?`
  ),
  getMaxMatchNumber: db.prepare(
    `SELECT MAX(match_number) as max FROM tournament_matches WHERE tournament_id = ? AND round = ?`
  ),
  getMaxMatchNumber: db.prepare(
    `UPDATE tournament_registrations SET waitlist_position = waitlist_position - 1 WHERE tournament_id = ? AND status = 'waitlisted' AND waitlist_position > ?`
  ),

  // Live Tournament Broadcast
  insertTournamentBattle: db.prepare(
    `INSERT OR IGNORE INTO tournament_battles (tournament_id, battle_id, player1_tag, player2_tag, battle_time, player1_crowns, player2_crowns, winner_tag, game_mode, battle_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  getTournamentBattles: db.prepare(
    `SELECT * FROM tournament_battles WHERE tournament_id = ? ORDER BY battle_time DESC`
  ),
  getTournamentBattleById: db.prepare(
    `SELECT id FROM tournament_battles WHERE tournament_id = ? AND battle_id = ?`
  ),
  getTournamentBattleCount: db.prepare(
    `SELECT COUNT(*) as count FROM tournament_battles WHERE tournament_id = ?`
  ),
  upsertLiveRanking: db.prepare(
    `INSERT INTO tournament_live_rankings (tournament_id, player_tag, player_name, rank, previous_rank, rank_change, wins, losses, draws, matches_played, crowns_earned, crowns_conceded, current_streak, best_streak, score, last_battle_time, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tournament_id, player_tag) DO UPDATE SET
       player_name = excluded.player_name,
       rank = excluded.rank,
       previous_rank = excluded.previous_rank,
       rank_change = excluded.rank_change,
       wins = excluded.wins,
       losses = excluded.losses,
       draws = excluded.draws,
       matches_played = excluded.matches_played,
       crowns_earned = excluded.crowns_earned,
       crowns_conceded = excluded.crowns_conceded,
       current_streak = excluded.current_streak,
       best_streak = excluded.best_streak,
       score = excluded.score,
       last_battle_time = excluded.last_battle_time,
       updated_at = excluded.updated_at`
  ),
  getLiveRankingsByTournament: db.prepare(
    `SELECT * FROM tournament_live_rankings WHERE tournament_id = ? ORDER BY rank ASC, score DESC, wins DESC, crowns_earned DESC, crowns_conceded ASC, last_battle_time DESC`
  ),
  getLiveRankingByPlayer: db.prepare(
    `SELECT * FROM tournament_live_rankings WHERE tournament_id = ? AND player_tag = ?`
  ),
  deleteLiveRankingsForTournament: db.prepare(
    `DELETE FROM tournament_live_rankings WHERE tournament_id = ?`
  ),
  deleteStaleLiveRankings: db.prepare(
    `DELETE FROM tournament_live_rankings WHERE tournament_id = ? AND player_tag NOT IN (SELECT player_tag FROM tournament_registrations WHERE tournament_id = ? AND status = 'registered')`
  ),
  updateTournamentLastBattleSync: db.prepare(
    `UPDATE community_tournaments SET last_battle_sync_at = datetime('now') WHERE id = ?`
  ),

  // Notifications (generalized, site-wide)
  insertNotification: db.prepare(
    `INSERT INTO notifications (scope, type, title, message, tournament_id, resource_id, link) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
  getNotificationsByTournament: db.prepare(
    `SELECT * FROM notifications WHERE tournament_id = ? ORDER BY created_at DESC`
  ),
  getNotificationById: db.prepare(
    `SELECT * FROM notifications WHERE id = ?`
  ),
  deleteNotification: db.prepare(
    `DELETE FROM notifications WHERE id = ?`
  ),
  getAllNotifications: db.prepare(
    `SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ),
  countNotifications: db.prepare(
    `SELECT COUNT(*) as count FROM notifications`
  ),

  // Player Stats (Hall of Fame foundation)
  insertPlayerStat: db.prepare(
    `INSERT INTO player_stats (player_tag, player_name, tournament_wins, top_3_finishes, total_participations) VALUES (?, ?, ?, ?, ?)`
  ),
  getPlayerStat: db.prepare(
    `SELECT * FROM player_stats WHERE player_tag = ?`
  ),
  updatePlayerStat: db.prepare(
    `UPDATE player_stats SET player_name = ?, tournament_wins = ?, top_3_finishes = ?, total_participations = ?, updated_at = CURRENT_TIMESTAMP WHERE player_tag = ?`
  ),
  incrementPlayerStat: db.prepare(
    `UPDATE player_stats SET tournament_wins = tournament_wins + ?, top_3_finishes = top_3_finishes + ?, total_participations = total_participations + ?, updated_at = CURRENT_TIMESTAMP WHERE player_tag = ?`
  ),
  getTopPlayerStats: db.prepare(
    `SELECT
      player_tag,
      MAX(player_name) as player_name,
      SUM(tournament_wins) as tournament_wins,
      SUM(top_3_finishes) as top_3_finishes,
      SUM(total_participations) as total_participations,
      MAX(updated_at) as updated_at
     FROM player_stats
     GROUP BY player_tag
     ORDER BY tournament_wins DESC, top_3_finishes DESC, total_participations DESC
     LIMIT ?`
  ),

  // Community Clans
  insertClan: db.prepare(
    `INSERT INTO community_clans (name, clan_tag, description, leader_name, discord_link, trophy_requirement, members_count, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  getApprovedClans: db.prepare(
    `SELECT * FROM community_clans WHERE status = 'approved' ORDER BY created_at DESC`
  ),
  getAllClans: db.prepare(
    `SELECT * FROM community_clans ORDER BY created_at DESC`
  ),
  getClanById: db.prepare(
    `SELECT * FROM community_clans WHERE id = ?`
  ),
  checkDuplicateClan: db.prepare(
    `SELECT id FROM community_clans WHERE clan_tag = ?`
  ),
  updateClanStatus: db.prepare(
    `UPDATE community_clans SET status = ? WHERE id = ?`
  ),
  deleteClan: db.prepare(
    `DELETE FROM community_clans WHERE id = ?`
  ),

  // Admin Actions
  insertAdminAction: db.prepare(
    `INSERT INTO admin_actions (action, resource, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?)`
  ),
  getAdminActions: db.prepare(
    `SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ),
  getAdminActionsByResource: db.prepare(
    `SELECT * FROM admin_actions WHERE resource = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ),

  // Logs
  insertLog: db.prepare(
    `INSERT INTO logs (level, message, data, timestamp) VALUES (?, ?, ?, ?)`
  ),
  getLogs: db.prepare(
    `SELECT * FROM logs ORDER BY id DESC LIMIT ? OFFSET ?`
  ),
  getLogsByLevel: db.prepare(
    `SELECT * FROM logs WHERE level = ? ORDER BY id DESC LIMIT ? OFFSET ?`
  ),
  searchLogs: db.prepare(
    `SELECT * FROM logs WHERE message LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`
  ),
  searchLogsByLevel: db.prepare(
    `SELECT * FROM logs WHERE level = ? AND message LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`
  ),
  getLogCount: db.prepare(
    `SELECT COUNT(*) as count FROM logs`
  ),
  trimOldLogs: db.prepare(
    `DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT ?)`
  ),

  // State Players
  insertStatePlayer: db.prepare(
    `INSERT INTO state_players (player_tag, state_name, submitter_name, trophies, rank, status) VALUES (?, ?, ?, ?, ?, ?)`
  ),
  getApprovedStatePlayers: db.prepare(
    `SELECT * FROM state_players WHERE status = 'approved' ORDER BY trophies DESC, created_at DESC`
  ),
  getAllStatePlayers: db.prepare(
    `SELECT * FROM state_players ORDER BY created_at DESC`
  ),
  getStatePlayerById: db.prepare(
    `SELECT * FROM state_players WHERE id = ?`
  ),
  checkDuplicateStatePlayer: db.prepare(
    `SELECT id FROM state_players WHERE player_tag = ? AND state_name = ?`
  ),
  updateStatePlayerStatus: db.prepare(
    `UPDATE state_players SET status = ? WHERE id = ?`
  ),
  deleteStatePlayer: db.prepare(
    `DELETE FROM state_players WHERE id = ?`
  ),

  // Community Decks
  insertCommunityDeck: db.prepare(
    `INSERT INTO community_decks (deck_link, card_ids, author_name, description, avg_elixir, tags, votes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  getApprovedCommunityDecks: db.prepare(
    `SELECT * FROM community_decks WHERE status = 'approved' ORDER BY votes DESC, created_at DESC`
  ),
  getAllCommunityDecks: db.prepare(
    `SELECT * FROM community_decks ORDER BY created_at DESC`
  ),
  getCommunityDeckById: db.prepare(
    `SELECT * FROM community_decks WHERE id = ?`
  ),
  updateCommunityDeckStatus: db.prepare(
    `UPDATE community_decks SET status = ? WHERE id = ?`
  ),
  deleteCommunityDeck: db.prepare(
    `DELETE FROM community_decks WHERE id = ?`
  ),
  voteCommunityDeck: db.prepare(
    `UPDATE community_decks SET votes = votes + 1 WHERE id = ?`
  ),
  checkDuplicateDeck: db.prepare(
    `SELECT id FROM community_decks WHERE deck_link = ? AND created_at > datetime('now', '-1 hour')`
  ),
  insertDeckComment: db.prepare(
    `INSERT INTO deck_comments (deck_id, author_name, comment) VALUES (?, ?, ?)`
  ),
  getDeckComments: db.prepare(
    `SELECT * FROM deck_comments WHERE deck_id = ? ORDER BY created_at ASC`
  ),
  getDeckCommentCount: db.prepare(
    `SELECT COUNT(*) as count FROM deck_comments WHERE deck_id = ?`
  ),

};

// Conditionally add push subscription statements
if (pushSubscriptionsEnabled) {
  statements.insertPushSubscription = db.prepare(
    `INSERT INTO push_subscriptions (tournament_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?) ON CONFLICT(tournament_id, endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  );
  statements.getPushSubscriptionsByTournament = db.prepare(
    `SELECT * FROM push_subscriptions WHERE tournament_id = ?`
  );
  statements.deletePushSubscription = db.prepare(
    `DELETE FROM push_subscriptions WHERE tournament_id = ? AND endpoint = ?`
  );
}

if (globalPushSubscriptionsEnabled) {
  statements.insertGlobalPushSubscription = db.prepare(
    `INSERT INTO global_push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  );
  statements.getGlobalPushSubscriptions = db.prepare(
    `SELECT * FROM global_push_subscriptions`
  );
  statements.deleteGlobalPushSubscription = db.prepare(
    `DELETE FROM global_push_subscriptions WHERE endpoint = ?`
  );
}

// Notification read tracking (available when push tables are set up)
if (pushSubscriptionsEnabled || globalPushSubscriptionsEnabled) {
  statements.getRecentNotifications = db.prepare(
    `SELECT n.id, n.scope, n.tournament_id, n.type, n.title, n.message, n.link, n.created_at,
            ct.name as tournament_name
     FROM notifications n
     LEFT JOIN community_tournaments ct ON n.tournament_id = ct.id
     ORDER BY n.created_at DESC
     LIMIT 30`
  );
  statements.getUnreadNotificationCount = db.prepare(
    `SELECT COUNT(*) as count
     FROM notifications n
     LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.endpoint = ?
     WHERE nr.id IS NULL`
  );
  statements.markNotificationRead = db.prepare(
    `INSERT OR IGNORE INTO notification_reads (notification_id, endpoint) VALUES (?, ?)`
  );
  statements.markAllNotificationsRead = db.prepare(
    `INSERT OR IGNORE INTO notification_reads (notification_id, endpoint)
     SELECT id, ? FROM notifications`
  );
  statements.getNotificationReadsByEndpoint = db.prepare(
    `SELECT notification_id FROM notification_reads WHERE endpoint = ?`
  );
}

function getDbDiagnostics() {
  const exists = fs.existsSync(dbPath);
  const stats = exists ? fs.statSync(dbPath) : null;
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
  const counts = {};
  for (const table of tables) {
    try {
      counts[table] = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
    } catch (e) {
      counts[table] = `error: ${e.message}`;
    }
  }
  return {
    dbDir,
    dbPath,
    dbDirEnvVar: process.env.DB_DIR || null,
    fileExists: exists,
    fileSizeBytes: stats ? stats.size : 0,
    fileSizeKB: stats ? Math.round(stats.size / 1024) : 0,
    fileModifiedAt: stats ? new Date(stats.mtime).toISOString() : null,
    fileCreatedAt: stats ? new Date(stats.birthtime).toISOString() : null,
    tables,
    counts,
    allDbFilesOnFilesystem: allDbFiles,
    serverWorkingDirectory: process.cwd(),
    scriptDirectory: __dirname,
  };
}

export { db, statements, getDbDiagnostics, dbPath, dbDir, pushSubscriptionsEnabled, globalPushSubscriptionsEnabled };
