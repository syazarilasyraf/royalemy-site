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

  CREATE TABLE IF NOT EXISTS tournament_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES community_tournaments(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    player_tag TEXT NOT NULL,
    tiktok_username TEXT,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, player_tag)
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON tournament_registrations(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_player ON tournament_registrations(player_tag);

  CREATE TABLE IF NOT EXISTS tournament_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER REFERENCES community_tournaments(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_tournament ON tournament_notifications(tournament_id);

  CREATE TABLE IF NOT EXISTS notification_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL REFERENCES tournament_notifications(id) ON DELETE CASCADE,
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
`);

// Migration: add new columns if they don't exist (idempotent)
function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
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
];

for (const col of tournamentCols) {
  if (!columnExists('community_tournaments', col.name)) {
    db.exec(`ALTER TABLE community_tournaments ADD COLUMN ${col.name} ${col.type}`);
  }
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

// Prepared statements
const statements = {
  // Features
  insertFeature: db.prepare(
    `INSERT INTO features (name, description, status) VALUES (?, ?, ?)`
  ),
  getFeatureById: db.prepare(
    `SELECT * FROM features WHERE id = ?`
  ),
  getFeaturesByStatus: db.prepare(
    `SELECT * FROM features WHERE status = ? ORDER BY votes DESC, created_at DESC`
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
  getVoteCount: db.prepare(
    `SELECT COUNT(*) as count FROM votes WHERE feature_id = ?`
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
    `SELECT ct.*, (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = ct.id) as participant_count FROM community_tournaments ct WHERE ct.status IN ('approved', 'registration_open', 'registration_closed', 'live') ORDER BY ct.start_date ASC`
  ),
  getArchiveTournaments: db.prepare(
    `SELECT ct.*, (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = ct.id) as participant_count FROM community_tournaments ct WHERE ct.status = 'completed' ORDER BY ct.start_date DESC`
  ),
  getAllTournaments: db.prepare(
    `SELECT ct.*, (SELECT COUNT(*) FROM tournament_registrations tr WHERE tr.tournament_id = ct.id) as participant_count FROM community_tournaments ct ORDER BY ct.created_at DESC`
  ),
  getTournamentById: db.prepare(
    `SELECT * FROM community_tournaments WHERE id = ?`
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
  updateTournamentNotified: db.prepare(
    `UPDATE community_tournaments SET notified_24h = ?, notified_1h = ? WHERE id = ?`
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
    `INSERT INTO tournament_registrations (tournament_id, player_name, player_tag, tiktok_username) VALUES (?, ?, ?, ?)`
  ),
  getRegistrationsByTournament: db.prepare(
    `SELECT * FROM tournament_registrations WHERE tournament_id = ? ORDER BY registered_at ASC`
  ),
  getRegistrationCount: db.prepare(
    `SELECT COUNT(*) as count FROM tournament_registrations WHERE tournament_id = ?`
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

  // Tournament Notifications
  insertNotification: db.prepare(
    `INSERT INTO tournament_notifications (tournament_id, type, message) VALUES (?, ?, ?)`
  ),
  getNotificationsByTournament: db.prepare(
    `SELECT * FROM tournament_notifications WHERE tournament_id = ? ORDER BY created_at DESC`
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
    `SELECT * FROM player_stats ORDER BY tournament_wins DESC, top_3_finishes DESC, total_participations DESC LIMIT ?`
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
  updateClanStatus: db.prepare(
    `UPDATE community_clans SET status = ? WHERE id = ?`
  ),
  deleteClan: db.prepare(
    `DELETE FROM community_clans WHERE id = ?`
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
  statements.deletePushSubscriptionsByTournament = db.prepare(
    `DELETE FROM push_subscriptions WHERE tournament_id = ?`
  );

  // Notification read tracking
  statements.getRecentNotifications = db.prepare(
    `SELECT tn.id, tn.tournament_id, tn.type, tn.message, tn.created_at,
            ct.name as tournament_name
     FROM tournament_notifications tn
     JOIN community_tournaments ct ON tn.tournament_id = ct.id
     ORDER BY tn.created_at DESC
     LIMIT 30`
  );
  statements.getUnreadNotificationCount = db.prepare(
    `SELECT COUNT(*) as count
     FROM tournament_notifications tn
     LEFT JOIN notification_reads nr ON tn.id = nr.notification_id AND nr.endpoint = ?
     WHERE nr.id IS NULL`
  );
  statements.markNotificationRead = db.prepare(
    `INSERT OR IGNORE INTO notification_reads (notification_id, endpoint) VALUES (?, ?)`
  );
  statements.markAllNotificationsRead = db.prepare(
    `INSERT OR IGNORE INTO notification_reads (notification_id, endpoint)
     SELECT id, ? FROM tournament_notifications`
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

export { db, statements, getDbDiagnostics, dbPath, dbDir };
