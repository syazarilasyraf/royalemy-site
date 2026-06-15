import { useNavigate } from 'react-router-dom';

const FEATURED_TOOLS = [
  {
    id: 'rankings',
    icon: '🏆',
    title: 'MY Rankings',
    desc: 'View Malaysian player leaderboards, trophies, and local rankings.',
    color: '#eab308',
  },
  {
    id: 'communitydecks',
    icon: '🌟',
    title: 'Community Decks',
    desc: 'Browse and vote on decks shared by the community. Submit your own for others to try.',
    color: '#f59e0b',
  },
  {
    id: 'clan',
    icon: '🏰',
    title: 'Clan Finder',
    desc: 'Search and explore Malaysian clans, find members, and compare clan stats.',
    color: '#ef4444',
  },
];

const ALL_TOOLS = [
  { id: 'arenadecks', icon: '🎯', title: 'Smart Deck Finder', desc: 'Live meta decks from pro battles' },
  { id: 'player', icon: '👤', title: 'Player Lookup', desc: 'Search player profiles & battles' },
  { id: 'deck', icon: '🎴', title: 'Deck Stats', desc: 'Analyze any deck link' },
];

function Home() {
  const navigate = useNavigate();

  const handleNavigate = (id) => {
    navigate(`/${id}`);
  };

  return (
    <div className="home">
      {/* ========== HERO ========== */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            RoyaleMY <span className="flag">🇲🇾</span>
          </h1>
          <p className="hero-subtitle">
            Clash Royale tools for Malaysian players
          </p>
          <button
            className="hero-cta"
            onClick={() => navigate('/tournaments')}
          >
            <span className="cta-icon">🎯</span>
            <span className="cta-text">Tournaments</span>
            <span className="cta-arrow">→</span>
          </button>
          <p className="hero-hint">
            Find & join Malaysian community tournaments
          </p>
        </div>
      </section>

      {/* ========== FEATURED TOOLS ========== */}
      <section className="featured-section">
        <h2 className="section-label">Featured Tools</h2>
        <div className="featured-grid">
          {FEATURED_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className="featured-card"
              onClick={() => handleNavigate(tool.id)}
              style={{ '--tool-color': tool.color }}
            >
              <div className="featured-icon-wrap">
                <span className="featured-icon">{tool.icon}</span>
              </div>
              <div className="featured-content">
                <h3 className="featured-title">{tool.title}</h3>
                <p className="featured-desc">{tool.desc}</p>
              </div>
              <span className="featured-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      {/* ========== ALL TOOLS ========== */}
      <section className="alltools-section">
        <h2 className="section-label">All Tools</h2>
        <div className="alltools-grid">
          {ALL_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className="alltools-card"
              onClick={() => handleNavigate(tool.id)}
            >
              <span className="alltools-icon">{tool.icon}</span>
              <div className="alltools-text">
                <span className="alltools-title">{tool.title}</span>
                <span className="alltools-desc">{tool.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ========== COMMUNITY ========== */}
      <section className="community-section">
        <div className="community-card">
          <div className="community-header">
            <span className="community-icon">🤝</span>
            <h2 className="community-title">Help Shape RoyaleMY</h2>
          </div>
          <p className="community-desc">
            Join the community to suggest features, report bugs, vote on future ideas, and participate in beta testing.
          </p>
          <div className="community-actions">
            <button
              onClick={() => navigate('/roadmap')}
              className="roadmap-btn"
            >
              <span>🗺️</span>
              <span>Roadmap</span>
            </button>
            <a
              href="https://discord.gg/gWXeAqjSYH"
              target="_blank"
              rel="noopener noreferrer"
              className="discord-btn"
            >
              <span>💬</span>
              <span>Discord</span>
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .home {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        /* ========== HERO ========== */
        .hero {
          text-align: center;
          padding: var(--spacing-xl) 0 var(--spacing-xl);
        }

        .hero-title {
          font-size: 2.75rem;
          font-weight: 800;
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
          line-height: 1.1;
        }

        .hero-title .flag {
          font-size: 2rem;
        }

        .hero-subtitle {
          font-size: 1.125rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-lg);
        }

        .hero-cta {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-xl);
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
          font-size: 1.125rem;
          font-weight: 700;
          border: none;
          border-radius: var(--radius-xl);
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
          transition: all 0.2s ease;
          margin-bottom: var(--spacing-sm);
        }

        .hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
        }

        .cta-icon {
          font-size: 1.25rem;
        }

        .cta-arrow {
          opacity: 0.8;
          transition: transform 0.2s;
        }

        .hero-cta:hover .cta-arrow {
          transform: translateX(3px);
        }

        .hero-hint {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* ========== SECTION LABEL ========== */
        .section-label {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--spacing-md);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ========== FEATURED TOOLS ========== */
        .featured-section {
          margin-bottom: var(--spacing-xl);
        }

        .featured-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-md);
        }

        .featured-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: var(--bg-secondary);
          border: 2px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .featured-card:hover {
          border-color: var(--tool-color);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .featured-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--tool-color) 0%, rgba(0,0,0,0.3) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.75rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .featured-content {
          flex: 1;
          min-width: 0;
        }

        .featured-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
        }

        .featured-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .featured-arrow {
          font-size: 1.25rem;
          color: var(--text-muted);
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .featured-card:hover .featured-arrow {
          color: var(--tool-color);
        }

        /* ========== ALL TOOLS ========== */
        .alltools-section {
          margin-bottom: var(--spacing-xl);
        }

        .alltools-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-sm);
        }

        .alltools-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .alltools-card:hover {
          border-color: var(--accent-primary);
          background: var(--bg-hover);
        }

        .alltools-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .alltools-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .alltools-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .alltools-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* ========== COMMUNITY ========== */
        .community-section {
          margin-bottom: var(--spacing-xl);
        }

        .community-card {
          background: linear-gradient(135deg, rgba(88, 101, 242, 0.15), var(--bg-secondary));
          border: 2px solid rgba(88, 101, 242, 0.35);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          text-align: center;
        }

        .community-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .community-icon {
          font-size: 1.5rem;
        }

        .community-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .community-desc {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0 0 var(--spacing-md);
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
        }

        .discord-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-lg);
          background: #5865f2;
          color: white;
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .discord-btn:hover {
          background: #4752c4;
          transform: translateY(-1px);
        }

        .community-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .roadmap-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.9375rem;
          font-weight: 700;
          border: 2px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .roadmap-btn:hover {
          border-color: var(--accent-primary);
          transform: translateY(-1px);
        }

        /* ========== RESPONSIVE ========== */
        @media (min-width: 640px) {
          .featured-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .featured-card {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }

          .featured-icon-wrap {
            margin-bottom: var(--spacing-sm);
          }

          .featured-arrow {
            margin-top: auto;
            align-self: flex-end;
          }

          .alltools-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 640px) {
          .home {
            padding: var(--spacing-sm);
          }

          .hero {
            padding: var(--spacing-lg) 0 var(--spacing-lg);
          }

          .hero-title {
            font-size: 2.25rem;
          }

          .hero-subtitle {
            font-size: 1rem;
          }

          .hero-cta {
            width: 100%;
            justify-content: center;
            font-size: 1rem;
          }

          .featured-card {
            padding: var(--spacing-md);
          }

          .featured-icon-wrap {
            width: 48px;
            height: 48px;
            font-size: 1.5rem;
          }

          .featured-title {
            font-size: 1rem;
          }

          .featured-desc {
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;
