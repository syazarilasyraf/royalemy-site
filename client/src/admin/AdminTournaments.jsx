import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAdminTournaments,
  approveTournament,
  rejectTournament,
  updateTournamentStatus,
  updateTournamentWinners,
  updateTournamentPrizeStatus,
  deleteTournament,
  bulkTournaments,
} from '../services/api';

const STATUS_LABELS = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_BADGES = {
  pending: 'badge-warning',
  approved: 'badge-info',
  rejected: 'badge-danger',
  registration_open: 'badge-success',
  registration_closed: 'badge-secondary',
  live: 'badge-live',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

const PUBLIC_STATUSES = ['approved', 'registration_open', 'registration_closed', 'live'];

const PRIZE_STATUS_LABELS = {
  pending: 'Pending',
  contacted: 'Contacted',
  paid: 'Paid',
};

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AdminTournaments() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin') || '';

  const [allTournaments, setAllTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [winnerForm, setWinnerForm] = useState({ id: null, winner_1st: '', winner_2nd: '', winner_3rd: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchAdminData = useCallback(async () => {
    if (!adminKey) return;
    try {
      setLoading(true);
      const data = await getAdminTournaments(adminKey, { search, status: statusFilter });
      setAllTournaments(data.tournaments || []);
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
      await approveTournament(id, adminKey);
      setMessage('Tournament approved');
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectTournament(id, adminKey);
      setMessage('Tournament rejected');
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await deleteTournament(id, adminKey);
      setMessage('Tournament deleted');
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateTournamentStatus(id, status, adminKey);
      setMessage(`Status updated to ${STATUS_LABELS[status]}`);
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handlePrizeStatus = async (id, prizeStatus) => {
    try {
      await updateTournamentPrizeStatus(id, prizeStatus, adminKey);
      setMessage(`Prize status updated to ${PRIZE_STATUS_LABELS[prizeStatus]}`);
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleSaveWinners = async () => {
    if (!winnerForm.id) return;
    try {
      await updateTournamentWinners(winnerForm.id, {
        winner_1st: winnerForm.winner_1st,
        winner_2nd: winnerForm.winner_2nd,
        winner_3rd: winnerForm.winner_3rd,
      }, adminKey);
      setMessage('Winners updated');
      setWinnerForm({ id: null, winner_1st: '', winner_2nd: '', winner_3rd: '' });
      fetchAdminData();
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
    if (selectedIds.size === allTournaments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allTournaments.map(t => t.id)));
    }
  };

  const handleBulk = async (action, extra = {}) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} tournament(s)?`)) return;
    setLoading(true);
    try {
      const res = await bulkTournaments(action, ids, adminKey, extra);
      const succeeded = res.results.filter(r => r.success).length;
      setMessage(`${action} applied to ${succeeded}/${ids.length} tournaments`);
      fetchAdminData();
    } catch (err) {
      setMessage(err.message || 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const { pending, active, completed, other } = useMemo(() => ({
    pending: allTournaments.filter((t) => t.status === 'pending'),
    active: allTournaments.filter((t) => PUBLIC_STATUSES.includes(t.status)),
    completed: allTournaments.filter((t) => t.status === 'completed'),
    other: allTournaments.filter((t) => ['rejected', 'cancelled'].includes(t.status)),
  }), [allTournaments]);

  return (
    <div className="tournament-admin-page">
      <div className="tournament-admin-header">
        <h1>🏆 Tournament Admin</h1>
        <p>Manage community tournaments, statuses, prizes, and winners.</p>
      </div>

      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <div className="admin-filters-bar">
        <input
          type="text"
          className="input input-sm"
          placeholder="Search tournaments..."
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
          <option value="approved">Approved</option>
          <option value="registration_open">Registration Open</option>
          <option value="registration_closed">Registration Closed</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchAdminData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <span className="admin-meta">{allTournaments.length} tournament(s)</span>
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
        <div className="tournament-admin-section">
          <h3>Pending Review ({pending.length})</h3>
          <div className="tournament-admin-list">
            {pending.map((t) => (
              <div key={t.id} className="tournament-admin-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                  <div className="tournament-admin-info">
                    <strong className="tournament-admin-name">{t.name}</strong>
                    <span className={`badge ${STATUS_BADGES[t.status]}`} style={{ marginLeft: '8px' }}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {t.host_name} — {formatDate(t.start_date)}
                    </p>
                  </div>
                </div>
                <div className="tournament-admin-actions">
                  <button className="btn btn-success btn-sm" onClick={() => handleApprove(t.id)}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleReject(t.id)}>
                    Reject
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="tournament-admin-section">
          <h3>Active Tournaments ({active.length})</h3>
          <div className="tournament-admin-list">
            {active.map((t) => (
              <div key={t.id} className="tournament-admin-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                  <div className="tournament-admin-info">
                    <strong className="tournament-admin-name">{t.name}</strong>
                    <span className={`badge ${STATUS_BADGES[t.status]}`} style={{ marginLeft: '8px' }}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {t.host_name} — {formatDate(t.start_date)}
                    </p>
                  </div>
                </div>
                <div className="tournament-admin-actions">
                  <select
                    className="input"
                    style={{ width: 'auto', fontSize: '0.8125rem', padding: '4px 8px' }}
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  >
                    <option value="approved">Approved</option>
                    <option value="registration_open">Open Registration</option>
                    <option value="registration_closed">Close Registration</option>
                    <option value="live">Start Tournament</option>
                    <option value="completed">Complete</option>
                    <option value="cancelled">Cancel</option>
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="tournament-admin-section">
          <h3>Completed Tournaments ({completed.length})</h3>
          <div className="tournament-admin-list">
            {completed.map((t) => (
              <div key={t.id} className="tournament-admin-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                    <div className="tournament-admin-info">
                      <strong className="tournament-admin-name">{t.name}</strong>
                      <span className={`badge ${STATUS_BADGES[t.status]}`} style={{ marginLeft: '8px' }}>
                        {STATUS_LABELS[t.status]}
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Prize: {PRIZE_STATUS_LABELS[t.prize_status] || 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="tournament-admin-actions">
                    <select
                      className="input"
                      style={{ width: 'auto', fontSize: '0.8125rem', padding: '4px 8px' }}
                      value={t.prize_status || 'pending'}
                      onChange={(e) => handlePrizeStatus(t.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="paid">Paid</option>
                    </select>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => setWinnerForm({
                        id: t.id,
                        winner_1st: t.winner_1st || '',
                        winner_2nd: t.winner_2nd || '',
                        winner_3rd: t.winner_3rd || '',
                      })}
                    >
                      🏆 Winners
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                {(t.winner_1st || t.winner_2nd || t.winner_3rd) && (
                  <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {t.winner_1st && <span>🥇 {t.winner_1st} </span>}
                    {t.winner_2nd && <span>🥈 {t.winner_2nd} </span>}
                    {t.winner_3rd && <span>🥉 {t.winner_3rd}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div className="tournament-admin-section">
          <h3>Rejected / Cancelled ({other.length})</h3>
          <div className="tournament-admin-list">
            {other.map((t) => (
              <div key={t.id} className="tournament-admin-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                  <div className="tournament-admin-info">
                    <strong className="tournament-admin-name">{t.name}</strong>
                    <span className={`badge ${STATUS_BADGES[t.status]}`} style={{ marginLeft: '8px' }}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {t.host_name} — {formatDate(t.start_date)}
                    </p>
                  </div>
                </div>
                <div className="tournament-admin-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {winnerForm.id && (
        <div className="modal-overlay" onClick={() => setWinnerForm({ id: null, winner_1st: '', winner_2nd: '', winner_3rd: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>🏆 Enter Winners</h3>
              <button className="modal-close" onClick={() => setWinnerForm({ id: null, winner_1st: '', winner_2nd: '', winner_3rd: '' })}>✕</button>
            </div>
            <div className="submit-form">
              <div className="form-field full-width">
                <label>Champion (Player Tag)</label>
                <input
                  type="text"
                  value={winnerForm.winner_1st}
                  onChange={(e) => setWinnerForm((p) => ({ ...p, winner_1st: e.target.value }))}
                  placeholder="e.g. #2P0JJQ0Y"
                />
              </div>
              <div className="form-field full-width">
                <label>Runner-up (Player Tag)</label>
                <input
                  type="text"
                  value={winnerForm.winner_2nd}
                  onChange={(e) => setWinnerForm((p) => ({ ...p, winner_2nd: e.target.value }))}
                  placeholder="e.g. #2P0JJQ0Y"
                />
              </div>
              <div className="form-field full-width">
                <label>Third Place (Player Tag)</label>
                <input
                  type="text"
                  value={winnerForm.winner_3rd}
                  onChange={(e) => setWinnerForm((p) => ({ ...p, winner_3rd: e.target.value }))}
                  placeholder="e.g. #2P0JJQ0Y"
                />
              </div>
              <button className="submit-btn" onClick={handleSaveWinners}>
                Save Winners
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tournament-admin-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }
        .tournament-admin-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }
        .tournament-admin-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
        }
        .tournament-admin-header p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          max-width: 500px;
          margin: 0 auto;
        }
        .admin-filters-bar {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          flex-wrap: wrap;
        }
        .admin-meta {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-left: auto;
        }
        .bulk-bar {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
        }
        .tournament-admin-section {
          margin-bottom: var(--spacing-lg);
        }
        .tournament-admin-section h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-md);
        }
        .tournament-admin-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .tournament-admin-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
        }
        .tournament-admin-info {
          flex: 1;
          min-width: 0;
        }
        .tournament-admin-name {
          transition: color 0.2s;
        }
        .tournament-admin-actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-shrink: 0;
          align-items: center;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: var(--spacing-md);
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }
        .modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.25rem;
          cursor: pointer;
          padding: var(--spacing-xs);
        }
        .submit-form {
          padding: var(--spacing-lg);
        }
        .form-field {
          margin-bottom: var(--spacing-md);
        }
        .form-field label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-xs);
        }
        .form-field input {
          width: 100%;
          padding: var(--spacing-sm);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        }
        .submit-btn {
          width: 100%;
          padding: var(--spacing-md);
          background: var(--accent-primary);
          color: #0f172a;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          cursor: pointer;
        }
        @media (max-width: 640px) {
          .tournament-admin-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .tournament-admin-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .tournament-admin-actions .btn,
          .tournament-admin-actions select {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(AdminTournaments);
