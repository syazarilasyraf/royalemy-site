import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">👑</span>
          <span className="logo-text">RoyaleMY</span>
        </Link>
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
      `}</style>
    </header>
  );
}

export default Header;
