import { useState, useEffect, useCallback, memo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getAdminAuditTrail } from '../services/api';

const RESOURCE_LABELS = {
  tournament: 'Tournament',
  clan: 'Clan',
  deck: 'Deck',
  state_player: 'State Player',
  feature: 'Feature',
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
    second: '2-digit',
    hour12: false,
  });
}

function AdminAuditTrail() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin') || '';

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchActions = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAdminAuditTrail(adminKey, {
        resource: resourceFilter || undefined,
        limit,
        offset,
      });
      setActions(data.actions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [adminKey, resourceFilter, limit, offset]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return (
    <div className="admin-audit-page">
      <div className="admin-audit-header">
        <h1>📋 Admin Audit Trail</h1>
        <p>Record of all administrative actions performed on the platform.</p>
        <Link to={`/admin?admin=${encodeURIComponent(adminKey)}`} className="back-link">← Back to Dashboard</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-filters-bar">
        <select
          className="input input-sm"
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setOffset(0); }}
        >
          <option value="">All Resources</option>
          <option value="tournament">Tournaments</option>
          <option value="clan">Clans</option>
          <option value="deck">Decks</option>
          <option value="state_player">State Players</option>
          <option value="feature">Features</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchActions} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <span className="admin-meta">{total} total action(s)</span>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Resource ID</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {actions.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="admin-table-empty">No actions found</td>
              </tr>
            )}
            {loading && actions.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-table-empty">Loading...</td>
              </tr>
            )}
            {actions.map((a) => (
              <tr key={a.id}>
                <td className="admin-table-date">{formatDate(a.created_at)}</td>
                <td>
                  <span className={`badge badge-${getActionBadge(a.action)}`}>{a.action}</span>
                </td>
                <td>{RESOURCE_LABELS[a.resource] || a.resource}</td>
                <td className="admin-table-id">#{a.resource_id}</td>
                <td className="admin-table-details">{a.details || '-'}</td>
                <td className="admin-table-ip">{a.ip_address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="admin-pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Previous
          </button>
          <span>Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}</span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </button>
        </div>
      )}

      <style>{`
        .admin-audit-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }
        .admin-audit-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }
        .admin-audit-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
        }
        .admin-audit-header p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          max-width: 500px;
          margin: 0 auto var(--spacing-md);
        }
        .back-link {
          color: var(--accent-primary);
          text-decoration: none;
          font-size: 0.875rem;
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
        .admin-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .admin-table thead th {
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
        .admin-table tbody tr {
          border-top: 1px solid var(--bg-tertiary);
        }
        .admin-table tbody tr:hover {
          background: var(--bg-hover);
        }
        .admin-table td {
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--text-primary);
          vertical-align: top;
        }
        .admin-table-date {
          white-space: nowrap;
          color: var(--text-muted);
          font-size: 0.8125rem;
        }
        .admin-table-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: var(--text-muted);
        }
        .admin-table-details {
          max-width: 300px;
          word-break: break-word;
          color: var(--text-secondary);
          font-size: 0.8125rem;
        }
        .admin-table-ip {
          white-space: nowrap;
          color: var(--text-muted);
          font-size: 0.8125rem;
        }
        .admin-table-empty {
          text-align: center;
          color: var(--text-muted);
          padding: var(--spacing-xl) !important;
        }
        .admin-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
        }
        .badge-approve { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .badge-reject { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .badge-delete { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
        .badge-status { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .badge-bulk { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .badge-default { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
      `}</style>
    </div>
  );
}

function getActionBadge(action) {
  if (action === 'approve') return 'approve';
  if (action === 'reject') return 'reject';
  if (action === 'delete') return 'delete';
  if (action === 'status') return 'status';
  if (action === 'bulk') return 'bulk';
  return 'default';
}

export default memo(AdminAuditTrail);
