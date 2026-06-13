import { useState, useEffect, useCallback, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAdminFeatures,
  approveFeature,
  rejectFeature,
  updateFeatureStatus,
  bulkFeatures,
} from '../services/api.js';

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

function AdminRoadmap() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin') || '';

  const [allFeatures, setAllFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchAdminData = useCallback(async () => {
    if (!adminKey) return;
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
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectFeature(id, adminKey);
      setMessage('Feature rejected');
      fetchAdminData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateFeatureStatus(id, status, adminKey);
      setMessage(`Status updated to ${STATUS_LABELS[status]}`);
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
    } catch (err) {
      setMessage(err.message || 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const pending = allFeatures.filter((f) => f.status === 'pending');

  return (
    <div className="roadmap-admin-page">
      <div className="roadmap-admin-header">
        <h1>🗺️ Roadmap Admin</h1>
        <p>Manage feature suggestions and roadmap items.</p>
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

      <style>{`
        .roadmap-admin-page {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }
        .roadmap-admin-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }
        .roadmap-admin-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
        }
        .roadmap-admin-header p {
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

export default memo(AdminRoadmap);
