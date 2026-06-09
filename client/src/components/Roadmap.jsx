import { useState, useEffect, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getRoadmapFeatures,
  submitFeature,
  voteFeature,
  unvoteFeature,
  getUserVotes,
  getAdminFeatures,
  approveFeature,
  rejectFeature,
  updateFeatureStatus,
  bulkFeatures,
} from '../services/api.js';

const TABS = [
  { key: 'planned', label: 'Planned', color: '#3b82f6' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'released', label: 'Released', color: '#22c55e' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
];

const STATUS_LABELS = {
  planned: 'Planned',
  in_progress: 'In Progress',
  released: 'Released',
  rejected: 'Rejected',
  pending: 'Pending Review',
};

const STATUS_BADGES = {
  planned: 'badge-primary',
  in_progress: 'badge-warning',
  released: 'badge-success',
  rejected: 'badge-danger',
  pending: 'badge-secondary',
};

function generateVoterId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getVoterId() {
  let id = localStorage.getItem('royalemy_voter_id');
  if (!id) {
    id = generateVoterId();
    localStorage.setItem('royalemy_voter_id', id);
  }
  return id;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ==================== SUGGEST MODAL ====================

function SuggestModal({ onClose, onSubmit, loading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 3) {
      setError('Feature name must be at least 3 characters');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }
    onSubmit(name.trim(), description.trim());
  };

  return (
    <div className="roadmap-modal-overlay" onClick={onClose}>
      <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="roadmap-modal-header">
          <h3>Suggest a Feature</h3>
          <button className="roadmap-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="roadmap-form-group">
            <label>Feature Name</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Community Deck Feed"
              maxLength={100}
              required
            />
          </div>
          <div className="roadmap-form-group">
            <label>Description</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this feature should do..."
              rows={4}
              maxLength={500}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Suggestion'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==================== ADMIN PANEL ====================

function AdminPanel({ adminKey, onRefresh }) {
  const [allFeatures, setAllFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminFeatures(adminKey, { search, status: statusFilter });
      setAllFeatures(data.features || []);
      setSelectedIds(new Set());
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, search, statusFilter]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleApprove = async (id) => {
    try {
      await approveFeature(id, adminKey);
      setMessage('Feature approved');
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectFeature(id, adminKey);
      setMessage('Feature rejected');
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateFeatureStatus(id, status, adminKey);
      setMessage(`Status updated to ${STATUS_LABELS[status]}`);
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === allFeatures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFeatures.map(f => f.id)));
    }
  };

  const handleBulk = async (action, extra = {}) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} feature(s)?`)) return;
    setLoading(true);
    try {
      const res = await bulkFeatures(action, ids, adminKey, extra);
      const succeeded = res.results.filter(r => r.success).length;
      setMessage(`${action} applied to ${succeeded}/${ids.length} features`);
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message || 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const pending = allFeatures.filter((f) => f.status === 'pending');

  return (
    <div className="roadmap-admin">
      <h2 className="roadmap-admin-title">🛡️ Admin Panel</h2>
      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <div className="admin-filters-bar">
        <input
          type="text"
          className="input input-sm"
          placeholder="Search features..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchAdminData()}
        />
        <select
          className="input input-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="released">Released</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchAdminData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <span className="admin-meta">{allFeatures.length} feature(s)</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span>{selectedIds.size} selected</span>
          <button className="btn btn-success btn-sm" onClick={() => handleBulk('approve')} disabled={loading}>Approve</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleBulk('reject')} disabled={loading}>Reject</button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleBulk('delete')} disabled={loading}>Delete</button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="roadmap-admin-section">
          <h3>Pending Review ({pending.length})</h3>
          <div className="roadmap-admin-list">
            {pending.map((f) => (
              <div key={f.id} className="roadmap-admin-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={selectedIds.has(f.id)} onChange={() => toggleSelect(f.id)} />
                  <div>
                    <strong>{f.name}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {f.description}
                    </p>
                  </div>
                </div>
                <div className="roadmap-admin-actions">
                  <button className="btn btn-success btn-sm" onClick={() => handleApprove(f.id)}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleReject(f.id)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="roadmap-admin-section">
        <h3>All Features</h3>
        <div className="roadmap-admin-list">
          {allFeatures.map((f) => (
            <div key={f.id} className="roadmap-admin-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={selectedIds.has(f.id)} onChange={() => toggleSelect(f.id)} />
                <div>
                  <strong>{f.name}</strong>
                  <span className={`badge ${STATUS_BADGES[f.status] || 'badge-secondary'}`} style={{ marginLeft: '8px' }}>
                    {STATUS_LABELS[f.status]}
                  </span>
                </div>
              </div>
              <select
                className="input"
                style={{ width: 'auto', fontSize: '0.8125rem', padding: '4px 8px' }}
                value={f.status}
                onChange={(e) => handleStatusChange(f.id, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="released">Released</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

function Roadmap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const adminKey = searchParams.get('admin');

  const [activeTab, setActiveTab] = useState('planned');
  const [features, setFeatures] = useState([]);
  const [votedFeatures, setVotedFeatures] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [votingId, setVotingId] = useState(null);

  const voterId = getVoterId();

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getRoadmapFeatures();
      setFeatures(data.features || []);
    } catch (err) {
      setError(err.message || 'Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVotes = useCallback(async () => {
    try {
      const data = await getUserVotes(voterId);
      setVotedFeatures(new Set(data.votedFeatures || []));
    } catch {
      // silently fail — voting state is non-critical
    }
  }, [voterId]);

  useEffect(() => {
    fetchFeatures();
    fetchVotes();
  }, [fetchFeatures, fetchVotes]);

  const filteredFeatures = features.filter((f) => f.status === activeTab);

  const handleVote = async (featureId) => {
    const alreadyVoted = votedFeatures.has(featureId);
    setVotingId(featureId);
    try {
      if (alreadyVoted) {
        await unvoteFeature(featureId, voterId);
        setVotedFeatures((prev) => {
          const next = new Set(prev);
          next.delete(featureId);
          return next;
        });
        setFeatures((prev) =>
          prev.map((f) => (f.id === featureId ? { ...f, votes: Math.max(0, f.votes - 1) } : f))
        );
      } else {
        await voteFeature(featureId, voterId);
        setVotedFeatures((prev) => new Set(prev).add(featureId));
        setFeatures((prev) =>
          prev.map((f) => (f.id === featureId ? { ...f, votes: f.votes + 1 } : f))
        );
      }
    } catch (err) {
      if (err.message?.includes('already voted')) {
        setVotedFeatures((prev) => new Set(prev).add(featureId));
      }
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmitSuggestion = async (name, description) => {
    setSubmitting(true);
    try {
      await submitFeature(name, description);
      setSubmitSuccess('Thanks! Your suggestion is pending review.');
      setShowModal(false);
      setTimeout(() => setSubmitSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="roadmap-page">
      {/* Header */}
      <div className="roadmap-header">
        <h1>🗺️ RoyaleMY Roadmap</h1>
        <p>Help shape the future of RoyaleMY. Vote for upcoming features and suggest new ideas.</p>
      </div>

      {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Suggest Button */}
      <div className="roadmap-suggest-bar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          💡 Suggest a Feature
        </button>
      </div>

      {/* Tabs */}
      <div className="roadmap-tabs">
        {TABS.map((tab) => {
          const count = features.filter((f) => f.status === tab.key).length;
          return (
            <button
              key={tab.key}
              className={`roadmap-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="roadmap-tab-label">{tab.label}</span>
              <span className="roadmap-tab-count" style={{ background: tab.color }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feature Cards */}
      <div className="roadmap-grid">
        {loading ? (
          <div className="roadmap-loading">
            <div className="animate-pulse">Loading roadmap...</div>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No features here yet</div>
            <div className="empty-state-text">
              {activeTab === 'planned'
                ? 'Be the first to suggest a feature!'
                : 'Nothing in this status yet.'}
            </div>
          </div>
        ) : (
          filteredFeatures.map((feature) => {
            const isVoted = votedFeatures.has(feature.id);
            const isVoting = votingId === feature.id;
            return (
              <div key={feature.id} className="roadmap-card">
                <div className="roadmap-card-header">
                  <h3 className="roadmap-card-title">{feature.name}</h3>
                  <span className={`badge ${STATUS_BADGES[feature.status] || 'badge-secondary'}`}>
                    {STATUS_LABELS[feature.status]}
                  </span>
                </div>
                <p className="roadmap-card-desc">{feature.description}</p>
                <div className="roadmap-card-footer">
                  <div className="roadmap-card-meta">
                    <span className="roadmap-card-date">{formatDate(feature.created_at)}</span>
                  </div>
                  <button
                    className={`roadmap-vote-btn ${isVoted ? 'voted' : ''}`}
                    onClick={() => handleVote(feature.id)}
                    disabled={isVoting}
                  >
                    <span className="roadmap-vote-icon">{isVoted ? '▲' : '△'}</span>
                    <span className="roadmap-vote-count">{feature.votes}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Panel */}
      {adminKey && <AdminPanel adminKey={adminKey} onRefresh={fetchFeatures} />}

      {/* Modal */}
      {showModal && (
        <SuggestModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitSuggestion}
          loading={submitting}
        />
      )}

      <style>{`
        .roadmap-page {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .roadmap-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .roadmap-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
        }

        .roadmap-header p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .roadmap-suggest-bar {
          display: flex;
          justify-content: center;
          margin-bottom: var(--spacing-lg);
        }

        .roadmap-tabs {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .roadmap-tab {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .roadmap-tab:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }

        .roadmap-tab.active {
          background: var(--bg-hover);
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }

        .roadmap-tab-count {
          font-size: 0.6875rem;
          font-weight: 700;
          color: white;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .roadmap-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-md);
        }

        @media (min-width: 640px) {
          .roadmap-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .roadmap-card {
          background: var(--bg-card);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
        }

        .roadmap-card:hover {
          border-color: var(--accent-primary);
          box-shadow: var(--shadow-lg);
        }

        .roadmap-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .roadmap-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.3;
        }

        .roadmap-card-desc {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: var(--spacing-md);
          flex: 1;
        }

        .roadmap-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
          margin-top: auto;
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--bg-tertiary);
        }

        .roadmap-card-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .roadmap-vote-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-tertiary);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .roadmap-vote-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .roadmap-vote-btn.voted {
          background: rgba(59, 130, 246, 0.2);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .roadmap-vote-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .roadmap-vote-icon {
          font-size: 0.75rem;
        }

        .roadmap-loading {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
          grid-column: 1 / -1;
        }

        /* Modal */
        .roadmap-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: var(--spacing-md);
          animation: fadeIn 0.2s ease;
        }

        .roadmap-modal {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          width: 100%;
          max-width: 480px;
          animation: slideUp 0.25s ease;
        }

        .roadmap-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-lg);
        }

        .roadmap-modal-header h3 {
          margin: 0;
          font-size: 1.125rem;
        }

        .roadmap-modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 4px;
        }

        .roadmap-modal-close:hover {
          color: var(--text-primary);
        }

        .roadmap-form-group {
          margin-bottom: var(--spacing-md);
        }

        .roadmap-form-group label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .roadmap-form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        /* Admin */
        .roadmap-admin {
          margin-top: var(--spacing-xl);
          padding-top: var(--spacing-xl);
          border-top: 2px solid var(--bg-tertiary);
        }

        .roadmap-admin-title {
          font-size: 1.25rem;
          margin-bottom: var(--spacing-lg);
        }

        .roadmap-admin-section {
          margin-bottom: var(--spacing-lg);
        }

        .roadmap-admin-section h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-md);
        }

        .roadmap-admin-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .roadmap-admin-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
        }

        .roadmap-admin-actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .roadmap-header h1 {
            font-size: 1.5rem;
          }

          .roadmap-admin-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .roadmap-admin-actions {
            width: 100%;
          }

          .roadmap-admin-actions .btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(Roadmap);
