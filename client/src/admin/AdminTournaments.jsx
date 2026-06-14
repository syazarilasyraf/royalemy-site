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
  awarded: 'Awarded',
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
  const [groupFilter, setGroupFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailTournament, setDetailTournament] = useState(null);

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

  const { pending, active, completed, other } = useMemo(() => {
    const visible = allTournaments.filter((t) => {
      if (groupFilter === 'all') return true;
      if (groupFilter === 'pending') return t.status === 'pending';
      if (groupFilter === 'active') return PUBLIC_STATUSES.includes(t.status);
      if (groupFilter === 'completed') return t.status === 'completed';
      if (groupFilter === 'other') return ['rejected', 'cancelled'].includes(t.status);
      return true;
    });
    return {
      pending: visible.filter((t) => t.status === 'pending'),
      active: visible.filter((t) => PUBLIC_STATUSES.includes(t.status)),
      completed: visible.filter((t) => t.status === 'completed'),
      other: visible.filter((t) => ['rejected', 'cancelled'].includes(t.status)),
    };
  }, [allTournaments, groupFilter]);

  return (
    <div className="tournament-admin-page">
      <div className="tournament-admin-header">
        <h1>🏆 Tournament Admin</h1>
        <p>Manage community tournaments, statuses, prizes, and winners.</p>
      </div>

      {!adminKey && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          ⚠️ Admin key missing. Add <code>?admin=YOUR_ADMIN_KEY</code> to the URL to manage tournaments.
        </div>
      )}

      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <div className="admin-group-tabs" style={{ marginBottom: '1rem' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
          { key: 'other', label: 'Rejected / Cancelled' },
        ].map((tab) => {
          const count = allTournaments.filter((t) => {
            if (tab.key === 'all') return true;
            if (tab.key === 'pending') return t.status === 'pending';
            if (tab.key === 'active') return PUBLIC_STATUSES.includes(t.status);
            if (tab.key === 'completed') return t.status === 'completed';
            if (tab.key === 'other') return ['rejected', 'cancelled'].includes(t.status);
            return false;
          }).length;
          const active = groupFilter === tab.key;
          return (
            <button
              key={tab.key}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setGroupFilter(tab.key)}
              style={{ position: 'relative' }}
            >
              {tab.label}
              <span
                style={{
                  marginLeft: '8px',
                  background: active ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

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
                  <button className="btn btn-secondary btn-sm" onClick={() => setDetailTournament(t)}>
                    👁 View
                  </button>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => setDetailTournament(t)}>
                    👁 View
                  </button>
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
                        {t.host_name} — {formatDate(t.start_date)} — Prize: {PRIZE_STATUS_LABELS[t.prize_status] || 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="tournament-admin-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setDetailTournament(t)}>
                      👁 View
                    </button>
                    <select
                      className="input"
                      style={{ width: 'auto', fontSize: '0.8125rem', padding: '4px 8px' }}
                      value={t.prize_status || 'pending'}
                      onChange={(e) => handlePrizeStatus(t.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="paid">Paid</option>
                      <option value="awarded">Awarded</option>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => setDetailTournament(t)}>
                    👁 View
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

      {detailTournament && (
        <div className="modal-overlay" onClick={() => setDetailTournament(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>{detailTournament.name}</h3>
              <button className="modal-close" onClick={() => setDetailTournament(null)}>✕</button>
            </div>
            <div className="detail-body">
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`badge ${STATUS_BADGES[detailTournament.status]}`}>{STATUS_LABELS[detailTournament.status]}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Host</span>
                  <span className="detail-value">{detailTournament.host_name || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Format</span>
                  <span className="detail-value">{detailTournament.format || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Max Players</span>
                  <span className="detail-value">{detailTournament.max_players || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Participants</span>
                  <span className="detail-value">{detailTournament.participant_count ?? 0}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Start</span>
                  <span className="detail-value">{formatDate(detailTournament.start_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">End</span>
                  <span className="detail-value">{formatDate(detailTournament.end_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Registration Deadline</span>
                  <span className="detail-value">{formatDate(detailTournament.registration_deadline)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Prize</span>
                  <span className="detail-value">{detailTournament.prize || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Prize Status</span>
                  <span className="detail-value">{PRIZE_STATUS_LABELS[detailTournament.prize_status] || 'Pending'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">TikTok</span>
                  <span className="detail-value">{detailTournament.tiktok_username ? `@${detailTournament.tiktok_username}` : '-'}</span>
                </div>
                {detailTournament.tiktok_live_url && (
                  <div className="detail-row">
                    <span className="detail-label">Live URL</span>
                    <a href={detailTournament.tiktok_live_url} target="_blank" rel="noopener noreferrer">Open</a>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Password</span>
                  <span className="detail-value">{detailTournament.tournament_password || '-'}</span>
                </div>
              </div>
              <div className="detail-block">
                <h4>Description</h4>
                <p>{detailTournament.description || '-'}</p>
              </div>
              <div className="detail-block">
                <h4>Rules</h4>
                <p>{detailTournament.rules || '-'}</p>
              </div>
              {(detailTournament.winner_1st || detailTournament.winner_2nd || detailTournament.winner_3rd) && (
                <div className="detail-block">
                  <h4>Winners</h4>
                  <p>
                    {detailTournament.winner_1st && <span>🥇 {detailTournament.winner_1st} </span>}
                    {detailTournament.winner_2nd && <span>🥈 {detailTournament.winner_2nd} </span>}
                    {detailTournament.winner_3rd && <span>🥉 {detailTournament.winner_3rd}</span>}
                  </p>
                </div>
              )}
            </div>
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
        .detail-body {
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          max-height: 70vh;
          overflow-y: auto;
        }
        .detail-section {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-sm);
        }
        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: var(--spacing-sm);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }
        .detail-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .detail-value {
          font-size: 0.9375rem;
          color: var(--text-primary);
          word-break: break-word;
        }
        .detail-block h4 {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-sm);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .detail-block p {
          margin: 0;
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .detail-block a {
          color: var(--accent-primary);
          text-decoration: underline;
        }
        @media (max-width: 640px) {
          .detail-section {
            grid-template-columns: 1fr;
          }
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
