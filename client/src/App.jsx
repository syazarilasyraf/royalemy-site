import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import DeckStats from './components/DeckStats';
import PlayerLookup from './components/PlayerLookup';
import ClanFinder from './components/ClanFinder';
import TournamentFinder from './components/TournamentFinder';
import ArenaDeckRecommender from './components/ArenaDeckRecommender';
import MYRankings from './components/MYRankings';
import DeckMaxCalculator from './components/DeckMaxCalculator';
import About from './components/About';

const NAV_ITEMS = [
  { id: '', label: 'Home', icon: '🏠' },
  { id: 'rankings', label: 'Rankings', icon: '🏆' },
  { id: 'tournaments', label: 'Tourney', icon: '🎯' },
  { id: 'arenadecks', label: 'Decks', icon: '🃏' },
  { id: 'deck', label: 'Deck', icon: '🎴' },
  { id: 'player', label: 'Player', icon: '👤' },
  { id: 'clan', label: 'Clan', icon: '🏰' },
];

function Navigation() {
  const location = useLocation();
  const currentPath = location.pathname.slice(1) || '';
  
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          to={`/${item.id}`}
          className={`nav-item ${currentPath === item.id ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-main">
          <span className="footer-brand">RoyaleMY</span>
          <span className="footer-divider">|</span>
          <span className="footer-creator">
            Created by <a href="https://www.tiktok.com/@wandfk" target="_blank" rel="noopener noreferrer" className="footer-link">@wandfk</a>
          </span>
        </div>
        <div className="footer-disclaimer">
          <p>RoyaleMY is a fan-made Clash Royale community website for Malaysian players.</p>
          <p>This site is not affiliated with, endorsed, sponsored, or specifically approved by Supercell.</p>
          <p>Clash Royale and all related assets are trademarks and copyrights of Supercell Oy.</p>
        </div>
      </div>
    </footer>
  );
}

function DevBanner() {
  return (
    <div className="dev-banner">
      <div className="dev-banner-content">
        <span className="dev-icon">🚧</span>
        <div className="dev-text">
          <strong>Website in Progress</strong>
          <span className="dev-divider">|</span>
          <span>API served from development server</span>
          <span className="dev-divider">|</span>
          <span>Request features or report issues: <a href="https://www.tiktok.com/@wandfk" target="_blank" rel="noopener noreferrer">@wandfk</a></span>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <DevBanner />
      <Header />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deck" element={<DeckStats />} />
          <Route path="/player" element={<PlayerLookup />} />
          <Route path="/clan" element={<ClanFinder />} />
          <Route path="/tournaments" element={<TournamentFinder />} />
          <Route path="/arenadecks" element={<ArenaDeckRecommender />} />
          <Route path="/rankings" element={<MYRankings />} />
          <Route path="/tools/deck-max-calculator" element={<DeckMaxCalculator />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      <Navigation />

      <style>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
        }

        .main-content {
          flex: 1;
          padding: var(--spacing-md);
        }

        /* Development Banner */
        .dev-banner {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 8px var(--spacing-md);
          font-size: 0.8rem;
          text-align: center;
        }

        .dev-banner-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .dev-icon {
          font-size: 1rem;
        }

        .dev-text {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          flex-wrap: wrap;
          justify-content: center;
        }

        .dev-banner a {
          color: white;
          text-decoration: underline;
          font-weight: 600;
        }

        .dev-banner a:hover {
          opacity: 0.8;
        }

        .dev-divider {
          opacity: 0.5;
        }

        @media (max-width: 640px) {
          .dev-banner {
            font-size: 0.7rem;
            padding: 6px var(--spacing-sm);
          }
          
          .dev-divider {
            display: none;
          }
          
          .dev-text {
            flex-direction: column;
            gap: 2px;
          }
        }

        /* Bottom Navigation - MOBILE ONLY */
        .bottom-nav {
          display: none; /* Hidden by default (desktop) */
        }

        /* Footer */
        .app-footer {
          background: var(--bg-secondary);
          border-top: 1px solid var(--bg-tertiary);
          padding: var(--spacing-lg) var(--spacing-md);
        }

        .footer-content {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-main {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
          margin-bottom: var(--spacing-md);
        }

        .footer-brand {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .footer-creator {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .footer-link {
          color: var(--accent-primary);
          text-decoration: none;
          font-weight: 600;
        }

        .footer-link:hover {
          text-decoration: underline;
        }

        .footer-divider {
          color: var(--text-muted);
          opacity: 0.5;
        }

        .footer-disclaimer {
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--bg-tertiary);
        }

        .footer-disclaimer p {
          font-size: 0.6875rem;
          color: var(--text-muted);
          margin: 0 0 var(--spacing-xs);
          line-height: 1.5;
        }

        .footer-disclaimer p:last-child {
          margin-bottom: 0;
        }

        /* MOBILE: Show bottom nav */
        @media (max-width: 767px) {
          .app {
            padding-bottom: 64px; /* Space for bottom nav */
          }

          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            justify-content: space-around;
            background: var(--bg-secondary);
            border-top: 1px solid var(--bg-tertiary);
            z-index: 100;
          }

          .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: var(--spacing-xs) var(--spacing-sm);
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.625rem;
            flex: 1;
            transition: color 0.2s;
          }

          .nav-item.active {
            color: var(--accent-primary);
          }

          .nav-icon {
            font-size: 1.25rem;
            margin-bottom: 2px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
