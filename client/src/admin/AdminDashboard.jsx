import { useState, useEffect, memo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAdminDashboard, getAdminRateLimits } from '../services/api';

const MODULES = [
  { key: 'tournaments', label: 'Tournaments', path: '/admin/tournaments', color: '#4CAF50' },
  { key: 'clans', label: 'Clans', path: '/admin/clans', color: '#2196F3' },
  { key: 'decks', label: 'Decks', path: '/admin/decks', color: '#9C27B0' },
  { key: 'statePlayers', label: 'State Players', path: '/rankings', color: '#FF9800' },
  { key: 'features', label: 'Features', path: '/admin/roadmap', color: '#00BCD4' },
];

function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rateLimitStats, setRateLimitStats] = useState(null);

  useEffect(() => {
    if (!adminKey) return;
    fetchStats();
    fetchRateLimits();
  }, [adminKey]);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminDashboard(adminKey);
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchRateLimits = async () => {
    try {
      const data = await getAdminRateLimits(adminKey);
      setRateLimitStats(data);
    } catch (err) {
      // non-critical
    }
  };

  const totalPending = stats
    ? MODULES.reduce((sum, m) => sum + (stats.pending[m.key] || 0), 0)
    : 0;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>📊 Admin Dashboard</h2>
        <div className="dashboard-actions">
          <Link to={`/admin/logs?admin=${encodeURIComponent(adminKey)}`} className="action-link">
            View Logs
          </Link>
          <Link to={`/admin/audit?admin=${encodeURIComponent(adminKey)}`} className="action-link">
            Audit Trail
          </Link>
        </div>
      </div>

      {loading && <div className="loading-state">Loading stats...</div>}
      {error && <div className="error-alert">{error}</div>}

      {!loading && stats && (
        <>
          <div className="stats-overview">
            <div className="stat-card highlight">
              <span className="stat-number">{totalPending}</span>
              <span className="stat-label">Total Pending</span>
            </div>
          </div>

          {rateLimitStats && rateLimitStats.recent429Count > 0 && (
            <div className="rate-limit-alert">
              <strong>⚠️ Rate Limits</strong>
              <span>{rateLimitStats.recent429Count} recent 429 hits</span>
              {rateLimitStats.topOffenders.length > 0 && (
                <span>Top offender: {rateLimitStats.topOffenders[0].ip} ({rateLimitStats.topOffenders[0].count}x)</span>
              )}
            </div>
          )}

          <div className="modules-grid">
            {MODULES.map((mod) => {
              const pending = stats.pending[mod.key] || 0;
              const total = stats.total[mod.key] || 0;
              return (
                <Link
                  key={mod.key}
                  to={`${mod.path}?admin=${encodeURIComponent(adminKey)}`}
                  className="module-card"
                  style={{ borderLeftColor: mod.color }}
                >
                  <div className="module-header">
                    <h3>{mod.label}</h3>
                    {pending > 0 && <span className="pending-badge">{pending}</span>}
                  </div>
                  <div className="module-stats">
                    <div className="module-stat">
                      <span className="module-stat-value">{pending}</span>
                      <span className="module-stat-label">Pending</span>
                    </div>
                    <div className="module-stat">
                      <span className="module-stat-value">{total}</span>
                      <span className="module-stat-label">Total</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        .admin-dashboard {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }
        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }
        .dashboard-header h2 {
          margin: 0;
          color: white;
          font-size: 1.5rem;
        }
        .action-link {
          background: var(--accent-primary);
          color: #0f172a;
          padding: 8px 16px;
          border-radius: 20px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .stats-overview {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
        }
        .stat-card {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: var(--spacing-lg);
          text-align: center;
          min-width: 140px;
          border: 1px solid var(--bg-tertiary);
        }
        .stat-card.highlight {
          background: linear-gradient(135deg, #FFD700, #FFA000);
          color: #0f172a;
        }
        .stat-number {
          display: block;
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1;
        }
        .stat-label {
          display: block;
          font-size: 0.875rem;
          margin-top: 4px;
          opacity: 0.9;
        }
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: var(--spacing-md);
        }
        .module-card {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: var(--spacing-lg);
          text-decoration: none;
          color: inherit;
          border-left: 4px solid;
          border: 1px solid var(--bg-tertiary);
          border-left-width: 4px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .module-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .module-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-md);
        }
        .module-header h3 {
          margin: 0;
          color: white;
          font-size: 1.1rem;
        }
        .pending-badge {
          background: #f44336;
          color: white;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .module-stats {
          display: flex;
          gap: var(--spacing-lg);
        }
        .module-stat {
          text-align: center;
        }
        .module-stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }
        .module-stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .loading-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }
        .error-alert {
          background: rgba(244, 67, 54, 0.15);
          color: #f44336;
          padding: var(--spacing-md);
          border-radius: 12px;
          margin-bottom: var(--spacing-md);
        }
        .rate-limit-alert {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
          color: #f59e0b;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

export default memo(AdminDashboard);
