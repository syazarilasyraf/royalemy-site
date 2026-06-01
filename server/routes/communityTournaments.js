import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';

const router = express.Router();

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : '📡';
  if (data) {
    console.log(`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

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

// Stricter rate limit for tournament submissions: 3 per hour per IP
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
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

// ==================== PUBLIC ROUTES ====================

// List approved upcoming tournaments
router.get('/', (req, res) => {
  try {
    const tournaments = statements.getApprovedTournaments.all();
    res.json({ tournaments });
  } catch (error) {
    log('error', `Failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get single tournament by ID
router.get('/:id', (req, res) => {
  try {
    const tournament = statements.getTournamentById.get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json({ tournament });
  } catch (error) {
    log('error', `Failed to fetch tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Submit a new tournament (auto-approved, rate limited)
router.post('/', submitLimiter, (req, res) => {
  try {
    const {
      name,
      description,
      host_name,
      tournament_tag,
      start_date,
      end_date,
      format,
      max_players,
      prize,
      discord_link,
      contact_info
    } = req.body;

    if (!name || !host_name || !start_date) {
      return res.status(400).json({ error: 'Name, host name, and start date are required' });
    }

    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }

    const result = statements.insertTournament.run(
      name,
      description || '',
      host_name,
      tournament_tag || '',
      start_date,
      end_date || null,
      format || '1v1',
      max_players ? parseInt(max_players) : null,
      prize || '',
      discord_link || '',
      contact_info || '',
      'approved'
    );

    log('success', `Tournament submitted: ${name} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Tournament created successfully'
    });
  } catch (error) {
    log('error', `Failed to submit tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit tournament' });
  }
});

// ==================== ADMIN ROUTES ====================

// List all tournaments (admin)
router.get('/admin', validateAdminKey, (req, res) => {
  try {
    const tournaments = statements.getAllTournaments.all();
    res.json({ tournaments });
  } catch (error) {
    log('error', `Admin failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Delete tournament (admin)
router.delete('/:id', validateAdminKey, (req, res) => {
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

export default router;
