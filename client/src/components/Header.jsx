import { Link, useLocation } from 'react-router-dom';

const DESKTOP_LINKS = [
  { to: '/player', label: 'Players' },
  { to: '/deck', label: 'Decks' },
  { to: '/arenadecks', label: 'Arena Decks' },
  { to: '/roadmap', label: 'Roadmap' },
];

function Header() {
  const location = useLocation();

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">👑</span>
          <span className="logo-text">RoyaleMY</span>
        </Link>

        <nav className="desktop-nav">
          {DESKTOP_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`desktop-nav-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href="https://discord.gg/gWXeAqjSYH"
          target="_blank"
          rel="noopener noreferrer"
          className="header-discord-btn"
        >
          <span>💬</span>
          <span>Discord</span>
        </a>
      </div>

      <style>{`
        .app-header {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--bg-tertiary);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-md);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          text-decoration: none;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .desktop-nav {
          display: none;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .desktop-nav-link {
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: var(--radius-lg);
          transition: all 0.2s ease;
        }

        .desktop-nav-link:hover,
        .desktop-nav-link.active {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .header-discord-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: #5865f2;
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .header-discord-btn:hover {
          background: #4752c4;
          transform: translateY(-1px);
        }

        @media (min-width: 768px) {
          .desktop-nav {
            display: flex;
          }
        }
      `}</style>
    </header>
  );
}

export default Header;
