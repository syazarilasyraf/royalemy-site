import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import InstallButton from './components/InstallButton';
import InstallBanner from './components/InstallBanner';
import UpdatePrompt from './components/UpdatePrompt';
import AdminLayout from './admin/AdminLayout';

const DeckStats = lazy(() => import('./components/DeckStats'));
const PlayerLookup = lazy(() => import('./components/PlayerLookup'));
const ClanFinder = lazy(() => import('./components/ClanFinder'));
const TournamentFinder = lazy(() => import('./components/TournamentFinder'));
const TournamentDetailPage = lazy(() => import('./components/TournamentDetailPage'));
const TournamentLiveOverlay = lazy(() => import('./components/TournamentLiveOverlay'));
const HallOfFame = lazy(() => import('./components/HallOfFame'));
const ArenaDeckRecommender = lazy(() => import('./components/ArenaDeckRecommender'));
const CommunityDeckFeed = lazy(() => import('./components/CommunityDeckFeed'));
const MYRankings = lazy(() => import('./components/MYRankings'));
const More = lazy(() => import('./components/More'));
const Roadmap = lazy(() => import('./components/Roadmap'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminLogs = lazy(() => import('./admin/AdminLogs'));
const AdminAuditTrail = lazy(() => import('./admin/AdminAuditTrail'));
const AdminTournaments = lazy(() => import('./admin/AdminTournaments'));
const AdminClans = lazy(() => import('./admin/AdminClans'));
const AdminDecks = lazy(() => import('./admin/AdminDecks'));
const AdminRoadmap = lazy(() => import('./admin/AdminRoadmap'));
const AdminNotifications = lazy(() => import('./admin/AdminNotifications'));

const NAV_ITEMS = [
  { id: '', label: 'Home', icon: '🏠' },
  { id: 'rankings', label: 'My Rankings', icon: '🏆' },
  { id: 'tournaments', label: 'Tournaments', icon: '🎯' },
  { id: 'communitydecks', label: 'Deck Feed', icon: '🌟' },
  { id: 'more', label: 'More', icon: '⋮' },
];

function Navigation() {
  const location = useLocation();
  const currentPath = location.pathname.slice(1) || '';

  // Hide public bottom navigation inside the admin area; admin has its own nav
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

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
        <div className="footer-links">
          <a href="https://discord.gg/gWXeAqjSYH" target="_blank" rel="noopener noreferrer" className="footer-link">Discord</a>
          <span className="footer-dot">·</span>
          <Link to="/roadmap" className="footer-link">Roadmap</Link>
        </div>
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

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isLiveOverlay = location.pathname.startsWith('/live/tournament');

  return (
    <div
      className={`app ${isAdmin ? 'app-admin' : ''} ${isLiveOverlay ? 'app-live-overlay' : ''}`}
      style={isLiveOverlay ? { background: 'transparent' } : undefined}
    >
      {!isLiveOverlay && <Header />}
      
      <main className={`main-content ${isLiveOverlay ? 'main-content-overlay' : ''}`}>
        <Suspense fallback={<div className="page-loader">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/deck" element={<DeckStats />} />
            <Route path="/player" element={<PlayerLookup />} />
            <Route path="/clan" element={<ClanFinder />} />
            <Route path="/tournaments" element={<TournamentFinder />} />
            <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
            <Route path="/tournaments/hall-of-fame" element={<HallOfFame />} />
            <Route path="/live/tournament/:id" element={<TournamentLiveOverlay />} />
            <Route path="/arenadecks" element={<ArenaDeckRecommender />} />
            <Route path="/communitydecks" element={<CommunityDeckFeed />} />
            <Route path="/rankings" element={<MYRankings />} />
            <Route path="/more" element={<More />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="tournaments" element={<AdminTournaments />} />
              <Route path="clans" element={<AdminClans />} />
              <Route path="decks" element={<AdminDecks />} />
              <Route path="roadmap" element={<AdminRoadmap />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="audit" element={<AdminAuditTrail />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!isLiveOverlay && <Footer />}
      {!isLiveOverlay && <Navigation />}
      {!isLiveOverlay && <InstallButton />}
      {!isLiveOverlay && <InstallBanner />}
      {!isLiveOverlay && <UpdatePrompt />}

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

        .main-content-overlay {
          padding: 0;
        }

        .page-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: var(--text-muted);
          font-size: 1rem;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
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

        .footer-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
          margin-bottom: var(--spacing-md);
          font-size: 0.8125rem;
        }

        .footer-dot {
          color: var(--text-muted);
          opacity: 0.5;
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

          .app.app-admin {
            padding-bottom: 0; /* Admin uses its own sticky header, not bottom nav */
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
