import { db, statements } from '../db.js';
import { fetchFromCR, getCacheKey } from './crApi.js';
import { sanitizeTag } from '../middleware/auth.js';
import { log } from '../logger.js';

const SYNC_INTERVAL_MS = Number(process.env.LIVE_TOURNAMENT_SYNC_INTERVAL_MS) || 30_000;
const BATTLE_FETCH_CONCURRENCY = Number(process.env.LIVE_TOURNAMENT_SYNC_CONCURRENCY) || 5;
const LIVE_BATTLELOG_CACHE_TTL = Number(process.env.LIVE_BATTLELOG_CACHE_TTL) || 30;

const IGNORED_BATTLE_TYPES = new Set([
  'friendly',
  'tournament',
  'challenge',
  'riverRacePvP',
  'riverRaceDuel',
  'riverRace',
  'boatBattle',
  'clanWarCollectionDay',
  'clanWarWarDay',
  'clanWar',
  'event',
]);

const LADDER_GAME_MODE_IDS = new Set(['72000006']);

function normalizeTag(tag) {
  return sanitizeTag(tag);
}

function parseDateMs(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function isWithinWindow(battleTime, startDate, endDate) {
  const battleMs = parseDateMs(battleTime);
  const startMs = parseDateMs(startDate);
  const endMs = parseDateMs(endDate);

  if (!battleMs || !startMs) return false;
  if (battleMs < startMs) return false;
  if (endMs && battleMs > endMs) return false;
  return true;
}

function isAllowedBattleMode(battle, tournamentFormat) {
  const type = String(battle.type || '').toLowerCase();
  const gameMode = battle.gameMode || {};
  const gameModeName = String(gameMode.name || '').toLowerCase();
  const gameModeId = String(gameMode.id || '');

  // Always ignore friendly / other tournaments / challenges / clan wars.
  if (IGNORED_BATTLE_TYPES.has(type)) return false;

  // Ignore known ladder game mode.
  if (LADDER_GAME_MODE_IDS.has(gameModeId) || gameModeName.includes('ladder')) return false;

  const isTripleDraftTournament = tournamentFormat === 'Triple Draft';
  const isTripleDraftBattle = gameModeName.includes('tripledraft');

  if (isTripleDraftTournament) {
    // In a Triple Draft tournament only Triple Draft battles count.
    if (!isTripleDraftBattle) return false;
  } else {
    // In non-Triple-Draft tournaments ignore Triple Draft battles.
    if (isTripleDraftBattle) return false;
  }

  // Only 1v1 battles for now (2v2 can be enabled later when we support teams).
  const team = Array.isArray(battle.team) ? battle.team : [];
  const opponent = Array.isArray(battle.opponent) ? battle.opponent : [];
  if (team.length !== 1 || opponent.length !== 1) return false;

  return true;
}

function generateBattleId(tagA, tagB, battleTime) {
  const [a, b] = [normalizeTag(tagA), normalizeTag(tagB)].sort();
  return `${a}|${b}|${battleTime}`;
}

function getRegisteredTags(tournamentId) {
  const rows = statements.getRegistrationsByTournament.all(tournamentId);
  const set = new Set();
  for (const row of rows) {
    set.add(normalizeTag(row.player_tag));
  }
  return set;
}

async function fetchPlayerBattleLog(playerTag) {
  const cleanTag = normalizeTag(playerTag);
  // Use a separate live-sync cache key so we can refresh faster without
  // affecting the public player battlelog endpoint cache.
  const cacheKey = getCacheKey('battlelog', `live:${cleanTag}`);
  return fetchFromCR(`/players/%23${cleanTag}/battlelog`, cacheKey, LIVE_BATTLELOG_CACHE_TTL);
}

function processBattle(tournament, playerTag, battle, registeredTags) {
  if (!isAllowedBattleMode(battle, tournament.format)) {
    return { inserted: false, reason: 'mode' };
  }

  if (!isWithinWindow(battle.battleTime, tournament.start_date, tournament.end_date)) {
    return { inserted: false, reason: 'window' };
  }

  const team = battle.team[0];
  const opponent = battle.opponent[0];

  const queriedTag = normalizeTag(playerTag);
  const opponentTag = normalizeTag(opponent.tag);

  if (!opponentTag || !registeredTags.has(opponentTag)) {
    return { inserted: false, reason: 'opponent' };
  }

  const teamCrowns = Number(team.crowns ?? 0);
  const opponentCrowns = Number(opponent.crowns ?? 0);

  const battleId = generateBattleId(queriedTag, opponentTag, battle.battleTime);

  const sortedTags = [queriedTag, opponentTag].sort();
  const player1Tag = sortedTags[0];
  const player2Tag = sortedTags[1];

  const player1Crowns = queriedTag === player1Tag ? teamCrowns : opponentCrowns;
  const player2Crowns = queriedTag === player2Tag ? teamCrowns : opponentCrowns;

  let winnerTag = null;
  if (teamCrowns > opponentCrowns) winnerTag = queriedTag;
  else if (teamCrowns < opponentCrowns) winnerTag = opponentTag;

  const gameModeName = battle.gameMode?.name || null;
  const battleType = battle.type || null;

  const result = statements.insertTournamentBattle.run(
    tournament.id,
    battleId,
    player1Tag,
    player2Tag,
    battle.battleTime,
    player1Crowns,
    player2Crowns,
    winnerTag,
    gameModeName,
    battleType
  );

  return { inserted: result.changes > 0, battleId };
}

async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}

