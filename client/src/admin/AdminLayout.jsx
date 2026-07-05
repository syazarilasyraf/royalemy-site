import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { Outlet, useSearchParams, Link, useLocation } from 'react-router-dom';
import { getAdminPermissions } from '../services/api';

const AdminKeyContext = createContext(null);
const AdminPermissionsContext = createContext({
  permissions: {},
  isSuper: false,
  loading: true,
  error: '',
});

export function useAdminKey() {
  return useContext(AdminKeyContext);
}

export function useAdminPermissions() {
  return useContext(AdminPermissionsContext);
}

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '📊', permission: 'dashboard' },
  { path: '/admin/tournaments', label: 'Tournaments', icon: '🏆', permission: 'tournaments' },
  { path: '/admin/clans', label: 'Clans', icon: '🛡️', permission: 'clans' },
  { path: '/admin/decks', label: 'Decks', icon: '🃏', permission: 'decks' },
  { path: '/admin/roadmap', label: 'Roadmap', icon: '🗺️', permission: 'roadmap' },
  { path: '/admin/notifications', label: 'Notifications', icon: '🔔', permission: 'notifications' },
  { path: '/admin/logs', label: 'Logs', icon: '📜', permission: 'logs' },
  { path: '/admin/audit', label: 'Audit', icon: '📋', permission: 'audit' },
];

function AdminLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const adminKey = searchParams.get('admin') || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef(null);
  const [permissionsState, setPermissionsState] = useState({
    permissions: {},
    isSuper: false,
    loading: true,
    error: '',
  });

  const setAdminKey = useCallback((key) => {
    const next = new URLSearchParams(searchParams);
    if (key) {
      next.set('admin', key);
    } else {
      next.delete('admin');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Fetch permissions whenever the admin key changes
  useEffect(() => {
    if (!adminKey) {
      setPermissionsState({ permissions: {}, isSuper: false, loading: false, error: '' });
      return;
    }

    let cancelled = false;
    setPermissionsState((prev) => ({ ...prev, loading: true, error: '' }));

    getAdminPermissions(adminKey)
      .then((data) => {
        if (cancelled) return;
        setPermissionsState({
          permissions: data.permissions || {},
          isSuper: !!data.isSuper,
          loading: false,
          error: '',
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setPermissionsState({
          permissions: {},
          isSuper: false,
          loading: false,
          error: err.message || 'Failed to load permissions',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mobileMenuOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

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

  const renderNavItem = (item, mobile = false) => {
    const isActive = location.pathname === item.path;
    const permitted = permissionsState.isSuper || permissionsState.permissions[item.permission] === true;
    const baseClass = mobile ? 'admin-mobile-nav-link' : 'admin-nav-link';
    const activeClass = isActive ? 'active' : '';

    if (!permitted) {
      return (
        <div
          key={item.path}
          className={`${baseClass} locked ${activeClass}`}
          title="Locked by super admin"
        >
          <span className={mobile ? 'admin-mobile-nav-icon' : 'admin-nav-icon'}>{item.icon}</span>
          <span className={mobile ? 'admin-mobile-nav-label' : 'admin-nav-label'}>{item.label}</span>
          <span className="admin-nav-lock">🔒</span>
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={makeLink(item.path)}
        className={`${baseClass} ${activeClass}`}
        onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
      >
        <span className={mobile ? 'admin-mobile-nav-icon' : 'admin-nav-icon'}>{item.icon}</span>
        <span className={mobile ? 'admin-mobile-nav-label' : 'admin-nav-label'}>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="admin-layout">
      {/* Desktop sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">RoyaleMY Admin</div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => renderNavItem(item))}
          {permissionsState.isSuper && (
            <Link
              key="/admin/access-control"
              to={makeLink('/admin/access-control')}
              className={`admin-nav-link ${location.pathname === '/admin/access-control' ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">🗝️</span>
              <span className="admin-nav-label">Access Control</span>
            </Link>
          )}
        </nav>
      </aside>

      {/* Mobile header */}
      <header className="admin-mobile-header">
        <span className="admin-mobile-brand">RoyaleMY Admin</span>
        <button
          className="admin-mobile-menu-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="admin-menu-bar"></span>
          <span className="admin-menu-bar"></span>
          <span className="admin-menu-bar"></span>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="admin-mobile-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className="admin-mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
          >
            <div className="admin-mobile-drawer-header">
              <span className="admin-mobile-drawer-title">Admin Menu</span>
              <button
                className="admin-mobile-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close admin menu"
              >
                ✕
              </button>
            </div>
            <nav className="admin-mobile-nav">
              {NAV_ITEMS.map((item) => renderNavItem(item, true))}
              {permissionsState.isSuper && (
                <Link
                  key="/admin/access-control"
                  to={makeLink('/admin/access-control')}
                  className={`admin-mobile-nav-link ${location.pathname === '/admin/access-control' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="admin-mobile-nav-icon">🗝️</span>
                  <span className="admin-mobile-nav-label">Access Control</span>
                </Link>
              )}
            </nav>
          </div>
        </>
      )}

      <main className="admin-main">
        <AdminPermissionsContext.Provider value={permissionsState}>
          <AdminKeyContext.Provider value={adminKey}>
            <Outlet />
          </AdminKeyContext.Provider>
        </AdminPermissionsContext.Provider>
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
        .admin-nav-link.locked {
          opacity: 0.5;
          cursor: not-allowed;
          color: var(--text-muted);
        }
        .admin-nav-link.locked:hover {
          background: transparent;
          color: var(--text-muted);
        }
        .admin-nav-icon {
          font-size: 1rem;
        }
        .admin-nav-lock {
          margin-left: auto;
          font-size: 0.75rem;
        }
        .admin-main {
          flex: 1;
          min-width: 0;
        }

        /* Mobile header - hidden on desktop */
        .admin-mobile-header {
          display: none;
        }

        @media (max-width: 767px) {
          .admin-layout {
            flex-direction: column;
            gap: var(--spacing-md);
            padding: var(--spacing-sm);
          }
          .admin-sidebar {
            display: none;
          }
          .admin-mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-secondary);
            border: 1px solid var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--spacing-sm) var(--spacing-md);
            position: sticky;
            top: var(--spacing-sm);
            z-index: 50;
          }
          .admin-mobile-brand {
            font-weight: 800;
            font-size: 1rem;
            color: var(--text-primary);
          }
          .admin-mobile-menu-btn {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
            width: 40px;
            height: 40px;
            padding: 8px;
            background: var(--bg-tertiary);
            border: 1px solid var(--bg-tertiary);
            border-radius: var(--radius-md);
            cursor: pointer;
            color: var(--text-primary);
          }
          .admin-mobile-menu-btn:hover {
            background: var(--bg-hover);
            border-color: var(--accent-primary);
          }
          .admin-menu-bar {
            display: block;
            height: 2px;
            background: currentColor;
            border-radius: 2px;
          }
          .admin-mobile-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 150;
            animation: fadeIn 0.2s ease;
          }
          .admin-mobile-drawer {
            position: fixed;
            top: 0;
            right: 0;
            width: min(280px, 80vw);
            height: 100vh;
            height: 100dvh;
            background: var(--bg-secondary);
            border-left: 1px solid var(--bg-tertiary);
            z-index: 200;
            display: flex;
            flex-direction: column;
            animation: slideIn 0.25s ease;
          }
          .admin-mobile-drawer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-md);
            border-bottom: 1px solid var(--bg-tertiary);
          }
          .admin-mobile-drawer-title {
            font-weight: 700;
            font-size: 1rem;
            color: var(--text-primary);
          }
          .admin-mobile-close-btn {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-tertiary);
            border: 1px solid var(--bg-tertiary);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: 1rem;
            cursor: pointer;
          }
          .admin-mobile-close-btn:hover {
            background: var(--bg-hover);
            border-color: var(--accent-primary);
          }
          .admin-mobile-nav {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
            padding: var(--spacing-sm);
            overflow-y: auto;
          }
          .admin-mobile-nav-link {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9375rem;
            font-weight: 600;
            transition: background 0.2s, color 0.2s;
          }
          .admin-mobile-nav-link:hover,
          .admin-mobile-nav-link.active {
            background: var(--bg-tertiary);
            color: var(--text-primary);
          }
          .admin-mobile-nav-link.active {
            border-left: 3px solid var(--accent-primary);
          }
          .admin-mobile-nav-link.locked {
            opacity: 0.5;
            cursor: not-allowed;
            color: var(--text-muted);
          }
          .admin-mobile-nav-link.locked:hover {
            background: transparent;
            color: var(--text-muted);
          }
          .admin-mobile-nav-icon {
            font-size: 1.25rem;
            width: 28px;
            text-align: center;
          }
          .admin-mobile-nav-label {
            flex: 1;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        }
      `}</style>
    </div>
  );
}

export default AdminLayout;
