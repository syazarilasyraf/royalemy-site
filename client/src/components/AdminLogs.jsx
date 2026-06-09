import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAdminLogs, getAdminServerInfo } from '../services/api.js';

const LEVEL_COLORS = {
  error: '#ef4444',
  warn: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
};

const LEVEL_BADGES = {
  error: 'badge-danger',
  warn: 'badge-warning',
  success: 'badge-success',
  info: 'badge-primary',
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

// ==================== SERVER INFO PANEL ====================

function ServerInfoPanel({ info }) {
  if (!info) return null;

  return (
    <div className="admin-info-grid">
      <div className="admin-info-card">
        <div className="admin-info-label">Uptime</div>
        <div className="admin-info-value">{info.uptimeFormatted}</div>
      </div>
      <div className="admin-info-card">
        <div className="admin-info-label">Memory (RSS)</div>
        <div className="admin-info-value">{info.memory?.rssMB} MB</div>
      </div>
      <div className="admin-info-card">
        <div className="admin-info-label">Heap Used</div>
        <div className="admin-info-value">{info.memory?.heapUsedMB} MB</div>
      </div>
      <div className="admin-info-card">
        <div className="admin-info-label">Node Version</div>
        <div className="admin-info-value">{info.nodeVersion}</div>
      </div>
      <div className="admin-info-card">
        <div className="admin-info-label">Last Restart</div>
        <div className="admin-info-value">{formatDate(info.lastRestart)}</div>
      </div>
      <div className="admin-info-card">
        <div className="admin-info-label">Environment</div>
        <div className="admin-info-value">
          <span className={`badge ${info.environment === 'production' ? 'badge-success' : 'badge-secondary'}`}>
            {info.environment}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

function AdminLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const adminKey = searchParams.get('admin') || '';

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [serverInfo, setServerInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [levelFilter, setLevelFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const searchInputRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const params = { limit, offset };
      if (levelFilter) params.level = levelFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await getAdminLogs(adminKey, params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [adminKey, levelFilter, searchQuery, limit, offset]);

  const fetchServerInfo = useCallback(async () => {
    if (!adminKey) return;
    setInfoLoading(true);
    try {
      const data = await getAdminServerInfo(adminKey);
      setServerInfo(data);
    } catch {
      // silently fail
    } finally {
      setInfoLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchServerInfo();
    const interval = setInterval(fetchServerInfo, 30000);
    return () => clearInterval(interval);
  }, [fetchServerInfo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchLogs();
  };

  const handleLevelChange = (e) => {
    setLevelFilter(e.target.value);
    setOffset(0);
  };

  const handlePrevPage = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset((prev) => prev + limit);
    }
  };

  const handleKeyInput = (e) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ admin: val });
    } else {
      setSearchParams({});
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="admin-logs-page">
      <div className="admin-logs-header">
        <h1>📋 Admin Logs</h1>
        <p>Server logs and diagnostics. Access is restricted to administrators.</p>
      </div>

      {!adminKey && (
        <div className="admin-key-gate">
          <label>Admin Key</label>
          <input
            type="password"
            className="input"
            placeholder="Enter admin key..."
            onChange={handleKeyInput}
            autoFocus
          />
        </div>
      )}

      {adminKey && (
        <>
          {error && <div className="alert alert-error">{error}</div>}

          {/* Server Info */}
          <div className="admin-section">
            <h2 className="admin-section-title">🖥️ Server Info</h2>
            {infoLoading && !serverInfo ? (
              <div className="admin-loading">Loading server info...</div>
            ) : (
              <ServerInfoPanel info={serverInfo} />
            )}
          </div>

          {/* Filters */}
          <div className="admin-section">
            <h2 className="admin-section-title">🔍 Logs</h2>
            <div className="admin-filters">
              <form onSubmit={handleSearchSubmit} className="admin-search-form">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="input"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">Search</button>
              </form>

              <select className="input" value={levelFilter} onChange={handleLevelChange} style={{ width: 'auto' }}>
                <option value="">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warn</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
              </select>

              <select className="input" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }} style={{ width: 'auto' }}>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <button className="btn btn-secondary btn-sm" onClick={fetchLogs} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="admin-logs-meta">
              Showing {logs.length} of {total} entries
              {totalPages > 1 && (
                <span className="admin-logs-pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            {/* Log Table */}
            <div className="admin-logs-table-wrapper">
              <table className="admin-logs-table">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Timestamp</th>
                    <th style={{ width: '90px' }}>Level</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="admin-logs-empty">No logs found</td>
                    </tr>
                  )}
                  {logs.map((logEntry) => (
                    <tr key={logEntry.id}>
                      <td className="admin-logs-timestamp">{formatDate(logEntry.timestamp)}</td>
                      <td>
                        <span
                          className={`badge ${LEVEL_BADGES[logEntry.level] || 'badge-secondary'}`}
                          style={{ background: LEVEL_COLORS[logEntry.level] ? `${LEVEL_COLORS[logEntry.level]}22` : undefined, color: LEVEL_COLORS[logEntry.level] }}
                        >
                          {logEntry.level}
                        </span>
                      </td>
                      <td className="admin-logs-message">{logEntry.message}</td>
                    </tr>
                  ))}
                  {loading && logs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="admin-logs-empty">Loading logs...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrevPage}
                  disabled={offset === 0 || loading}
                >
                  Previous
                </button>
                <span className="admin-pagination-text">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleNextPage}
                  disabled={offset + limit >= total || loading}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .admin-logs-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .admin-logs-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .admin-logs-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          color: var(--text-primary);
        }

        .admin-logs-header p {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .admin-key-gate {
          max-width: 400px;
          margin: 0 auto var(--spacing-xl);
          padding: var(--spacing-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
        }

        .admin-key-gate label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .admin-section {
          margin-bottom: var(--spacing-xl);
        }

        .admin-section-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: var(--spacing-md);
          color: var(--text-primary);
        }

        .admin-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: var(--spacing-md);
        }

        .admin-info-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
        }

        .admin-info-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-xs);
        }

        .admin-info-value {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .admin-filters {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .admin-search-form {
          display: flex;
          gap: var(--spacing-sm);
          flex: 1;
          min-width: 240px;
        }

        .admin-search-form input {
          flex: 1;
        }

        .admin-logs-meta {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-bottom: var(--spacing-sm);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .admin-logs-pagination-info {
          font-weight: 600;
        }

        .admin-logs-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
        }

        .admin-logs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .admin-logs-table thead th {
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

        .admin-logs-table tbody tr {
          border-top: 1px solid var(--bg-tertiary);
        }

        .admin-logs-table tbody tr:hover {
          background: var(--bg-hover);
        }

        .admin-logs-table td {
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--text-primary);
          vertical-align: top;
        }

        .admin-logs-timestamp {
          white-space: nowrap;
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .admin-logs-message {
          word-break: break-word;
          line-height: 1.5;
        }

        .admin-logs-empty {
          text-align: center;
          color: var(--text-muted);
          padding: var(--spacing-xl) !important;
        }

        .admin-loading {
          color: var(--text-muted);
          font-size: 0.875rem;
          padding: var(--spacing-md) 0;
        }

        .admin-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          margin-top: var(--spacing-md);
        }

        .admin-pagination-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        /* Badge helpers */
        .badge-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        .badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .badge-success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }
        .badge-primary {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }
        .badge-secondary {
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }

        @media (max-width: 640px) {
          .admin-info-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .admin-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .admin-search-form {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(AdminLogs);