async function syncTournamentBattles(tournamentId) {
  const tournament = statements.getTournamentById.get(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const registeredTags = getRegisteredTags(tournamentId);
  if (registeredTags.size === 0) {
    statements.updateTournamentLastBattleSync.run(tournamentId);
    return { processed: 0, newBattles: 0, errors: 0 };
  }

  const participants = Array.from(registeredTags);
  let processed = 0;
  let newBattles = 0;
  let errors = 0;

  const results = await asyncPool(BATTLE_FETCH_CONCURRENCY, participants, async (tag) => {
    try {
      const logs = await fetchPlayerBattleLog(tag);
      if (!Array.isArray(logs)) return { processed: 0, newBattles: 0 };

      let localProcessed = 0;
      let localNew = 0;
      for (const battle of logs) {
        localProcessed++;
        const outcome = processBattle(tournament, tag, battle, registeredTags);
        if (outcome.inserted) localNew++;
      }
      return { processed: localProcessed, newBattles: localNew };
    } catch (e) {
      log('warn', `Failed to sync battles for ${tag} in tournament ${tournamentId}: ${e.message}`);
      return { processed: 0, newBattles: 0, error: true };
    }
  });

  for (const r of results) {
    if (r.error) {
      errors++;
      continue;
    }
    processed += r.processed;
    newBattles += r.newBattles;
  }

  recomputeLeaderboard(tournamentId);
  statements.updateTournamentLastBattleSync.run(tournamentId);

  log('info', `Tournament ${tournamentId} battle sync complete: ${processed} processed, ${newBattles} new, ${errors} errors`);
  return { processed, newBattles, errors };
}

function recomputeLeaderboard(tournamentId) {
  const tournament = statements.getTournamentById.get(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const participants = statements.getRegistrationsByTournament.all(tournamentId);
  const battles = statements.getTournamentBattles.all(tournamentId);
  const oldRankings = statements.getLiveRankingsByTournament.all(tournamentId);
  const oldRankMap = new Map(oldRankings.map((r) => [r.player_tag, r.rank]));

  const stats = new Map();
  for (const p of participants) {
    stats.set(normalizeTag(p.player_tag), {
      player_tag: normalizeTag(p.player_tag),
      player_name: p.player_name || normalizeTag(p.player_tag),
      wins: 0,
      losses: 0,
      draws: 0,
      matches_played: 0,
      crowns_earned: 0,
      crowns_conceded: 0,
      current_streak: 0,
      best_streak: 0,
      score: 0,
      last_battle_time: null,
    });
  }

  const sortedBattles = [...battles].sort(
    (a, b) => new Date(a.battle_time).getTime() - new Date(b.battle_time).getTime()
  );

  for (const battle of sortedBattles) {
    for (const tag of [battle.player1_tag, battle.player2_tag]) {
      if (!stats.has(tag)) continue;
      const s = stats.get(tag);
      const isPlayer1 = tag === battle.player1_tag;
      const myCrowns = isPlayer1 ? battle.player1_crowns : battle.player2_crowns;
      const theirCrowns = isPlayer1 ? battle.player2_crowns : battle.player1_crowns;

      s.matches_played += 1;
      s.crowns_earned += myCrowns;
      s.crowns_conceded += theirCrowns;

      if (battle.winner_tag === tag) {
        s.wins += 1;
        s.current_streak = Math.max(0, s.current_streak) + 1;
        s.best_streak = Math.max(s.best_streak, s.current_streak);
      } else if (battle.winner_tag === null) {
        s.draws += 1;
        s.current_streak = 0;
      } else {
        s.losses += 1;
        s.current_streak = 0;
      }

      s.last_battle_time = battle.battle_time;
    }
  }

  const rows = Array.from(stats.values());
  for (const s of rows) {
    s.score = s.wins * 100 + s.crowns_earned;
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.crowns_earned !== a.crowns_earned) return b.crowns_earned - a.crowns_earned;
    if (a.crowns_conceded !== b.crowns_conceded) return a.crowns_conceded - b.crowns_conceded;
    const ta = a.last_battle_time ? new Date(a.last_battle_time).getTime() : 0;
    const tb = b.last_battle_time ? new Date(b.last_battle_time).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return a.player_tag.localeCompare(b.player_tag);
  });

  const registeredTags = new Set(participants.map((p) => normalizeTag(p.player_tag)));

  const upsert = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rank = i + 1;
      const previousRank = oldRankMap.get(r.player_tag) || null;
      const rankChange = previousRank ? previousRank - rank : 0;
      statements.upsertLiveRanking.run(
        tournamentId,
        r.player_tag,
        r.player_name,
        rank,
        previousRank,
        rankChange,
        r.wins,
        r.losses,
        r.draws,
        r.matches_played,
        r.crowns_earned,
        r.crowns_conceded,
        r.current_streak,
        r.best_streak,
        r.score,
        r.last_battle_time || null
      );
    }

    for (const old of oldRankings) {
      if (!registeredTags.has(old.player_tag)) {
        db.prepare('DELETE FROM tournament_live_rankings WHERE tournament_id = ? AND player_tag = ?').run(tournamentId, old.player_tag);
      }
    }
  });

  upsert();
  return rows;
}

