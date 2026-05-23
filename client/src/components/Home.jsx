import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { id: 'rankings', icon: '🏆', title: 'MY Rankings', desc: 'Malaysian leaderboards' },
  { id: 'tournaments', icon: '🎯', title: 'Tournaments', desc: 'Find & join tournaments' },
  { id: 'arenadecks', icon: '🃏', title: 'Arena Decks', desc: 'Best decks by arena' },
  { id: 'deck', icon: '🎴', title: 'Deck Stats', desc: 'Analyze from share links' },
  { id: 'player', icon: '👤', title: 'Player Lookup', desc: 'Profiles & battle logs' },
  { id: 'clan', icon: '🏰', title: 'Clan Finder', desc: 'Find Malaysian clans' },
  { id: 'tools/deck-max-calculator', icon: '⏱️', title: 'Deck Max Calc', desc: 'Time to max your deck' },
];

const COMING_SOON = [
  { icon: '📊', title: 'Card Win Rates', desc: 'Performance analytics' },
  { icon: '🔥', title: 'Deck Popularity', desc: 'Trending builds' },
  { icon: '📰', title: 'Malaysian Deck Feed', desc: 'Community decks' },
];

function Home() {
  const navigate = useNavigate();
  const [deckLink, setDeckLink] = useState('');

  const handleDeckSubmit = (e) => {
    e.preventDefault();
    if (deckLink.trim()) {
      navigate(`/deck?link=${encodeURIComponent(deckLink)}`);
    }
  };

  const handleFeatureClick = (id) => {
    navigate(`/${id}`);
  };

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            RoyaleMY <span className="flag">🇲🇾</span>
          </h1>
          <p className="hero-subtitle">
            Clash Royale tools for Malaysian players
          </p>
          <div className="hero-features">
            {FEATURES.map(f => (
              <span key={f.id} className="hero-feature">
                <span className="hf-icon">{f.icon}</span>
                <span className="hf-text">{f.title}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Primary Action - Deck Input */}
      <section className="primary-action">
        <div className="action-card">
          <h2 className="action-title">Analyze Your Deck</h2>
          <form onSubmit={handleDeckSubmit} className="deck-form">
            <div className="input-group">
              <input
                type="text"
                value={deckLink}
                onChange={(e) => setDeckLink(e.target.value)}
                placeholder="Paste Clash Royale Deck Link"
                className="deck-input"
              />
              <button type="submit" className="analyze-btn" disabled={!deckLink.trim()}>
                Analyze Deck
              </button>
            </div>
            <p className="input-hint">
              Share your deck from the Clash Royale app and paste the link here
            </p>
          </form>
        </div>
      </section>

      {/* Featured: MY Rankings */}
      <section className="rankings-featured">
        <div className="rf-card" onClick={() => navigate('/rankings')}>
          <div className="rf-header">
            <span className="rf-icon">🏆</span>
            <div className="rf-text">
              <h3 className="rf-title">Malaysia Rankings</h3>
              <p className="rf-desc">Top clans & ranked players</p>
            </div>
            <span className="rf-arrow">→</span>
          </div>
          <div className="rf-categories">
            <span className="rf-badge">🏆 Ranked Mode</span>
            <span className="rf-badge">🏰 Top Clans</span>
            <span className="rf-badge">⚔️ Clan Wars</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="features-section">
        <h3 className="section-title">Tools</h3>
        <div className="features-grid">
          {FEATURES.map(feature => (
            <button
              key={feature.id}
              onClick={() => handleFeatureClick(feature.id)}
              className="feature-card"
            >
              <span className="fc-icon">{feature.icon}</span>
              <span className="fc-title">{feature.title}</span>
              <span className="fc-desc">{feature.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Coming Soon */}
      <section className="coming-soon">
        <h3 className="section-title">Coming Soon</h3>
        <div className="cs-grid">
          {COMING_SOON.map((item, idx) => (
            <div key={idx} className="cs-card">
              <span className="cs-lock">🔒</span>
              <span className="cs-icon">{item.icon}</span>
              <span className="cs-title">{item.title}</span>
              <span className="cs-desc">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .home {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        /* Hero */
        .hero {
          text-align: center;
          padding: var(--spacing-xl) 0;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
        }

        .hero-title .flag {
          font-size: 2rem;
        }

        .hero-subtitle {
          font-size: 1.125rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-lg);
        }

        .hero-features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--spacing-sm);
        }

        .hero-feature {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .hf-icon {
          font-size: 1rem;
        }

        /* Primary Action */
        .primary-action {
          margin-bottom: var(--spacing-xl);
        }

        .action-card {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
          border: 2px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
        }

        .action-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-md);
          text-align: center;
        }

        .deck-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .input-group {
          display: flex;
          gap: var(--spacing-sm);
        }

        .deck-input {
          flex: 1;
          padding: var(--spacing-md);
          font-size: 1rem;
          background: var(--bg-primary);
          border: 2px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-primary);
          min-width: 0;
        }

        .deck-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .deck-input::placeholder {
          color: var(--text-muted);
        }

        .analyze-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: var(--accent-primary);
          color: white;
          font-weight: 700;
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s;
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .analyze-btn:hover:not(:disabled) {
          background: var(--accent-secondary);
        }

        .input-hint {
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* Rankings Featured */
        .rankings-featured {
          margin-bottom: var(--spacing-xl);
        }

        .rf-card {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1));
          border: 2px solid rgba(245, 158, 11, 0.4);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          cursor: pointer;
          transition: all 0.2s;
        }

        .rf-card:hover {
          transform: translateY(-2px);
          border-color: rgba(245, 158, 11, 0.6);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15);
        }

        .rf-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .rf-icon {
          font-size: 2.5rem;
        }

        .rf-text {
          flex: 1;
        }

        .rf-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .rf-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .rf-arrow {
          font-size: 1.5rem;
          color: var(--text-muted);
        }

        .rf-categories {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .rf-badge {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: rgba(0, 0, 0, 0.3);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        /* Features Section */
        .features-section {
          margin-bottom: var(--spacing-xl);
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--spacing-md);
        }

        .feature-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
        }

        .feature-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        .fc-icon {
          font-size: 2rem;
          margin-bottom: var(--spacing-xs);
        }

        .fc-title {
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .fc-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        /* Coming Soon */
        .coming-soon {
          margin-bottom: var(--spacing-xl);
        }

        .cs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
        }

        .cs-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          opacity: 0.7;
        }

        .cs-lock {
          position: absolute;
          top: var(--spacing-xs);
          right: var(--spacing-xs);
          font-size: 0.75rem;
          opacity: 0.5;
        }

        .cs-icon {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-xs);
          filter: grayscale(0.3);
        }

        .cs-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 2px;
        }

        .cs-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Mobile */
        @media (max-width: 640px) {
          .home {
            padding: var(--spacing-sm);
          }

          .hero-title {
            font-size: 2rem;
          }

          .hero-features {
            gap: var(--spacing-xs);
          }

          .hero-feature {
            font-size: 0.75rem;
            padding: 4px 8px;
          }

          .input-group {
            flex-direction: column;
          }

          .analyze-btn {
            width: 100%;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-sm);
          }

          .feature-card {
            padding: var(--spacing-sm);
          }

          .fc-icon {
            font-size: 1.5rem;
          }

          .fc-title {
            font-size: 0.875rem;
          }

          .fc-desc {
            font-size: 0.75rem;
          }

          .cs-grid {
            grid-template-columns: 1fr;
            gap: var(--spacing-sm);
          }

          .cs-card {
            flex-direction: row;
            text-align: left;
            align-items: center;
            gap: var(--spacing-sm);
          }

          .cs-icon {
            margin-bottom: 0;
            font-size: 1.25rem;
          }

          .cs-lock {
            position: static;
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;
