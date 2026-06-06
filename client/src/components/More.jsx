import { useNavigate } from 'react-router-dom';

const MORE_TOOLS = [
  { id: 'deck', icon: '🎴', title: 'Deck Stats', desc: 'Analyze deck links' },
  { id: 'rankings', icon: '🏆', title: 'MY Rankings', desc: 'Malaysian leaderboards' },
  { id: 'tournaments', icon: '🎯', title: 'Tournaments', desc: 'Find & join tournaments' },
  { id: 'clan', icon: '🏰', title: 'Clan Finder', desc: 'Find Malaysian clans' },
  { id: 'communitydecks', icon: '🌟', title: 'Community Decks', desc: 'Browse & vote community decks' },
  { id: 'roadmap', icon: '🗺️', title: 'Roadmap', desc: 'Vote & suggest features' },
];

const LINKS = [
  {
    icon: '💬',
    title: 'Discord Community',
    desc: 'Suggest features, report bugs, vote on ideas',
    href: 'https://discord.gg/gWXeAqjSYH',
    external: true,
  },
  {
    icon: '📋',
    title: 'Feature Requests',
    desc: 'Have an idea? Let us know on Discord',
    href: 'https://discord.gg/gWXeAqjSYH',
    external: true,
  },
];

function More() {
  const navigate = useNavigate();

  return (
    <div className="more-page">
      <div className="more-container">
        <h1 className="more-title">More</h1>

        {/* Tools */}
        <section className="more-section">
          <h2 className="more-section-label">Tools</h2>
          <div className="more-tools-list">
            {MORE_TOOLS.map((tool) => (
              <button
                key={tool.id}
                className="more-tool-item"
                onClick={() => navigate(`/${tool.id}`)}
              >
                <span className="more-tool-icon">{tool.icon}</span>
                <div className="more-tool-text">
                  <span className="more-tool-title">{tool.title}</span>
                  <span className="more-tool-desc">{tool.desc}</span>
                </div>
                <span className="more-tool-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        {/* Links */}
        <section className="more-section">
          <h2 className="more-section-label">Community</h2>
          <div className="more-links-list">
            {LINKS.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="more-link-item"
              >
                <span className="more-link-icon">{link.icon}</span>
                <div className="more-link-text">
                  <span className="more-link-title">{link.title}</span>
                  <span className="more-link-desc">{link.desc}</span>
                </div>
                <span className="more-link-arrow">↗</span>
              </a>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="more-section">
          <h2 className="more-section-label">About</h2>
          <div className="more-about">
            <p>
              RoyaleMY is a fan-made platform created for Malaysian Clash Royale players.
            </p>
            <p>
              The goal of RoyaleMY is to provide useful tools and information for the Clash Royale community in Malaysia, including deck analysis, player lookup, clan search, and local rankings.
            </p>
            <p>
              RoyaleMY uses publicly available Clash Royale API data provided by Supercell.
            </p>
            <div className="more-legal">
              <p>
                RoyaleMY is <strong>not affiliated with, endorsed, sponsored, or specifically approved by Supercell</strong>.
              </p>
              <p>
                Clash Royale and all related assets are trademarks and copyrights of <strong>Supercell Oy</strong>.
              </p>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .more-page {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .more-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .more-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0;
          color: var(--text-primary);
        }

        .more-section-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 var(--spacing-md);
        }

        .more-tools-list,
        .more-links-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .more-tool-item,
        .more-link-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          text-align: left;
          width: 100%;
          color: inherit;
        }

        .more-tool-item:hover,
        .more-link-item:hover {
          border-color: var(--accent-primary);
          background: var(--bg-hover);
        }

        .more-tool-icon,
        .more-link-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .more-tool-text,
        .more-link-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .more-tool-title,
        .more-link-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .more-tool-desc,
        .more-link-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .more-tool-arrow,
        .more-link-arrow {
          font-size: 1rem;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .more-about {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .more-about p {
          margin: 0;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .more-legal {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          margin-top: var(--spacing-sm);
        }

        .more-legal p {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0;
        }

        .more-legal p:not(:last-child) {
          margin-bottom: var(--spacing-xs);
        }

        .more-legal strong {
          color: var(--text-primary);
        }

        @media (max-width: 640px) {
          .more-page {
            padding: var(--spacing-sm);
          }

          .more-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default More;
