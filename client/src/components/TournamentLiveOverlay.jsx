import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getTournamentLeaderboard } from '../services/api';

function useTransparentBody(enabled) {
  useEffect(() => {
    if (!enabled) return;
    const originalHtml = document.documentElement.style.background;
    const originalBody = document.body.style.background;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => {
      document.documentElement.style.background = originalHtml;
      document.body.style.background = originalBody;
    };
  }, [enabled]);
}

function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

function LiveIndicator() {
  return (
    <span className="live-indicator" aria-label="Live">
      <span className="live-pulse" />
      <span className="live-text">LIVE</span>
    </span>
  );
}

function RankChange({ change }) {
  if (!change || change === 0) return <span className="rank-change rank-same">-</span>;
  if (change > 0) {
    return (
      <span className="rank-change rank-up" aria-label={`Up ${change} places`}>
        ▲ {change}
      </span>
    );
  }
  return (
    <span className="rank-change rank-down" aria-label={`Down ${Math.abs(change)} places`}>
      ▼ {Math.abs(change)}
    </span>
  );
}

function LeaderboardRow({ row, index, compact }) {
  const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32'];
  const rankColor = rankColors[index] || 'var(--accent-primary)';

  return (
    <div
      className={classNames('leaderboard-row', compact && 'leaderboard-row-compact')}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className="leaderboard-rank" style={{ '--rank-color': rankColor }}>
        #{row.rank}
      </span>
      <div className="leaderboard-info">
        <span className="leaderboard-name">{row.player_name || row.player_tag}</span>
        <div className="leaderboard-meta">
          <span>{row.wins} Wins</span>
          <span>{row.crowns_earned} Crowns</span>
          {row.rank_change !== 0 && <RankChange change={row.rank_change} />}
        </div>
      </div>
      <span className="leaderboard-score">{row.score}</span>
    </div>
  );
}

function StatCard({ label, highlight, delay }) {
  if (!highlight) return null;
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <span className="stat-label">{label}</span>
      <span className="stat-name">{highlight.player_name || highlight.player_tag}</span>
      <span className="stat-value">{highlight.label}</span>
    </div>
  );
}

export default function TournamentLiveOverlay() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const transparent = searchParams.get('transparent') === 'true';
  const compact = searchParams.get('compact') === 'true';
  const topLimit = Math.min(Math.max(Number(searchParams.get('top')) || 3, 1), 10);

  useTransparentBody(transparent);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    try {
      const result = await getTournamentLeaderboard(id, topLimit);
      setData(result);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [id, topLimit]);

  const containerClass = classNames(
    'tournament-live-overlay',
    transparent && 'overlay-transparent',
    compact && 'overlay-compact'
  );

  const title = useMemo(() => data?.tournament?.name || 'Tournament', [data]);

  return (
    <div className={containerClass}>
      <div className="overlay-card">
        <div className="overlay-header">
          <LiveIndicator />
          <h1 className="overlay-title">{title}</h1>
          {lastUpdated && !compact && (
            <span className="overlay-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {error ? (
          <div className="overlay-error">{error}</div>
        ) : !data ? (
          <div className="overlay-loading">Loading leaderboard...</div>
        ) : (
          <>
            <div className="leaderboard">
              {data.leaderboard.map((row, index) => (
                <LeaderboardRow key={row.player_tag} row={row} index={index} compact={compact} />
              ))}
              {data.leaderboard.length === 0 && (
                <div className="overlay-empty">No battles recorded yet</div>
              )}
            </div>

            <div className="stats-grid">
              <StatCard label="HOT STREAK" highlight={data.highlights?.hot_streak} delay={400} />
              <StatCard label="BIGGEST CLIMBER" highlight={data.highlights?.biggest_climber} delay={500} />
              <StatCard label="MOST CROWNS" highlight={data.highlights?.most_crowns} delay={600} />
              <StatCard label="MOST ACTIVE" highlight={data.highlights?.most_active} delay={700} />
            </div>
          </>
        )}
      </div>

      <style>{`
        .tournament-live-overlay {
          min-height: 100vh;
          padding: var(--spacing-md);
          color: var(--text-primary);
          font-family: inherit;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          box-sizing: border-box;
        }

        .overlay-transparent {
          background: transparent !important;
          padding: 0;
        }

        .overlay-transparent .overlay-card {
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(6px);
          box-shadow: none;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .overlay-card {
          width: 100%;
          max-width: 520px;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg, 0.75rem);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          animation: fadeIn 0.4s ease;
        }

        .overlay-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
        }

        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          padding: 4px 8px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.75rem;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .live-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 1.2s ease-in-out infinite;
        }

        .overlay-title {
          flex: 1;
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .overlay-updated {
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-left: auto;
        }

        .leaderboard {
          padding: var(--spacing-sm) 0;
        }

        .leaderboard-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: 12px var(--spacing-md);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          animation: slideIn 0.35s ease both;
          transition: background 0.2s, transform 0.2s;
        }

        .leaderboard-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .leaderboard-row-compact {
          padding: 8px var(--spacing-md);
        }

        .leaderboard-rank {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          color: var(--rank-color);
          font-weight: 800;
          font-size: 0.9rem;
          border: 2px solid var(--rank-color);
        }

        .leaderboard-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .leaderboard-name {
          font-weight: 700;
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .leaderboard-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .leaderboard-score {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--accent-primary);
        }

        .rank-change {
          font-size: 0.7rem;
          font-weight: 700;
        }

        .rank-up { color: #22c55e; }
        .rank-down { color: #ef4444; }
        .rank-same { color: var(--text-muted); }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: rgba(0, 0, 0, 0.15);
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px;
          border-radius: var(--radius-md, 0.5rem);
          background: rgba(255, 255, 255, 0.04);
          animation: slideIn 0.35s ease both;
        }

        .stat-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .stat-name {
          font-size: 0.85rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .stat-value {
          font-size: 0.8rem;
          color: var(--accent-primary);
          font-weight: 700;
        }

        .overlay-loading,
        .overlay-empty,
        .overlay-error {
          padding: var(--spacing-lg);
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .overlay-error {
          color: #ef4444;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }

        @media (max-width: 480px) {
          .tournament-live-overlay {
            padding: 0;
          }
          .overlay-card {
            border-radius: 0;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