function formatParticipant(row) {
  return {
    player_tag: row.player_tag,
    player_name: row.player_name || row.player_tag,
    tiktok_username: row.tiktok_username || null,
    registered_at: row.registered_at,
  };
}

function getParticipants(tournamentId) {
  const tournament = statements.getTournamentById.get(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
    },
    participants: statements.getRegistrationsByTournament.all(tournamentId).map(formatParticipant),
  };
}

function formatLeaderboardRow(row) {
  return {
    rank: row.rank,
    previous_rank: row.previous_rank,
    rank_change: row.rank_change,
    player_tag: row.player_tag,
    player_name: row.player_name || row.player_tag,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    matches_played: row.matches_played,
    crowns_earned: row.crowns_earned,
    crowns_conceded: row.crowns_conceded,
    current_streak: row.current_streak,
    best_streak: row.best_streak,
    score: row.score,
    last_battle_time: row.last_battle_time,
  };
}

function computeHighlights(rankings) {
  const active = rankings.filter((r) => r.matches_played > 0);

  const hotStreakCandidates = active.filter((r) => r.current_streak > 0);
  const hotStreak = hotStreakCandidates.length
    ? hotStreakCandidates.reduce((best, r) => {
        if (r.current_streak > best.current_streak) return r;
        if (r.current_streak === best.current_streak && r.rank < best.rank) return r;
        return best;
      })
    : null;

  const climberCandidates = active.filter((r) => r.rank_change > 0);
  const biggestClimber = climberCandidates.length
    ? climberCandidates.reduce((best, r) => {
        if (r.rank_change > best.rank_change) return r;
        if (r.rank_change === best.rank_change && r.rank < best.rank) return r;
        return best;
      })
    : null;

  const mostCrowns = active.length
    ? active.reduce((best, r) => {
        if (r.crowns_earned > best.crowns_earned) return r;
        if (r.crowns_earned === best.crowns_earned && r.rank < best.rank) return r;
        return best;
      })
    : null;

  const mostActive = active.length
    ? active.reduce((best, r) => {
        if (r.matches_played > best.matches_played) return r;
        if (r.matches_played === best.matches_played && r.rank < best.rank) return r;
        return best;
      })
    : null;

  return {
    hot_streak: hotStreak
      ? {
          player_tag: hotStreak.player_tag,
          player_name: hotStreak.player_name || hotStreak.player_tag,
          value: hotStreak.current_streak,
          label: `${hotStreak.current_streak} win${hotStreak.current_streak === 1 ? '' : 's'}`,
        }
      : null,
    biggest_climber: biggestClimber
      ? {
          player_tag: biggestClimber.player_tag,
          player_name: biggestClimber.player_name || biggestClimber.player_tag,
          value: biggestClimber.rank_change,
          label: `+${biggestClimber.rank_change} place${biggestClimber.rank_change === 1 ? '' : 's'}`,
        }
      : null,
    most_crowns: mostCrowns
      ? {
          player_tag: mostCrowns.player_tag,
          player_name: mostCrowns.player_name || mostCrowns.player_tag,
          value: mostCrowns.crowns_earned,
          label: `${mostCrowns.crowns_earned}`,
        }
      : null,
    most_active: mostActive
      ? {
          player_tag: mostActive.player_tag,
          player_name: mostActive.player_name || mostActive.player_tag,
          value: mostActive.matches_played,
          label: `${mostActive.matches_played} match${mostActive.matches_played === 1 ? '' : 'es'}`,
        }
      : null,
  };
}

