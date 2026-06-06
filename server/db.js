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

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

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
    format TEXT DEFAULT '1v1',
    max_players INTEGER,
    prize TEXT,
    discord_link TEXT,
    contact_info TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notified_24h INTEGER NOT NULL DEFAULT 0,
    notified_1h INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tournaments_status ON community_tournaments(status);
  CREATE INDEX IF NOT EXISTS idx_tournaments_start ON community_tournaments(start_date);

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
    `INSERT INTO community_tournaments (name, description, host_name, tournament_tag, start_date, end_date, format, max_players, prize, discord_link, contact_info, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  getApprovedTournaments: db.prepare(
    `SELECT * FROM community_tournaments WHERE status = 'approved' AND (end_date > datetime('now') OR (end_date IS NULL AND start_date > datetime('now', '-6 hours'))) ORDER BY start_date ASC`
  ),
  getAllTournaments: db.prepare(
    `SELECT * FROM community_tournaments ORDER BY created_at DESC`
  ),
  getTournamentById: db.prepare(
    `SELECT * FROM community_tournaments WHERE id = ?`
  ),
  updateTournamentStatus: db.prepare(
    `UPDATE community_tournaments SET status = ? WHERE id = ?`
  ),
  updateTournamentNotified: db.prepare(
    `UPDATE community_tournaments SET notified_24h = ?, notified_1h = ? WHERE id = ?`
  ),
  deleteTournament: db.prepare(
    `DELETE FROM community_tournaments WHERE id = ?`
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

export { db, statements };
