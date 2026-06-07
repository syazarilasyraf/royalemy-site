import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { log } from '../logger.js';

const router = express.Router();

const VALID_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'registration_open',
  'registration_closed',
  'live',
  'completed',
  'cancelled'
];

const PUBLIC_STATUSES = ['approved', 'registration_open', 'registration_closed', 'live'];

function getAdminKey() {
  return process.env.ROADMAP_ADMIN_KEY;
}

function validateAdminKey(req, res, next) {
  const key = req.query.key;
  const adminKey = getAdminKey();
  if (!adminKey) {
    return res.status(500).json({ error: 'Admin key not configured on server' });
  }
  if (key !== adminKey) {
    log('warn', `Invalid admin key attempt from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}

function validatePlayerTag(tag) {
  if (!tag) return false;
  const clean = tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.length >= 3 && clean.length <= 10 ? clean : false;
}

function createNotification(tournamentId, type, message) {
  try {
    statements.insertNotification.run(tournamentId, type, message);
  } catch (e) {
    log('warn', `Failed to create notification: ${e.message}`);
  }
}

function updatePlayerStats(playerTag, playerName, win, top3, participation) {
  try {
    const existing = statements.getPlayerStat.get(playerTag);
    if (existing) {
      statements.incrementPlayerStat.run(win ? 1 : 0, top3 ? 1 : 0, participation ? 1 : 0, playerTag);
    } else {
      statements.insertPlayerStat.run(playerTag, playerName, win ? 1 : 0, top3 ? 1 : 0, participation ? 1 : 0);
    }
  } catch (e) {
    log('warn', `Failed to update player stats for ${playerTag}: ${e.message}`);
  }
}

// Stricter rate limit for tournament submissions: 3 per hour per IP
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: 'You can only submit 3 tournaments per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Tournament submit rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// ==================== ADMIN ROUTES (must be before /:id) ====================

router.get('/admin', validateAdminKey, (req, res) => {
  try {
    const tournaments = statements.getAllTournaments.all();
    res.json({ tournaments });
  } catch (error) {
    log('error', `Admin failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

router.post('/admin/:id/approve', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'pending') {
      return res.status(400).json({ error: 'Tournament is not pending' });
    }
    statements.updateTournamentStatus.run('approved', id);
    createNotification(id, 'status_change', `Tournament "${tournament.name}" has been approved.`);
    log('success', `Tournament ${id} approved`);
    res.json({ message: 'Tournament approved', id });
  } catch (error) {
    log('error', `Failed to approve tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve tournament' });
  }
});

router.post('/admin/:id/reject', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    statements.updateTournamentStatus.run('rejected', id);
    createNotification(id, 'status_change', `Tournament "${tournament.name}" has been rejected.`);
    log('success', `Tournament ${id} rejected`);
    res.json({ message: 'Tournament rejected', id });
  } catch (error) {
    log('error', `Failed to reject tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject tournament' });
  }
});

router.post('/admin/:id/status', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    statements.updateTournamentStatus.run(status, id);
    createNotification(id, 'status_change', `Tournament "${tournament.name}" status updated to ${status.replace('_', ' ')}.`);
    log('success', `Tournament ${id} status updated to ${status}`);
    res.json({ message: `Status updated to ${status}`, id });
  } catch (error) {
    log('error', `Failed to update tournament status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update tournament status' });
  }
});

router.post('/admin/:id/winners', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const { winner_1st, winner_2nd, winner_3rd } = req.body;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    statements.updateTournamentWinners.run(
      winner_1st || tournament.winner_1st || null,
      winner_2nd || tournament.winner_2nd || null,
      winner_3rd || tournament.winner_3rd || null,
      id
    );

    // Update player stats
    const allRegs = statements.getRegistrationsByTournament.all(id);
    const regMap = new Map(allRegs.map(r => [r.player_tag, r.player_name]));

    if (winner_1st) {
      const name = regMap.get(winner_1st.toUpperCase()) || winner_1st;
      updatePlayerStats(winner_1st.toUpperCase(), name, true, true, true);
    }
    if (winner_2nd) {
      const name = regMap.get(winner_2nd.toUpperCase()) || winner_2nd;
      updatePlayerStats(winner_2nd.toUpperCase(), name, false, true, true);
    }
    if (winner_3rd) {
      const name = regMap.get(winner_3rd.toUpperCase()) || winner_3rd;
      updatePlayerStats(winner_3rd.toUpperCase(), name, false, true, true);
    }

    // Update participation for all other registrants
    for (const reg of allRegs) {
      const tag = reg.player_tag.toUpperCase();
      const isWinner = tag === (winner_1st || '').toUpperCase() ||
                       tag === (winner_2nd || '').toUpperCase() ||
                       tag === (winner_3rd || '').toUpperCase();
      if (!isWinner) {
        updatePlayerStats(tag, reg.player_name, false, false, true);
      }
    }

    log('success', `Tournament ${id} winners updated`);
    res.json({ message: 'Winners updated', id });
  } catch (error) {
    log('error', `Failed to update winners: ${error.message}`);
    res.status(500).json({ error: 'Failed to update winners' });
  }
});

router.post('/admin/:id/prize-status', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const { prize_status } = req.body;
    if (!['pending', 'contacted', 'paid'].includes(prize_status)) {
      return res.status(400).json({ error: 'Invalid prize status' });
    }
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    statements.updateTournamentPrizeStatus.run(prize_status, id);
    createNotification(id, 'status_change', `Prize status for "${tournament.name}" updated to ${prize_status}.`);
    log('success', `Tournament ${id} prize status updated to ${prize_status}`);
    res.json({ message: 'Prize status updated', id });
  } catch (error) {
    log('error', `Failed to update prize status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update prize status' });
  }
});

