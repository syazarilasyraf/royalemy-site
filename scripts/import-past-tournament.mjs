import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const dbArg = args.find(a => a.startsWith('--db='))?.slice(5);
const dataPath = args.find(a => !a.startsWith('--db=')) || path.join(__dirname, 'past-tournament-data.json');

let dbPath;
if (dbArg) {
  dbPath = path.resolve(dbArg);
} else {
  const dbDir = process.env.DB_DIR || path.join(__dirname, '..', 'server', 'data');
  dbPath = path.join(dbDir, 'roadmap.db');
}

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}
if (!fs.existsSync(dataPath)) {
  console.error(`Data file not found: ${dataPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('wal_checkpoint(TRUNCATE)');

function sanitizeTag(tag) {
  if (!tag || typeof tag !== 'string') return null;
  const cleaned = tag.trim().toUpperCase().replace(/#/g, '').replace(/\s+/g, '');
  if (!cleaned || cleaned.length < 3 || cleaned.length > 12) return null;
  return cleaned;
}

function parseTournaments(raw) {
  const tournaments = Array.isArray(raw) ? raw : [raw];
  for (const t of tournaments) {
    if (!t.name || !t.host_name || !t.start_date || !Array.isArray(t.placement_order)) {
      throw new Error('Each tournament requires name, host_name, start_date, and placement_order');
    }
    const tags = t.placement_order.map(sanitizeTag).filter(Boolean);
    if (tags.length === 0) throw new Error(`No valid player tags for "${t.name}"`);
    if (new Set(tags).size !== tags.length) throw new Error(`Duplicate player tags in "${t.name}"`);
    t.placement_order = tags;
  }
  return tournaments;
}

const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const tournaments = parseTournaments(rawData);

const insertTournament = db.prepare(`
  INSERT INTO community_tournaments (
    name, description, host_name, start_date, end_date, registration_deadline,
    format, max_players, prize, rules, tournament_password, tiktok_username, tiktok_live_url,
    status, prize_status, winner_1st, winner_2nd, winner_3rd
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertRegistration = db.prepare(`
  INSERT INTO tournament_registrations (
    tournament_id, player_name, player_tag, tiktok_username, status, waitlist_position, registered_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const upsertPlayerStats = db.prepare(`
  INSERT INTO player_stats (player_tag, player_name, tournament_wins, top_3_finishes, total_participations, updated_at)
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(player_tag) DO UPDATE SET
    tournament_wins = tournament_wins + excluded.tournament_wins,
    top_3_finishes = top_3_finishes + excluded.top_3_finishes,
    total_participations = total_participations + excluded.total_participations,
    updated_at = CURRENT_TIMESTAMP
`);

const existingByName = db.prepare(`SELECT id FROM community_tournaments WHERE name = ?`).pluck();

for (const t of tournaments) {
  if (existingByName.get(t.name)) {
    console.log(`Skipping duplicate tournament name: ${t.name}`);
    continue;
  }

  const winner1st = t.placement_order[0] || null;
  const winner2nd = t.placement_order[1] || null;
  const winner3rd = t.placement_order[2] || null;

  const tournamentId = insertTournament.run(
    t.name,
    t.description || '',
    t.host_name,
    t.start_date,
    t.end_date || t.start_date,
    t.registration_deadline || t.start_date,
    t.format || '1v1',
    t.max_players || t.placement_order.length,
    t.prize || '',
    t.rules || '',
    t.tournament_password || '',
    t.tiktok_username || '',
    t.tiktok_live_url || '',
    'completed',
    'awarded',
    winner1st,
    winner2nd,
    winner3rd
  ).lastInsertRowid;

  for (let i = 0; i < t.placement_order.length; i++) {
    const tag = t.placement_order[i];
    insertRegistration.run(tournamentId, tag, tag, '', 'registered', null, t.end_date || t.start_date);

    const wins = i === 0 ? 1 : 0;
    const top3 = i < 3 ? 1 : 0;
    upsertPlayerStats.run(tag, tag, wins, top3, 1);
  }

  console.log(`Imported "${t.name}" with ${t.placement_order.length} players (ID: ${tournamentId})`);
}

db.pragma('wal_checkpoint(TRUNCATE)');
db.close();
console.log('Import complete.');
