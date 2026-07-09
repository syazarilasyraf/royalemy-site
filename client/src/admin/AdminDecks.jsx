import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAdminCommunityDecks,
  approveCommunityDeck,
  rejectCommunityDeck,
  updateCommunityDeckStatus,
  deleteCommunityDeck,
  bulkDecks,
  updateCommunityDeck,
  toggleCommunityDeckAdminPost,
  createCommunityDeckAsAdmin,
} from '../services/api';
import DeckPreview from '../components/DeckPreview';
import { isValidDeckLink, extractCardIds, normalizeDeckLink } from '../utils/deckParser';
import { getCardById } from '../utils/cardMapping';
import { generateDeckTitle, generateDeckDescription } from '../utils/deckTitleGenerator';
import { calculateDynamicAvgElixir, isChampionCard } from '../data/deckSources';

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

function generateDeckTags(cardIds) {
  const names = cardIds.map(id => getCardById(id)?.name?.toLowerCase()).filter(Boolean);
  const tags = [];
  const has = (n) => names.includes(n.toLowerCase());
  const elixir = cardIds.reduce((sum, id) => sum + (getCardById(id)?.elixir || 0), 0) / (cardIds.length || 1);
  if (elixir <= 2.9) tags.push('Fast Cycle');
  else if (elixir >= 4.0) tags.push('Heavy');
  else tags.push('Balanced');
  if (has('hog rider') || has('miner') || has('goblin barrel')) tags.push('Win Condition');
  if (has('golem') || has('giant') || has('royal giant') || has('electro giant')) tags.push('Beatdown');
  if (has('x-bow') || has('mortar')) tags.push('Siege');
  if (has('pekka') || has('mega knight') || has('skeleton king')) tags.push('Tank');
  if (has('tornado') || has('ice wizard') || has('executioner')) tags.push('Control');
  if (cardIds.some(id => isChampionCard(id))) tags.push('Champion');
  return tags.slice(0, 3);
}

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
  const [adminPostFilter, setAdminPostFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Edit modal
  const [editDeck, setEditDeck] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    deck_link: '',
    title: '',
    author_name: '',
    description: '',
  });
  const [createPreview, setCreatePreview] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchDecks = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAdminCommunityDecks(adminKey, {
        search,
        status: statusFilter,
        adminPost: adminPostFilter,
      });
      setDecks(data.decks || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message || 'Failed to load decks');
    } finally {
      setLoading(false);
    }
  }, [adminKey, search, statusFilter, adminPostFilter]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
    if (!createForm.deck_link.trim()) {
      setCreatePreview(null);
      return;
    }
    if (isValidDeckLink(createForm.deck_link)) {
      const cardIds = extractCardIds(createForm.deck_link);
      setCreatePreview(cardIds);
      if (!createForm.title.trim()) {
        setCreateForm(prev => ({ ...prev, title: generateDeckTitle(cardIds) }));
      }
    } else {
      setCreatePreview(null);
    }
  }, [createForm.deck_link]);

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

  const handleToggleAdminPost = async (id, currentValue) => {
    try {
      await toggleCommunityDeckAdminPost(id, !currentValue, adminKey);
      showMessage(`Deck #${id} updated`);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to update admin post flag');
    }
  };

  const openEditModal = (deck) => {
    setEditDeck(deck);
    setEditForm({
      deck_link: deck.deck_link || '',
      title: deck.title || '',
      author_name: deck.author_name || '',
      description: deck.description || '',
      is_admin_post: deck.is_admin_post === 1,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDeck) return;
    try {
      await updateCommunityDeck(editDeck.id, {
        deck_link: normalizeDeckLink(editForm.deck_link),
        title: editForm.title.trim(),
        author_name: editForm.author_name.trim(),
        description: editForm.description.trim(),
        is_admin_post: editForm.is_admin_post,
      }, adminKey);
      showMessage(`Deck #${editDeck.id} updated`);
      setEditDeck(null);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to update deck');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!isValidDeckLink(createForm.deck_link)) {
      setError('Please enter a valid deck link');
      return;
    }
    const cardIds = extractCardIds(createForm.deck_link);
    if (!cardIds || cardIds.length !== 8) {
      setError('Deck must contain exactly 8 cards');
      return;
    }
    const cleanLink = normalizeDeckLink(createForm.deck_link);
    setCreateLoading(true);
    try {
      await createCommunityDeckAsAdmin({
        deck_link: cleanLink,
        card_ids: cardIds,
        title: createForm.title.trim() || generateDeckTitle(cardIds),
        author_name: createForm.author_name.trim() || 'Admin',
        description: createForm.description.trim() || generateDeckDescription(cardIds),
        avg_elixir: calculateDynamicAvgElixir(cardIds),
        tags: generateDeckTags(cardIds),
      }, adminKey);
      showMessage('Admin deck created');
      setShowCreateModal(false);
      setCreateForm({ deck_link: '', title: '', author_name: '', description: '' });
      setCreatePreview(null);
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to create deck');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredDecks = decks;

  return (
    <div className="admin-decks-page">
      <div className="admin-decks-header">
        <h1>🃏 Community Decks Admin</h1>
        <p>Manage submitted community decks. Approve, reject, edit, or create admin posts.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="admin-filters">
        <input
          type="text"
          className="input input-sm"
          placeholder="Search title, author, description..."
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
        <select
          className="input input-sm"
          value={adminPostFilter}
          onChange={(e) => setAdminPostFilter(e.target.value)}
        >
          <option value="all">All Posts</option>
          <option value="admin">Admin Posts</option>
          <option value="viewer">Viewer Posts</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchDecks} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          + Create Admin Deck
        </button>
        <span className="admin-decks-meta">{filteredDecks.length} deck(s)</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span>{selectedIds.size} selected</span>
          <button className="btn btn-success btn-sm" onClick={() => handleBulk('approve')} disabled={loading}>Approve</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleBulk('reject')} disabled={loading}>Reject</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleBulk('sanitize')} disabled={loading}>Sanitize Links</button>
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
              <th>Title</th>
              <th>Author</th>
              <th>Description</th>
              <th>Post Type</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDecks.length === 0 && !loading && (
              <tr>
                <td colSpan={10} className="admin-decks-empty">No decks found</td>
              </tr>
            )}
            {loading && filteredDecks.length === 0 && (
              <tr>
                <td colSpan={10} className="admin-decks-empty">Loading decks...</td>
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
                <td className="admin-decks-title">{deck.title || '-'}</td>
                <td className="admin-decks-author">{deck.author_name || 'Anonymous'}</td>
                <td className="admin-decks-description">{deck.description || '-'}</td>
                <td>
                  <label className="admin-post-toggle">
                    <input
                      type="checkbox"
                      checked={deck.is_admin_post === 1}
                      onChange={() => handleToggleAdminPost(deck.id, deck.is_admin_post === 1)}
                      disabled={loading}
                    />
                    <span>{deck.is_admin_post === 1 ? 'Admin' : 'Viewer'}</span>
                  </label>
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGES[deck.status] || 'badge-secondary'}`}>
                    {STATUS_LABELS[deck.status] || deck.status}
                  </span>
                </td>
                <td className="admin-decks-date">{formatDate(deck.created_at)}</td>
                <td className="admin-decks-actions">
                  <div className="admin-decks-action-group">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(deck)}
                      disabled={loading}
                    >
                      Edit
                    </button>
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

      {/* Edit Modal */}
      {editDeck && (
        <div className="modal-overlay" onClick={() => setEditDeck(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Deck #{editDeck.id}</h3>
              <button className="modal-close" onClick={() => setEditDeck(null)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="submit-form">
              <div className="form-field">
                <label>Deck Link</label>
                <input
                  type="text"
                  value={editForm.deck_link}
                  onChange={(e) => setEditForm({ ...editForm, deck_link: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Author</label>
                <input
                  type="text"
                  value={editForm.author_name}
                  onChange={(e) => setEditForm({ ...editForm, author_name: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="form-field form-field-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.is_admin_post}
                    onChange={(e) => setEditForm({ ...editForm, is_admin_post: e.target.checked })}
                  />
                  Admin Post
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditDeck(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Admin Deck</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="submit-form">
              <div className="form-field">
                <label>Deck Link</label>
                <input
                  type="text"
                  placeholder="https://link.clashroyale.com/deck?..."
                  value={createForm.deck_link}
                  onChange={(e) => setCreateForm({ ...createForm, deck_link: e.target.value })}
                  required
                />
              </div>
              {createPreview && (
                <div className="form-field">
                  <label>Preview</label>
                  <DeckPreview cardIds={createPreview} compact />
                </div>
              )}
              <div className="form-field">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Auto-generated if empty"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Author</label>
                <input
                  type="text"
                  placeholder="Admin"
                  value={createForm.author_name}
                  onChange={(e) => setCreateForm({ ...createForm, author_name: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={4}
                  placeholder="Auto-generated if empty"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .admin-decks-page {
          max-width: 1400px;
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
        .admin-decks-title {
          font-weight: 700;
          max-width: 160px;
          word-break: break-word;
        }
        .admin-decks-author {
          font-weight: 600;
          white-space: nowrap;
        }
        .admin-decks-description {
          max-width: 200px;
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
        .admin-post-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .admin-post-toggle input {
          accent-color: var(--accent-primary);
          cursor: pointer;
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
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--spacing-md);
        }
        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          padding: var(--spacing-lg);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        .modal-header h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }
        .modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
        }
        .submit-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .form-field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .form-field input,
        .form-field textarea,
        .form-field select {
          padding: 10px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .form-field textarea {
          resize: vertical;
        }
        .form-field-checkbox label {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          cursor: pointer;
          color: var(--text-primary);
        }
        .form-field-checkbox input {
          width: auto;
          accent-color: var(--accent-primary);
          cursor: pointer;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-sm);
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
