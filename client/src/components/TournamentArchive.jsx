import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournamentArchive } from '../services/api';

function formatDateOnly(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TournamentArchive() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadArchive();
  }, []);

  const loadArchive = async () => {
    setLoading(true);
    try {
      const data = await getTournamentArchive();
      setTournaments(data.tournaments || []);
    } catch (err) {
      console.error('Failed to load archive:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container tournament-archive-page">
      <button className="back-btn" onClick={() => navigate('/tournaments')}>
        ← Back to Tournaments
      </button>
      <h2 className="section-title">🏛️ Tournament Archive</h2>
      <p className="section-desc">Completed tournaments and their results</p>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading archive...</p>
        </div>
      ) : tournaments.length > 0 ? (
        <div className="archive-list">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="archive-card"
              onClick={() => navigate(`/tournaments/${t.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/tournaments/${t.id}`); }}
            >
              <div className="archive-header">
                <h4>{t.name}</h4>
                <span className="archive-date">{formatDateOnly(t.start_date)}</span>
              </div>
              <div className="archive-meta">
                <span>{t.format}</span>
                <span>
                  {t.participant_count || 0} / {t.max_players || '∞'} players
                </span>
                {t.prize && <span className="archive-prize">{t.prize}</span>}
              </div>
              <div className="archive-winners">
                {t.winner_1st && (
                  <div className="archive-winner first">
                    <span>🥇</span>
                    <span>{t.winner_1st}</span>
                  </div>
                )}
                {t.winner_2nd && (
                  <div className="archive-winner second">
                    <span>🥈</span>
                    <span>{t.winner_2nd}</span>
                  </div>
                )}
                {t.winner_3rd && (
                  <div className="archive-winner third">
                    <span>🥉</span>
                    <span>{t.winner_3rd}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-icon">🏛️</div>
          <h4>No completed tournaments yet</h4>
          <p className="empty-helper">Check back after tournaments conclude!</p>
        </div>
      )}

      <style>{`
        .tournament-archive-page {
          animation: fadeIn 0.3s ease;
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }

        .tournament-archive-page .back-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: var(--spacing-md);
        }

        .tournament-archive-page .back-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--accent-primary);
          transform: translateY(-1px);
        }

        .archive-list {
          display: grid;
          gap: var(--spacing-lg);
        }

        .archive-card {
          background: linear-gradient(145deg, var(--bg-secondary), rgba(255,255,255,0.02));
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          position: relative;
          overflow: hidden;
        }

        .archive-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #f59e0b, #ef4444, #3b82f6);
          opacity: 0.6;
        }

        .archive-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.25);
          border-color: rgba(255,255,255,0.08);
          cursor: pointer;
        }

        .archive-card:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 2px;
        }

        .archive-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
          gap: var(--spacing-md);
        }

        .archive-header h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.3;
          flex: 1;
        }

        .archive-date {
          font-size: 0.8125rem;
          color: var(--text-muted);
          background: var(--bg-primary);
          padding: 4px 10px;
          border-radius: var(--radius-md);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .archive-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .archive-meta span {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          background: var(--bg-primary);
          padding: 5px 12px;
          border-radius: var(--radius-md);
          font-weight: 500;
          border: 1px solid var(--bg-tertiary);
        }

        .archive-prize {
          color: #fbbf24 !important;
          font-weight: 700;
          border-color: rgba(251, 191, 36, 0.2) !important;
        }

        .archive-winners {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        .archive-winner {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 0.875rem;
          color: var(--text-primary);
          background: var(--bg-primary);
          padding: 6px 12px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--bg-tertiary);
          font-weight: 600;
        }

        @media (max-width: 600px) {
          .archive-header {
            flex-direction: column;
            gap: var(--spacing-sm);
          }

          .archive-date {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
