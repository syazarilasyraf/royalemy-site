import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'roadmap.db');
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
    `SELECT * FROM community_tournaments WHERE status = 'approved' AND start_date > datetime('now', '-1 day') ORDER BY start_date ASC`
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

};

export { db, statements };
