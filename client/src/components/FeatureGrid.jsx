import { useState } from 'react';
import FeatureLocked from './FeatureLocked';

const FEATURES = [
  {
    id: 'deck-submission',
    title: 'Submit Deck',
    description: 'Share your deck for live review and feedback',
    icon: '🎴',
    status: 'active',
    color: '#22c55e'
  },
  {
    id: 'player-lookup',
    title: 'Player Lookup',
    description: 'View player stats, trophies, and battle history',
    icon: '👤',
    status: 'locked',
    color: '#3b82f6'
  },
  {
    id: 'clan-finder',
    title: 'Clan Finder',
    description: 'Find active Malaysian clans to join',
    icon: '🏰',
    status: 'locked',
    color: '#a855f7'
  },
  {
    id: 'deck-rankings',
    title: 'Deck Rankings',
    description: 'Top rated decks from the community',
    icon: '🏆',
    status: 'locked',
    color: '#f59e0b'
  },
  {
    id: 'meta-decks',
    title: 'Meta Decks',
    description: 'Current meta decks for each arena',
    icon: '📈',
    status: 'locked',
    color: '#ef4444'
  },
  {
    id: 'counter-helper',
    title: 'Counter Helper',
    description: 'Learn how to counter popular cards',
    icon: '🛡️',
    status: 'locked',
    color: '#06b6d4'
  }
];

function FeatureGrid({ onSelectActive }) {
  const [lockedModal, setLockedModal] = useState({ isOpen: false, feature: '' });

  const handleFeatureClick = (feature) => {
    if (feature.status === 'active') {
      onSelectActive();
    } else {
      setLockedModal({ isOpen: true, feature: feature.title });
    }
  };

  const closeModal = () => {
    setLockedModal({ isOpen: false, feature: '' });
  };

  return (
    <div className="feature-grid-container">
      <div className="feature-grid">
        {FEATURES.map((feature) => (
          <div
            key={feature.id}
            onClick={() => handleFeatureClick(feature)}
            className={`feature-card ${feature.status}`}
            style={{ '--feature-color': feature.color }}
          >
            {/* Status Badge */}
            <div className="feature-status-badge">
              {feature.status === 'active' ? (
                <span className="status-active">
                  <span className="pulse-dot"></span>
                  Live
                </span>
              ) : (
                <span className="status-locked">
                  <span className="lock-small">🔒</span>
                  Soon
                </span>
              )}
            </div>

            {/* Icon */}
            <div className="feature-icon-wrapper">
              <span className="feature-icon">{feature.icon}</span>
            </div>

            {/* Content */}
            <div className="feature-content">
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </div>

            {/* Hover Glow Effect */}
            <div className="feature-glow"></div>
          </div>
        ))}
      </div>

      {/* Locked Feature Modal */}
      <FeatureLocked
        isOpen={lockedModal.isOpen}
        onClose={closeModal}
        featureName={lockedModal.feature}
      />

      <style>{`
        .feature-grid-container {
          width: 100%;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: var(--spacing-md);
        }

        @media (min-width: 640px) {
          .feature-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .feature-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .feature-card {
          position: relative;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          border: 2px solid var(--bg-tertiary);
          cursor: pointer;
          transition: all var(--transition-fast);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-height: 160px;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: var(--feature-color);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .feature-card.active {
          border-color: var(--feature-color);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, var(--bg-secondary) 100%);
        }

        .feature-card.active:hover {
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.2);
        }

        .feature-card.locked {
          opacity: 0.7;
        }

        .feature-card.locked:hover {
          opacity: 0.85;
        }

        /* Status Badge */
        .feature-status-badge {
          position: absolute;
          top: var(--spacing-sm);
          right: var(--spacing-sm);
        }

        .status-active {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #22c55e;
          background: rgba(34, 197, 94, 0.15);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .status-locked {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          background: var(--bg-primary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .lock-small {
          font-size: 0.625rem;
        }

        /* Icon */
        .feature-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--spacing-sm);
          border: 1px solid var(--bg-tertiary);
          transition: all var(--transition-fast);
        }

        .feature-card:hover .feature-icon-wrapper {
          border-color: var(--feature-color);
          box-shadow: 0 0 16px rgba(0, 0, 0, 0.2);
        }

        .feature-icon {
          font-size: 1.75rem;
        }

        /* Content */
        .feature-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .feature-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .feature-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
        }

        /* Glow Effect */
        .feature-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, var(--feature-color) 0%, transparent 70%);
          opacity: 0;
          transition: opacity var(--transition-fast);
          pointer-events: none;
          z-index: -1;
        }

        .feature-card:hover .feature-glow {
          opacity: 0.1;
        }
      `}</style>
    </div>
  );
}

export default FeatureGrid;
