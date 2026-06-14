import Database from 'better-sqlite3';
import path from 'path';

const dbArg = process.argv.find(a => a.startsWith('--db='))?.slice(5);
const dbPath = dbArg ? path.resolve(dbArg) : 'server/data/roadmap.db';

const db = new Database(dbPath);

const tournamentName = 'Triple Draft Tournament - 13 June 2026';

const tournament = db.prepare(`
  SELECT id, name, status, winner_1st, winner_2nd, winner_3rd, start_date, end_date
  FROM community_tournaments
  WHERE name = ?
`).get(tournamentName);

const totalTournaments = db.prepare(`SELECT COUNT(*) as c FROM community_tournaments`).get().c;
const totalRegistrations = db.prepare(`
  SELECT COUNT(*) as c FROM tournament_registrations
  WHERE tournament_id = (SELECT id FROM community_tournaments WHERE name = ?)
`).get(tournamentName).c;

const top3Stats = db.prepare(`
  SELECT player_tag, tournament_wins, top_3_finishes, total_participations
  FROM player_stats
  WHERE player_tag IN (?, ?, ?)
`).all(tournament?.winner_1st, tournament?.winner_2nd, tournament?.winner_3rd);

console.log('Database:', dbPath);
console.log('Tournament:', tournament);
console.log('Total tournaments in DB:', totalTournaments);
console.log('Registrations for this tournament:', totalRegistrations);
console.log('Top 3 Hall of Fame stats:', top3Stats);

db.close();
