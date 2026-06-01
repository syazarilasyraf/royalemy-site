import express from 'express';
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

// Submit a new tournament (auto-approved)
router.post('/', (req, res) => {
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

export default router;
