import { createContext, useContext, useCallback } from 'react';
import { Outlet, useSearchParams, Link, useLocation } from 'react-router-dom';

const AdminKeyContext = createContext(null);

export function useAdminKey() {
  return useContext(AdminKeyContext);
}

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/tournaments', label: 'Tournaments', icon: '🏆' },
  { path: '/admin/clans', label: 'Clans', icon: '🛡️' },
  { path: '/admin/decks', label: 'Decks', icon: '🃏' },
  { path: '/admin/roadmap', label: 'Roadmap', icon: '🗺️' },
  { path: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/admin/logs', label: 'Logs', icon: '📜' },
  { path: '/admin/audit', label: 'Audit', icon: '📋' },
];

function AdminLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const adminKey = searchParams.get('admin') || '';

  const setAdminKey = useCallback((key) => {
    const next = new URLSearchParams(searchParams);
    if (key) {
      next.set('admin', key);
    } else {
      next.delete('admin');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  if (!adminKey) {
    return (
      <div className="admin-layout">
        <div className="admin-gate">
          <h2>🔐 Admin Area</h2>
          <p>Enter the admin key to access the dashboard.</p>
          <input
            type="password"
            className="input"
            placeholder="Admin key..."
            autoFocus
            onChange={(e) => setAdminKey(e.target.value)}
          />
        </div>
        <style>{`
          .admin-layout {
            max-width: 900px;
            margin: 0 auto;
            padding: var(--spacing-lg);
          }
          .admin-gate {
            max-width: 400px;
            margin: 10vh auto 0;
            padding: var(--spacing-xl);
            background: var(--bg-secondary);
            border: 1px solid var(--bg-tertiary);
            border-radius: var(--radius-xl);
            text-align: center;
          }
          .admin-gate h2 {
            color: var(--text-primary);
            margin: 0 0 var(--spacing-sm);
          }
          .admin-gate p {
            color: var(--text-muted);
            margin-bottom: var(--spacing-lg);
          }
          .admin-gate .input {
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  const makeLink = (path) => `${path}?admin=${encodeURIComponent(adminKey)}`;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">RoyaleMY Admin</div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={makeLink(item.path)}
                className={`admin-nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                <span className="admin-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="admin-main">
        <AdminKeyContext.Provider value={adminKey}>
          <Outlet />
        </AdminKeyContext.Provider>
      </main>

      <style>{`
        .admin-layout {
          display: flex;
          min-height: calc(100vh - 120px);
          gap: var(--spacing-lg);
          max-width: 1400px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }
        .admin-sidebar {
          width: 220px;
          flex-shrink: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          height: fit-content;
          position: sticky;
          top: var(--spacing-md);
        }
        .admin-brand {
          font-weight: 800;
          font-size: 1rem;
          color: var(--text-primary);
          padding: var(--spacing-sm) var(--spacing-md);
          margin-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--bg-tertiary);
        }
        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .admin-nav-link {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          transition: background 0.2s, color 0.2s;
        }
        .admin-nav-link:hover,
        .admin-nav-link.active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .admin-nav-icon {
          font-size: 1rem;
        }
        .admin-main {
          flex: 1;
          min-width: 0;
        }
        @media (max-width: 767px) {
          .admin-layout {
            flex-direction: column;
          }
          .admin-sidebar {
            width: 100%;
            position: static;
          }
          .admin-nav {
            flex-direction: row;
            flex-wrap: wrap;
          }
          .admin-nav-link {
            flex: 1;
            min-width: 100px;
            justify-content: center;
          }
          .admin-nav-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminLayout;