function getLeaderboard(tournamentId, limit = 3) {
  const tournament = statements.getTournamentById.get(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const allRankings = statements.getLiveRankingsByTournament.all(tournamentId);
  const highlights = computeHighlights(allRankings);
  const leaderboard = allRankings.slice(0, limit).map(formatLeaderboardRow);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      format: tournament.format,
      start_date: tournament.start_date,
      end_date: tournament.end_date,
      last_battle_sync_at: tournament.last_battle_sync_at,
    },
    updated_at: new Date().toISOString(),
    leaderboard,
    highlights,
  };
}

function getStats(tournamentId) {
  const tournament = statements.getTournamentById.get(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const allRankings = statements.getLiveRankingsByTournament.all(tournamentId);
  const highlights = computeHighlights(allRankings);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      last_battle_sync_at: tournament.last_battle_sync_at,
    },
    updated_at: new Date().toISOString(),
    total_participants: allRankings.length,
    total_battles: statements.getTournamentBattleCount.get(tournamentId).count,
    highlights,
  };
}

function setupLiveTournamentSync(app) {
  setInterval(async () => {
    try {
      const liveTournaments = db.prepare(`SELECT id FROM community_tournaments WHERE status = 'live'`).all();
      for (const t of liveTournaments) {
        try {
          await syncTournamentBattles(t.id);
        } catch (e) {
          log('warn', `Background sync failed for tournament ${t.id}: ${e.message}`);
        }
      }
    } catch (e) {
      log('warn', `Live tournament sync loop failed: ${e.message}`);
    }
  }, SYNC_INTERVAL_MS);

  log('info', `Live tournament background sync initialized (interval: ${SYNC_INTERVAL_MS}ms)`);
}

export {
  syncTournamentBattles,
  recomputeLeaderboard,
  getLeaderboard,
  getStats,
  getParticipants,
  setupLiveTournamentSync,
};