router.post('/admin/:id/edit', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, host_name, start_date, end_date,
      registration_deadline, format, max_players, prize,
      rules, tiktok_username, tiktok_live_url, tournament_password
    } = req.body;

    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    statements.updateTournament.run(
      name ?? tournament.name,
      description ?? tournament.description,
      host_name ?? tournament.host_name,
      start_date ?? tournament.start_date,
      end_date ?? tournament.end_date,
      registration_deadline ?? tournament.registration_deadline,
      format ?? tournament.format,
      max_players ? parseInt(max_players) : tournament.max_players,
      prize ?? tournament.prize,
      rules ?? tournament.rules,
      tiktok_username ?? tournament.tiktok_username,
      tiktok_live_url ?? tournament.tiktok_live_url,
      tournament_password ?? tournament.tournament_password,
      id
    );

    createNotification(id, 'updated', `Tournament "${name || tournament.name}" has been updated.`);
    log('success', `Tournament ${id} updated by admin`);
    res.json({ message: 'Tournament updated', id });
  } catch (error) {
    log('error', `Failed to update tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

router.delete('/admin/:id', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    statements.deleteTournament.run(id);
    log('success', `Tournament ${id} deleted by admin`);
    res.json({ message: 'Tournament deleted', id });
  } catch (error) {
    log('error', `Failed to delete tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// ==================== PUBLIC ROUTES ====================

router.get('/', (req, res) => {
  try {
    const tournaments = statements.getApprovedTournaments.all();
    res.json({ tournaments });
  } catch (error) {
    log('error', `Failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

router.get('/archive', (req, res) => {
  try {
    const tournaments = statements.getArchiveTournaments.all();
    res.json({ tournaments });
  } catch (error) {
    log('error', `Failed to fetch archive: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

router.post('/', submitLimiter, (req, res) => {
  try {
    const {
      name, description, host_name, start_date, end_date,
      registration_deadline, format, max_players, prize,
      rules, tiktok_username, tiktok_live_url, tournament_password
    } = req.body;

    if (!name || !host_name || !start_date) {
      return res.status(400).json({ error: 'Name, organizer name, and start date are required' });
    }

    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }

    const result = statements.insertTournament.run(
      name,
      description || '',
      host_name,
      start_date,
      end_date || null,
      registration_deadline || null,
      format || '1v1 Single Elimination',
      max_players ? parseInt(max_players) : null,
      prize || '',
      rules || '',
      tiktok_username || '',
      tiktok_live_url || '',
      tournament_password || '',
      'pending'
    );

    log('success', `Tournament submitted: ${name} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Tournament submitted for review' });
  } catch (error) {
    log('error', `Failed to submit tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit tournament' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const tournament = statements.getTournamentById.get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registrations = statements.getRegistrationsByTournament.all(req.params.id);
    const notifications = statements.getNotificationsByTournament.all(req.params.id);
    res.json({
      tournament,
      registrations,
      participantCount: registrations.length,
      notifications: notifications.slice(0, 20)
    });
  } catch (error) {
    log('error', `Failed to fetch tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// ==================== REGISTRATION ROUTES ====================

router.post('/:id/register', (req, res) => {
  try {
    const { id } = req.params;
    const { player_name, player_tag, tiktok_username } = req.body;

    if (!player_name || !player_tag) {
      return res.status(400).json({ error: 'Player name and player tag are required' });
    }

    const cleanTag = validatePlayerTag(player_tag);
    if (!cleanTag) {
      return res.status(400).json({ error: 'Invalid player tag. Must be 3-10 alphanumeric characters.' });
    }

    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (!PUBLIC_STATUSES.includes(tournament.status)) {
      return res.status(400).json({ error: 'Registration is not open for this tournament' });
    }

    if (tournament.status === 'registration_closed' || tournament.status === 'live') {
      return res.status(400).json({ error: 'Registration is closed for this tournament' });
    }

    const existing = statements.getRegistrationByPlayer.get(id, cleanTag);
    if (existing) {
      return res.status(409).json({ error: 'You are already registered for this tournament' });
    }

    const count = statements.getRegistrationCount.get(id).count;
    if (tournament.max_players && count >= tournament.max_players) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    statements.insertRegistration.run(id, player_name, cleanTag, tiktok_username || '');
    createNotification(id, 'registration', `${player_name} has registered for the tournament.`);

    log('success', `Player ${player_name} (${cleanTag}) registered for tournament ${id}`);
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    log('error', `Failed to register: ${error.message}`);
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.get('/:id/registrations', (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registrations = statements.getRegistrationsByTournament.all(id);
    res.json({ registrations, count: registrations.length });
  } catch (error) {
    log('error', `Failed to fetch registrations: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// ==================== PLAYER STATS (Hall of Fame Foundation) ====================

router.get('/hall-of-fame', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const stats = statements.getTopPlayerStats.all(limit);
    res.json({ stats });
  } catch (error) {
    log('error', `Failed to fetch hall of fame: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch hall of fame' });
  }
});

export default router;
