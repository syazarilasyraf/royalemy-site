import express from 'express';
import { statements } from '../db.js';

const router = express.Router();

function getAdminKey() {
  return process.env.ROADMAP_ADMIN_KEY;
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : '📡';
  if (data) {
    console.log(`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
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

// ==================== PUBLIC ROUTES ====================

// List all public features (non-pending)
router.get('/features', (req, res) => {
  try {
    const features = statements.getPublicFeatures.all();
    res.json({ features });
  } catch (error) {
    log('error', `Failed to fetch features: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Submit a new feature suggestion
router.post('/features', (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res.status(400).json({ error: 'Feature name must be at least 3 characters' });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Feature name must be under 100 characters' });
    }
    if (description.trim().length > 500) {
      return res.status(400).json({ error: 'Description must be under 500 characters' });
    }

    const result = statements.insertFeature.run(name.trim(), description.trim(), 'pending');
    const feature = statements.getFeatureById.get(result.lastInsertRowid);

    log('success', `New feature suggestion submitted: #${feature.id} - ${feature.name}`);
    res.status(201).json({ feature, message: 'Suggestion submitted for review' });
  } catch (error) {
    log('error', `Failed to submit feature: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit suggestion' });
  }
});

// Vote for a feature
router.post('/vote', (req, res) => {
  try {
    const { featureId, voterId } = req.body;

    if (!featureId || !voterId) {
      return res.status(400).json({ error: 'featureId and voterId are required' });
    }

    const feature = statements.getFeatureById.get(featureId);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    if (feature.status === 'pending') {
      return res.status(400).json({ error: 'Cannot vote on pending features' });
    }

    // Check if already voted
    const existing = statements.getVote.get(featureId, voterId);
    if (existing) {
      return res.status(409).json({ error: 'You already voted for this feature', feature });
    }

    statements.insertVote.run(featureId, voterId);
    statements.incrementVotes.run(featureId);

    const updated = statements.getFeatureById.get(featureId);
    log('success', `Vote added to feature #${featureId} by ${voterId.slice(0, 8)}...`);
    res.json({ feature: updated, voted: true });
  } catch (error) {
    log('error', `Failed to vote: ${error.message}`);
    res.status(500).json({ error: 'Failed to register vote' });
  }
});

// Unvote (remove vote)
router.delete('/vote', (req, res) => {
  try {
    const { featureId, voterId } = req.body;

    if (!featureId || !voterId) {
      return res.status(400).json({ error: 'featureId and voterId are required' });
    }

    const existing = statements.getVote.get(featureId, voterId);
    if (!existing) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    statements.deleteVote.run(featureId, voterId);
    statements.decrementVotes.run(featureId);

    const updated = statements.getFeatureById.get(featureId);
    log('success', `Vote removed from feature #${featureId}`);
    res.json({ feature: updated, voted: false });
  } catch (error) {
    log('error', `Failed to remove vote: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove vote' });
  }
});

// Get user's voted features
router.get('/votes/:voterId', (req, res) => {
  try {
    const { voterId } = req.params;
    if (!voterId) {
      return res.status(400).json({ error: 'voterId is required' });
    }
    const votes = statements.getUserVotes.all(voterId).map(v => v.feature_id);
    res.json({ votedFeatures: votes });
  } catch (error) {
    log('error', `Failed to fetch votes: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// ==================== ADMIN ROUTES ====================

// List all features (including pending)
router.get('/admin/features', validateAdminKey, (req, res) => {
  try {
    const features = statements.getAllFeatures.all();
    res.json({ features });
  } catch (error) {
    log('error', `Admin: Failed to fetch all features: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Approve a pending feature
router.post('/admin/features/:id/approve', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const feature = statements.getFeatureById.get(id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    if (feature.status !== 'pending') {
      return res.status(400).json({ error: 'Feature is not pending' });
    }

    statements.updateFeatureStatus.run('planned', id);
    const updated = statements.getFeatureById.get(id);
    log('success', `Admin approved feature #${id}: ${updated.name}`);
    res.json({ feature: updated });
  } catch (error) {
    log('error', `Admin: Failed to approve feature: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve feature' });
  }
});

// Reject a feature
router.post('/admin/features/:id/reject', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const feature = statements.getFeatureById.get(id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    statements.updateFeatureStatus.run('rejected', id);
    const updated = statements.getFeatureById.get(id);
    log('success', `Admin rejected feature #${id}: ${updated.name}`);
    res.json({ feature: updated });
  } catch (error) {
    log('error', `Admin: Failed to reject feature: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject feature' });
  }
});

// Update feature status (any status)
router.post('/admin/features/:id/status', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'planned', 'in_progress', 'released', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const feature = statements.getFeatureById.get(id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    statements.updateFeatureStatus.run(status, id);
    const updated = statements.getFeatureById.get(id);
    log('success', `Admin changed feature #${id} status to ${status}`);
    res.json({ feature: updated });
  } catch (error) {
    log('error', `Admin: Failed to update status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
