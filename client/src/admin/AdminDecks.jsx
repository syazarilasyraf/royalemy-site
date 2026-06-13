import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAdminCommunityDecks,
  approveCommunityDeck,
  rejectCommunityDeck,
  updateCommunityDeckStatus,
  deleteCommunityDeck,
  bulkDecks,
} from '../services/api';
import DeckPreview from '../components/DeckPreview';

const STATUS_BADGES = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AdminDecks() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin') || '';

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchDecks = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAdminCommunityDecks(adminKey, { search, status: statusFilter });
      setDecks(data.decks || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message || 'Failed to load decks');
    } finally {
      setLoading(false);
    }
  }, [adminKey, search, statusFilter]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleApprove = async (id) => {
    try {
      await approveCommunityDeck(id, adminKey);
      showMessage(`Deck #${id} approved`);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to approve deck');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectCommunityDeck(id, adminKey);
      showMessage(`Deck #${id} rejected`);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to reject deck');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateCommunityDeckStatus(id, status, adminKey);
      showMessage(`Deck #${id} status updated to ${STATUS_LABELS[status] || status}`);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete deck #${id}?`)) return;
    setDeletingId(id);
    try {
      await deleteCommunityDeck(id, adminKey);
      showMessage(`Deck #${id} deleted`);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to delete deck');
    } finally {
      setDeletingId(null);
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
    if (selectedIds.size === filteredDecks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDecks.map(d => d.id)));
    }
  };

  const handleBulk = async (action, extra = {}) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} deck(s)?`)) return;
    setLoading(true);
    try {
      const res = await bulkDecks(action, ids, adminKey, extra);
      const succeeded = res.results.filter(r => r.success).length;
      showMessage(`${action} applied to ${succeeded}/${ids.length} decks`);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredDecks = decks;

  return (
    <div className="admin-decks-page">
      <div className="admin-decks-header">
        <h1>🃏 Community Decks Admin</h1>
        <p>Manage submitted community decks. Approve, reject, change status, or delete.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="admin-filters">
        <input
          type="text"
          className="input input-sm"
          placeholder="Search decks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchDecks()}
        />
        <select
          className="input input-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchDecks} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <span className="admin-decks-meta">{filteredDecks.length} deck(s)</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span>{selectedIds.size} selected</span>
          <button className="btn btn-success btn-sm" onClick={() => handleBulk('approve')} disabled={loading}>Approve</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleBulk('reject')} disabled={loading}>Reject</button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleBulk('delete')} disabled={loading}>Delete</button>
        </div>
      )}

      <div className="admin-decks-table-wrapper">
        <table className="admin-decks-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filteredDecks.length} onChange={toggleSelectAll} /></th>
              <th>ID</th>
              <th>Deck</th>
              <th>Author</th>
              <th>Description</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDecks.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="admin-decks-empty">No decks found</td>
              </tr>
            )}
            {loading && filteredDecks.length === 0 && (
              <tr>
                <td colSpan={8} className="admin-decks-empty">Loading decks...</td>
              </tr>
            )}
            {filteredDecks.map((deck) => {
              const cardIds = Array.isArray(deck.cardIds) ? deck.cardIds : (typeof deck.cardIds === 'string' ? JSON.parse(deck.cardIds || '[]') : []);
              const tags = Array.isArray(deck.tags) ? deck.tags : (typeof deck.tags === 'string' ? JSON.parse(deck.tags || '[]') : []);
              return (
              <tr key={deck.id}>
                <td><input type="checkbox" checked={selectedIds.has(deck.id)} onChange={() => toggleSelect(deck.id)} /></td>
                <td className="admin-decks-id">#{deck.id}</td>
                <td className="admin-decks-preview">
                  <DeckPreview cardIds={cardIds} compact />
                  <div className="admin-decks-tags">
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="badge badge-secondary">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="admin-decks-author">{deck.author_name || 'Anonymous'}</td>
                <td className="admin-decks-description">{deck.description || '-'}</td>
                <td>
                  <span className={`badge ${STATUS_BADGES[deck.status] || 'badge-secondary'}`}>
                    {STATUS_LABELS[deck.status] || deck.status}
                  </span>
                </td>
                <td className="admin-decks-date">{formatDate(deck.created_at)}</td>
                <td className="admin-decks-actions">
                  <div className="admin-decks-action-group">
                    {deck.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(deck.id)}
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(deck.id)}
                          disabled={loading}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <select
                      className="input input-sm"
                      value={deck.status}
                      onChange={(e) => handleStatusChange(deck.id, e.target.value)}
                      disabled={loading}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <button
                      className="btn btn-danger btn-sm btn-outline"
                      onClick={() => handleDelete(deck.id)}
                      disabled={deletingId === deck.id || loading}
                    >
                      {deletingId === deck.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            )}
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .admin-decks-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }
        .admin-decks-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }
        .admin-decks-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
        }
        .admin-decks-header p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          max-width: 500px;
          margin: 0 auto;
        }
        .admin-decks-meta {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .admin-decks-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
        }
        .admin-decks-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .admin-decks-table thead th {
          text-align: left;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .admin-decks-table tbody tr {
          border-top: 1px solid var(--bg-tertiary);
        }
        .admin-decks-table tbody tr:hover {
          background: var(--bg-hover);
        }
        .admin-decks-table td {
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--text-primary);
          vertical-align: top;
        }
        .admin-decks-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .admin-decks-preview {
          min-width: 180px;
        }
        .admin-decks-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: var(--spacing-xs);
        }
        .admin-decks-author {
          font-weight: 600;
          white-space: nowrap;
        }
        .admin-decks-description {
          max-width: 240px;
          word-break: break-word;
          color: var(--text-secondary);
          font-size: 0.8125rem;
        }
        .admin-decks-date {
          white-space: nowrap;
          color: var(--text-muted);
          font-size: 0.8125rem;
        }
        .admin-decks-actions {
          min-width: 220px;
        }
        .admin-decks-action-group {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          align-items: center;
        }
        .admin-decks-action-group .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }
        .admin-decks-action-group select {
          width: auto;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          min-width: 100px;
        }
        .admin-decks-empty {
          text-align: center;
          color: var(--text-muted);
          padding: var(--spacing-xl) !important;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid currentColor;
        }
        .btn-outline.btn-danger {
          color: #ef4444;
        }
        .btn-outline.btn-danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        @media (max-width: 768px) {
          .admin-decks-table {
            font-size: 0.8125rem;
          }
          .admin-decks-action-group {
            flex-direction: column;
            align-items: flex-start;
          }
          .admin-decks-description {
            max-width: 120px;
          }
        }
      `}</style>
    </div>
  );
}
