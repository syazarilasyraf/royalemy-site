import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { log } from '../logger.js';
import { validateAdminKey, sanitizeHtml } from '../middleware/auth.js';

const router = express.Router();

// Rate limit for voting: 30 per hour per IP
const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    error: 'You can only cast 30 votes per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Roadmap vote rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

function logAdminAction(req, action, resource, resourceId, details = null) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const detailStr = details ? JSON.stringify(details).slice(0, 500) : null;
    statements.insertAdminAction.run(action, resource, String(resourceId), detailStr, ip);
  } catch (e) {
    log('warn', `Failed to log admin action: ${e.message}`);
  }
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

    const result = statements.insertFeature.run(sanitizeHtml(name), sanitizeHtml(description), 'pending');
    const feature = statements.getFeatureById.get(result.lastInsertRowid);

    log('success', `New feature suggestion submitted: #${feature.id} - ${feature.name}`);
    res.status(201).json({ feature, message: 'Suggestion submitted for review' });
  } catch (error) {
    log('error', `Failed to submit feature: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit suggestion' });
  }
});

// Vote for a feature
router.post('/vote', voteLimiter, (req, res) => {
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
router.delete('/vote', voteLimiter, (req, res) => {
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
    const { search, status } = req.query;
    let features = statements.getAllFeatures.all();

    if (status) {
      features = features.filter(f => f.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      features = features.filter(f =>
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q))
      );
    }

    res.json({ features });
  } catch (error) {
    log('error', `Admin: Failed to fetch all features: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Bulk operations
router.post('/admin/features/bulk', validateAdminKey, (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'action and ids[] are required' });
    }

    const results = [];
    for (const id of ids) {
      try {
        const feature = statements.getFeatureById.get(id);
        if (!feature) {
          results.push({ id, success: false, error: 'Not found' });
          continue;
        }

        if (action === 'approve') {
          if (feature.status !== 'pending') {
            results.push({ id, success: false, error: 'Not pending' });
            continue;
          }
          statements.updateFeatureStatus.run('planned', id);
          log('success', `Admin approved feature #${id} (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'reject') {
          statements.updateFeatureStatus.run('rejected', id);
          log('success', `Admin rejected feature #${id} (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'delete') {
          statements.deleteFeature.run(id);
          log('success', `Admin deleted feature #${id} (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'status' && req.body.status) {
          const validStatuses = ['pending', 'planned', 'in_progress', 'released', 'rejected'];
          if (!validStatuses.includes(req.body.status)) {
            results.push({ id, success: false, error: 'Invalid status' });
            continue;
          }
          statements.updateFeatureStatus.run(req.body.status, id);
          log('success', `Admin changed feature #${id} status to ${req.body.status} (bulk)`);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Unknown action' });
        }
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    logAdminAction(req, 'bulk', 'feature', ids.join(','), { action, results });
    res.json({ results });
  } catch (error) {
    log('error', `Bulk feature operation failed: ${error.message}`);
    res.status(500).json({ error: 'Bulk operation failed' });
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
    logAdminAction(req, 'approve', 'feature', id, { name: updated.name });
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
    logAdminAction(req, 'reject', 'feature', id, { name: updated.name });
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
    logAdminAction(req, 'status', 'feature', id, { name: updated.name, status });
    res.json({ feature: updated });
  } catch (error) {
    log('error', `Admin: Failed to update status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
