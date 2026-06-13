import { useState, useEffect, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAdminClans,
  approveClan,
  rejectClan,
  updateClanStatus,
  deleteClan,
  bulkClans,
} from '../services/api';

const CLAN_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const CLAN_STATUS_BADGES = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

function AdminClans() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin') || '';

  const [allClans, setAllClans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchAdminData = useCallback(async () => {
    if (!adminKey) return;
    try {
      setLoading(true);
      const data = await getAdminClans(adminKey, { search, status: statusFilter });
      setAllClans(data.clans || []);
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
      await approveClan(id, adminKey);
      setMessage('Clan approved');
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectClan(id, adminKey);
      setMessage('Clan rejected');
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this clan?')) return;
    try {
      await deleteClan(id, adminKey);
      setMessage('Clan deleted');
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateClanStatus(id, status, adminKey);
      setMessage(`Status updated to ${CLAN_STATUS_LABELS[status]}`);
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
    if (selectedIds.size === allClans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allClans.map(c => c.id)));
    }
  };

  const handleBulk = async (action, extra = {}) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} clan(s)?`)) return;
    setLoading(true);
    try {
      const res = await bulkClans(action, ids, adminKey, extra);
      const succeeded = res.results.filter(r => r.success).length;
      setMessage(`${action} applied to ${succeeded}/${ids.length} clans`);
      fetchAdminData();
    } catch (err) {
      setMessage(err.message || 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const pending = allClans.filter((c) => c.status === 'pending');

  return (
    <div className="clan-admin-page">
      <div className="clan-admin-header">
        <h1>🛡️ Clan Admin</h1>
        <p>Manage submitted community clans. Approve, reject, change status, or delete.</p>
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
          placeholder="Search clans..."
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
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchAdminData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <span className="admin-meta">{allClans.length} clan(s)</span>
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
        <div className="clan-admin-section">
          <h3>Pending Review ({pending.length})</h3>
          <div className="clan-admin-list">
            {pending.map((c) => (
              <div key={c.id} className="clan-admin-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                  <div>
                    <strong>{c.name}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      #{c.clan_tag} — {c.leader_name}
                    </p>
                  </div>
                </div>
                <div className="clan-admin-actions">
                  <button className="btn btn-success btn-sm" onClick={() => handleApprove(c.id)}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleReject(c.id)}>
                    Reject
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(c.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="clan-admin-section">
        <h3>All Clans</h3>
        <div className="clan-admin-list">
          {allClans.map((c) => (
            <div key={c.id} className="clan-admin-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                <div>
                  <strong>{c.name}</strong>
                  <span
                    className={`badge ${CLAN_STATUS_BADGES[c.status] || 'badge-secondary'}`}
                    style={{ marginLeft: '8px' }}
                  >
                    {CLAN_STATUS_LABELS[c.status]}
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    #{c.clan_tag} — {c.leader_name}
                  </p>
                </div>
              </div>
              <div className="clan-admin-actions">
                <select
                  className="input"
                  style={{ width: 'auto', fontSize: '0.8125rem', padding: '4px 8px' }}
                  value={c.status}
                  onChange={(e) => handleStatusChange(c.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(c.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .clan-admin-page {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }
        .clan-admin-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }
        .clan-admin-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
        }
        .clan-admin-header p {
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
        .clan-admin-section {
          margin-bottom: var(--spacing-lg);
        }
        .clan-admin-section h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-md);
        }
        .clan-admin-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .clan-admin-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
        }
        .clan-admin-actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-shrink: 0;
          align-items: center;
        }
        @media (max-width: 640px) {
          .clan-admin-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .clan-admin-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .clan-admin-actions .btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(AdminClans);
