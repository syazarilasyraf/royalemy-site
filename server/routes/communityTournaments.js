import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { log } from '../logger.js';
import { validateAdminKey, sanitizeHtml } from '../middleware/auth.js';
import {
  sendPushNotifications,
  getNotificationsWithReadStatus,
  markNotificationRead,
  markAllNotificationsRead,
  pushConfigured,
  getVapidPublicKey
} from '../services/notifications.js';

const router = express.Router();

const pushDbEnabled = !!statements.insertPushSubscription;

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

function validatePlayerTag(tag) {
  if (!tag) return false;
  const clean = tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.length >= 3 && clean.length <= 10 ? clean : false;
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

// Promote waitlisted players to registered when spots open.
// Returns { promoted: number, names: string[] }
function promoteWaitlistedPlayers(tournamentId, limit = null) {
  try {
    const tournament = statements.getTournamentById.get(tournamentId);
    if (!tournament || !tournament.max_players) return { promoted: 0, names: [] };

    const registeredCount = statements.getRegistrationCount.get(tournamentId).count;
    const available = tournament.max_players - registeredCount;
    const toPromote = Math.max(0, Math.min(available, limit ?? available));
    if (toPromote <= 0) return { promoted: 0, names: [] };

    const tags = [];
    for (let i = 0; i < toPromote; i++) {
      const waitlist = statements.getWaitlistByTournament.all(tournamentId);
      const next = waitlist[0];
      if (!next) break;
      const position = next.waitlist_position;
      statements.updateRegistrationStatus.run('registered', null, next.id);
      statements.decrementWaitlistPositions.run(tournamentId, position);
      tags.push(next.player_tag);
    }

    if (tags.length > 0) {
      log('success', `Auto-promoted ${tags.length} waitlisted player(s) for tournament ${tournamentId}: ${tags.join(', ')}`);
    }
    return { promoted: tags.length, tags };
  } catch (e) {
    log('warn', `Failed to promote waitlisted players for tournament ${tournamentId}: ${e.message}`);
    return { promoted: 0, names: [] };
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

// Rate limit for registrations: 10 per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'You can only register for 10 tournaments per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Tournament registration rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Rate limit for push subscriptions: 10 per hour per IP
const pushSubscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many push subscription requests. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Push subscription rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// ==================== ADMIN ROUTES (must be before /:id) ====================

function logAdminAction(req, action, resource, resourceId, details = null) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const detailStr = details ? JSON.stringify(details).slice(0, 500) : null;
    statements.insertAdminAction.run(action, resource, String(resourceId), detailStr, ip);
  } catch (e) {
    log('warn', `Failed to log admin action: ${e.message}`);
  }
}

router.get('/admin', validateAdminKey, (req, res) => {
  try {
    const { search, status } = req.query;
    let tournaments = statements.getAllTournaments.all();

    if (status && VALID_STATUSES.includes(status)) {
      tournaments = tournaments.filter(t => t.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      tournaments = tournaments.filter(t =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.host_name && t.host_name.toLowerCase().includes(q))
      );
    }

    res.json({ tournaments });
  } catch (error) {
    log('error', `Admin failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Bulk operations
router.post('/admin/bulk', validateAdminKey, (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'action and ids[] are required' });
    }

    const results = [];
    for (const id of ids) {
      try {
        const tournament = statements.getTournamentById.get(id);
        if (!tournament) {
          results.push({ id, success: false, error: 'Not found' });
          continue;
        }

        if (action === 'approve') {
          if (tournament.status !== 'pending') {
            results.push({ id, success: false, error: 'Not pending' });
            continue;
          }
          statements.updateTournamentStatus.run('approved', id);
          log('success', `Tournament ${id} approved (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'reject') {
          statements.updateTournamentStatus.run('rejected', id);
          log('success', `Tournament ${id} rejected (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'delete') {
          statements.deleteTournament.run(id);
          log('success', `Tournament ${id} deleted (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'status' && req.body.status) {
          if (!VALID_STATUSES.includes(req.body.status)) {
            results.push({ id, success: false, error: 'Invalid status' });
            continue;
          }
          statements.updateTournamentStatus.run(req.body.status, id);
          log('success', `Tournament ${id} status updated to ${req.body.status} (bulk)`);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Unknown action' });
        }
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    logAdminAction(req, 'bulk', 'tournament', ids.join(','), { action, results });
    res.json({ results });
  } catch (error) {
    log('error', `Bulk tournament operation failed: ${error.message}`);
    res.status(500).json({ error: 'Bulk operation failed' });
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
    log('success', `Tournament ${id} approved`);
    logAdminAction(req, 'approve', 'tournament', id, { name: tournament.name });
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
    log('success', `Tournament ${id} rejected`);
    logAdminAction(req, 'reject', 'tournament', id, { name: tournament.name });
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
    log('success', `Tournament ${id} status updated to ${status}`);
    logAdminAction(req, 'status', 'tournament', id, { name: tournament.name, status });
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
        updatePlayerStats(tag, reg.player_name || tag, false, false, true);
      }
    }

    sendPushNotifications(id, `🏆 Winners Announced: ${tournament.name}`, `The winners for ${tournament.name} have been announced! Check out the results.`);
    log('success', `Tournament ${id} winners updated`);
    logAdminAction(req, 'winners', 'tournament', id, { name: tournament.name, winners: { winner_1st, winner_2nd, winner_3rd } });
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
    log('success', `Tournament ${id} prize status updated to ${prize_status}`);
    logAdminAction(req, 'prize_status', 'tournament', id, { name: tournament.name, prize_status });
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

    const newMaxPlayers = max_players ? parseInt(max_players) : tournament.max_players;
    statements.updateTournament.run(
      name ?? tournament.name,
      description ?? tournament.description,
      host_name ?? tournament.host_name,
      start_date ?? tournament.start_date,
      end_date ?? tournament.end_date,
      registration_deadline ?? tournament.registration_deadline,
      format ?? tournament.format,
      newMaxPlayers,
      prize ?? tournament.prize,
      rules ?? tournament.rules,
      tiktok_username ?? tournament.tiktok_username,
      tiktok_live_url ?? tournament.tiktok_live_url,
      tournament_password ?? tournament.tournament_password,
      id
    );

    // Auto-promote from waitlist if capacity increased
    let promoted = { promoted: 0, names: [] };
    if (newMaxPlayers > tournament.max_players) {
      promoted = promoteWaitlistedPlayers(id, newMaxPlayers - tournament.max_players);
    }

    log('success', `Tournament ${id} updated by admin`);
    logAdminAction(req, 'edit', 'tournament', id, { name: tournament.name, promoted: promoted.names });
    res.json({ message: 'Tournament updated', id, promoted });
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
    sendPushNotifications(id, `❌ Tournament Cancelled: ${tournament.name}`, `${tournament.name} has been cancelled.`);
    statements.deleteTournament.run(id);
    log('success', `Tournament ${id} deleted by admin`);
    logAdminAction(req, 'delete', 'tournament', id, { name: tournament.name });
    res.json({ message: 'Tournament deleted', id });
  } catch (error) {
    log('error', `Failed to delete tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

router.delete('/admin/:id/registrations/:regId', validateAdminKey, (req, res) => {
  try {
    const { id, regId } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registration = statements.getAllRegistrationsByTournament.all(id).find(r => r.id === parseInt(regId));
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    const wasRegistered = registration.status === 'registered';
    statements.deleteRegistration.run(regId);

    // Auto-promote from waitlist if a registered slot was freed
    let promoted = { promoted: 0, tags: [] };
    if (wasRegistered) {
      promoted = promoteWaitlistedPlayers(id, 1);
    }

    log('success', `Registration ${regId} deleted from tournament ${id}`);
    logAdminAction(req, 'delete_registration', 'tournament', id, { regId, player_tag: registration.player_tag, promoted: promoted.tags });
    res.json({ message: 'Registration deleted', id: regId, promoted });
  } catch (error) {
    log('error', `Failed to delete registration: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

router.post('/admin/:id/registrations/:regId/edit', validateAdminKey, (req, res) => {
  try {
    const { id, regId } = req.params;
    const { player_name, player_tag, tiktok_username } = req.body;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registration = statements.getRegistrationsByTournament.all(id).find(r => r.id === parseInt(regId));
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    const cleanTag = validatePlayerTag(player_tag);
    if (player_tag && !cleanTag) {
      return res.status(400).json({ error: 'Invalid player tag. Must be 3-10 alphanumeric characters.' });
    }
    statements.updateRegistration.run(
      player_name || registration.player_name,
      cleanTag || registration.player_tag,
      tiktok_username !== undefined ? tiktok_username : registration.tiktok_username,
      regId
    );
    log('success', `Registration ${regId} updated in tournament ${id}`);
    logAdminAction(req, 'edit_registration', 'tournament', id, { regId, player_tag: cleanTag || registration.player_tag });
    res.json({ message: 'Registration updated', id: regId });
  } catch (error) {
    log('error', `Failed to update registration: ${error.message}`);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

// Export tournament registrations as CSV
router.get('/admin/:id/registrations/export', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registrations = statements.getRegistrationsByTournament.all(id);
    const headers = ['ID', 'Player Tag', 'TikTok Username', 'Registered At'];
    const rows = registrations.map(r => [
      r.id,
      r.player_tag,
      `"${(r.tiktok_username || '').replace(/"/g, '""')}"`,
      r.registered_at
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_registrations.csv"`);
    res.send(csv);
  } catch (error) {
    log('error', `Failed to export registrations: ${error.message}`);
    res.status(500).json({ error: 'Failed to export registrations' });
  }
});

// ==================== PUBLIC ROUTES ====================

router.get('/', (req, res) => {
  try {
    const tournaments = statements.getApprovedTournaments.all();
    res.set('Cache-Control', 'no-store');
    res.json({ tournaments });
  } catch (error) {
    log('error', `Failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

router.get('/archive', (req, res) => {
  try {
    const tournaments = statements.getArchiveTournaments.all();
    res.set('Cache-Control', 'no-store');
    res.json({ tournaments });
  } catch (error) {
    log('error', `Failed to fetch archive: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// Push notification public key (must be before /:id)
router.get('/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey });
});

// Legacy alias: global notifications feed (new canonical path is /api/notifications)
router.get('/notifications', (req, res) => {
  try {
    const endpoint = req.query.endpoint || '';
    const result = getNotificationsWithReadStatus(endpoint);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  } catch (error) {
    log('error', `Failed to fetch notifications: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/notifications/:notifId/read', (req, res) => {
  try {
    const { notifId } = req.params;
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    markNotificationRead(parseInt(notifId), endpoint);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    log('error', `Failed to mark notification read: ${error.message}`);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.post('/notifications/read-all', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    markAllNotificationsRead(endpoint);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    log('error', `Failed to mark all read: ${error.message}`);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Hall of Fame (must be before /:id)
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

    // Duplicate detection: same name + host within 24h
    const duplicate = statements.checkDuplicateTournament.get(name.trim(), host_name.trim());
    if (duplicate) {
      return res.status(409).json({ error: 'A tournament with this name and host was already submitted within the last 24 hours.' });
    }

    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }

    const result = statements.insertTournament.run(
      sanitizeHtml(name),
      sanitizeHtml(description) || '',
      sanitizeHtml(host_name),
      start_date,
      end_date || null,
      registration_deadline || null,
      format || '1v1 Single Elimination',
      max_players ? parseInt(max_players) : null,
      sanitizeHtml(prize) || '',
      sanitizeHtml(rules) || '',
      sanitizeHtml(tiktok_username) || '',
      sanitizeHtml(tiktok_live_url) || '',
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
    res.set('Cache-Control', 'no-store');
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

router.post('/:id/register', registerLimiter, (req, res) => {
  try {
    const { id } = req.params;
    const { player_tag, tiktok_username } = req.body;

    if (!player_tag) {
      return res.status(400).json({ error: 'Player tag is required' });
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
    const isFull = tournament.max_players && count >= tournament.max_players;

    if (isFull) {
      // Add to waitlist
      const maxPos = statements.getMaxWaitlistPosition.get(id);
      const position = (maxPos?.max || 0) + 1;
      statements.insertRegistration.run(id, '', cleanTag, tiktok_username || '', 'waitlisted', position);
      log('success', `Player (${cleanTag}) waitlisted for tournament ${id} at position ${position}`);
      res.status(201).json({ message: 'Tournament is full. You have been added to the waitlist.', waitlist: true, position });
    } else {
      statements.insertRegistration.run(id, '', cleanTag, tiktok_username || '', 'registered', null);
      log('success', `Player (${cleanTag}) registered for tournament ${id}`);
      res.status(201).json({ message: 'Registration successful' });
    }
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
    const waitlist = statements.getWaitlistByTournament.all(id);
    res.json({ registrations, waitlist, count: registrations.length, waitlistCount: waitlist.length });
  } catch (error) {
    log('error', `Failed to fetch registrations: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Admin: promote waitlisted player to registered
router.post('/admin/:id/waitlist/:regId/promote', validateAdminKey, (req, res) => {
  try {
    const { id, regId } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registration = statements.getAllRegistrationsByTournament.all(id).find(r => r.id === parseInt(regId));
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    if (registration.status !== 'waitlisted') {
      return res.status(400).json({ error: 'Registration is not on waitlist' });
    }
    const position = registration.waitlist_position;
    statements.updateRegistrationStatus.run('registered', null, regId);
    statements.decrementWaitlistPositions.run(id, position);
    log('success', `Registration ${regId} promoted from waitlist in tournament ${id}`);
    logAdminAction(req, 'promote_waitlist', 'tournament', id, { regId, player_tag: registration.player_tag });
    res.json({ message: 'Player promoted from waitlist', id: regId });
  } catch (error) {
    log('error', `Failed to promote waitlist: ${error.message}`);
    res.status(500).json({ error: 'Failed to promote from waitlist' });
  }
});

// ==================== MATCH TRACKER / BRACKETS ====================

// Public: get matches for a tournament
router.get('/:id/matches', (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const matches = statements.getTournamentMatches.all(id);
    res.json({ matches });
  } catch (error) {
    log('error', `Failed to fetch tournament matches: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Admin: create a match
router.post('/admin/:id/matches', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const { round = 1, match_number, player1_tag, player2_tag, player1_name, player2_name } = req.body;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const p1 = validatePlayerTag(player1_tag);
    const p2 = validatePlayerTag(player2_tag);
    if (!p1 || !p2) {
      return res.status(400).json({ error: 'Both player tags must be valid' });
    }
    if (p1 === p2) {
      return res.status(400).json({ error: 'Player 1 and Player 2 must be different' });
    }

    let num = match_number ? parseInt(match_number) : null;
    if (!num) {
      const max = statements.getMaxMatchNumber.get(id, parseInt(round));
      num = (max?.max || 0) + 1;
    }

    const result = statements.insertTournamentMatch.run(
      id,
      parseInt(round),
      num,
      p1,
      p2,
      sanitizeHtml(player1_name) || p1,
      sanitizeHtml(player2_name) || p2
    );
    log('success', `Match created for tournament ${id}: ${p1} vs ${p2}`);
    logAdminAction(req, 'create_match', 'tournament', id, { round, match_number: num, p1, p2 });
    res.status(201).json({ id: result.lastInsertRowid, message: 'Match created' });
  } catch (error) {
    log('error', `Failed to create tournament match: ${error.message}`);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// Admin: update match result
router.post('/admin/:id/matches/:matchId/result', validateAdminKey, (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { winner_tag, player1_score, player2_score } = req.body;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const match = statements.getTournamentMatchById.get(matchId);
    if (!match || match.tournament_id !== parseInt(id)) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const winner = validatePlayerTag(winner_tag);
    if (!winner) {
      return res.status(400).json({ error: 'Invalid winner tag' });
    }
    if (winner !== match.player1_tag && winner !== match.player2_tag) {
      return res.status(400).json({ error: 'Winner must be one of the two players' });
    }

    statements.updateTournamentMatchResult.run(
      winner,
      player1_score !== undefined ? parseInt(player1_score) : null,
      player2_score !== undefined ? parseInt(player2_score) : null,
      matchId
    );
    log('success', `Match ${matchId} result updated: ${winner} wins`);
    logAdminAction(req, 'match_result', 'tournament', id, { matchId, winner, player1_score, player2_score });
    res.json({ message: 'Match result updated', id: matchId });
  } catch (error) {
    log('error', `Failed to update match result: ${error.message}`);
    res.status(500).json({ error: 'Failed to update match result' });
  }
});

// Admin: edit match details (before result is set)
router.post('/admin/:id/matches/:matchId', validateAdminKey, (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { round, match_number, player1_tag, player2_tag, player1_name, player2_name } = req.body;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const match = statements.getTournamentMatchById.get(matchId);
    if (!match || match.tournament_id !== parseInt(id)) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const p1 = player1_tag ? validatePlayerTag(player1_tag) : match.player1_tag;
    const p2 = player2_tag ? validatePlayerTag(player2_tag) : match.player2_tag;
    if (!p1 || !p2) {
      return res.status(400).json({ error: 'Both player tags must be valid' });
    }

    statements.updateTournamentMatch.run(
      round !== undefined ? parseInt(round) : match.round,
      match_number !== undefined ? parseInt(match_number) : match.match_number,
      p1,
      p2,
      sanitizeHtml(player1_name) || match.player1_name,
      sanitizeHtml(player2_name) || match.player2_name,
      matchId
    );
    log('success', `Match ${matchId} updated in tournament ${id}`);
    logAdminAction(req, 'edit_match', 'tournament', id, { matchId, p1, p2 });
    res.json({ message: 'Match updated', id: matchId });
  } catch (error) {
    log('error', `Failed to update match: ${error.message}`);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// Admin: delete a match
router.delete('/admin/:id/matches/:matchId', validateAdminKey, (req, res) => {
  try {
    const { id, matchId } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const match = statements.getTournamentMatchById.get(matchId);
    if (!match || match.tournament_id !== parseInt(id)) {
      return res.status(404).json({ error: 'Match not found' });
    }
    statements.deleteTournamentMatch.run(matchId);
    log('success', `Match ${matchId} deleted from tournament ${id}`);
    logAdminAction(req, 'delete_match', 'tournament', id, { matchId });
    res.json({ message: 'Match deleted', id: matchId });
  } catch (error) {
    log('error', `Failed to delete match: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// Push subscription endpoints (must be after /:id because they use POST/DELETE)
router.post('/:id/subscribe', pushSubscribeLimiter, (req, res) => {
  if (!pushDbEnabled) {
    return res.status(503).json({ error: 'Push notifications are temporarily unavailable' });
  }
  try {
    const { id } = req.params;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    statements.insertPushSubscription.run(id, endpoint, keys.p256dh, keys.auth);
    log('info', `New push subscription for tournament ${id}`);
    res.json({ message: 'Subscribed to notifications' });
  } catch (error) {
    log('error', `Failed to save push subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

router.post('/:id/unsubscribe', (req, res) => {
  if (!pushDbEnabled) {
    return res.status(503).json({ error: 'Push notifications are temporarily unavailable' });
  }
  try {
    const { id } = req.params;
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    statements.deletePushSubscription.run(id, endpoint);
    log('info', `Push subscription removed for tournament ${id}`);
    res.json({ message: 'Unsubscribed from notifications' });
  } catch (error) {
    log('error', `Failed to remove push subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

export default router;
