import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">👑</span>
          <span className="logo-text">RoyaleMY</span>
        </Link>
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
      `}</style>
    </header>
  );
}

export default Header;
