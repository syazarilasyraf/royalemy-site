function SkeletonLoader({ type = 'card', count = 1 }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="skeleton-card">
            <div className="skeleton-header">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-lines">
                <div className="skeleton-line short"></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line medium"></div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="skeleton-text">
            <div className="skeleton-line"></div>
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line short"></div>
          </div>
        );

      case 'deck':
        return (
          <div className="skeleton-deck">
            <div className="skeleton-deck-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-deck-card"></div>
              ))}
            </div>
          </div>
        );

      case 'player':
        return (
          <div className="skeleton-player">
            <div className="skeleton-profile">
              <div className="skeleton-avatar large"></div>
              <div className="skeleton-profile-info">
                <div className="skeleton-line short"></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
            <div className="skeleton-stats">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-stat-box"></div>
              ))}
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="skeleton-list">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-list-item">
                <div className="skeleton-icon"></div>
                <div className="skeleton-line"></div>
              </div>
            ))}
          </div>
        );

      case 'grid':
        return (
          <div className="skeleton-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-grid-item">
                <div className="skeleton-icon"></div>
                <div className="skeleton-line short"></div>
              </div>
            ))}
          </div>
        );

      default:
        return <div className="skeleton-pulse"></div>;
    }
  };

  return (
    <div className={`skeleton-loader ${type}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="skeleton-wrapper">
          {renderSkeleton()}
        </div>
      ))}

      <style>{`
        .skeleton-loader {
          width: 100%;
        }

        .skeleton-wrapper {
          margin-bottom: var(--spacing-md);
        }

        .skeleton-wrapper:last-child {
          margin-bottom: 0;
        }

        /* Base Animation */
        .skeleton-line,
        .skeleton-avatar,
        .skeleton-icon,
        .skeleton-deck-card,
        .skeleton-stat-box,
        .skeleton-grid-item {
          background: linear-gradient(
            90deg,
            var(--bg-tertiary) 25%,
            var(--bg-hover) 50%,
            var(--bg-tertiary) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: var(--radius-md);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Card Skeleton */
        .skeleton-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          border: 1px solid var(--bg-tertiary);
        }

        .skeleton-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .skeleton-avatar.large {
          width: 64px;
          height: 64px;
        }

        .skeleton-lines {
          flex: 1;
        }

        .skeleton-line {
          height: 12px;
          margin-bottom: var(--spacing-sm);
        }

        .skeleton-line:last-child {
          margin-bottom: 0;
        }

        .skeleton-line.short {
          width: 40%;
        }

        .skeleton-line.medium {
          width: 70%;
        }

        /* Text Skeleton */
        .skeleton-text {
          padding: var(--spacing-md);
        }

        /* Deck Skeleton */
        .skeleton-deck {
          padding: var(--spacing-lg);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
        }

        .skeleton-deck-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-sm);
        }

        .skeleton-deck-card {
          aspect-ratio: 1;
          border-radius: var(--radius-md);
        }

        /* Player Skeleton */
        .skeleton-player {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
        }

        .skeleton-profile {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .skeleton-profile-info {
          flex: 1;
        }

        .skeleton-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
        }

        .skeleton-stat-box {
          height: 80px;
          border-radius: var(--radius-md);
        }

        /* List Skeleton */
        .skeleton-list {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md);
        }

        .skeleton-list-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .skeleton-list-item:last-child {
          border-bottom: none;
        }

        .skeleton-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }

        /* Grid Skeleton */
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: var(--spacing-md);
        }

        .skeleton-grid-item {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
        }

        .skeleton-grid-item .skeleton-icon {
          width: 48px;
          height: 48px;
        }

        /* Pulse Skeleton (simple) */
        .skeleton-pulse {
          height: 100px;
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 640px) {
          .skeleton-deck-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .skeleton-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .skeleton-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default SkeletonLoader;
