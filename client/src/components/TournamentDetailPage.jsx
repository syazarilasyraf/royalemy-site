import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCommunityTournament } from '../services/api';

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function WinnerPodium({ tournament, registrations = [] }) {
  const regMap = new Map(registrations.map((r) => [r.player_tag?.toUpperCase(), r]));

  const winners = [
    { place: '1st', icon: '🥇', tag: tournament.winner_1st, color: '#fbbf24' },
    { place: '2nd', icon: '🥈', tag: tournament.winner_2nd, color: '#94a3b8' },
    { place: '3rd', icon: '🥉', tag: tournament.winner_3rd, color: '#cd7f32' },
  ].filter((w) => w.tag);

  if (winners.length === 0) return null;

  return (
    <div className="tdp-section">
      <h4 className="tdp-section-title">🏆 Winners</h4>
      <div className="tdp-podium">
        {winners.map((w) => {
          const reg = regMap.get(w.tag.toUpperCase());
          const playerName = reg?.player_name || reg?.tiktok_username;
          return (
            <div key={w.place} className="tdp-podium-card" style={{ '--winner-color': w.color }}>
              <span className="tdp-winner-icon">{w.icon}</span>
              <span className="tdp-winner-place">{w.place}</span>
              {playerName && <span className="tdp-winner-name">{playerName}</span>}
              <span className="tdp-winner-tag">#{w.tag.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TournamentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCommunityTournament(id);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container tournament-detail-page">
      <button className="back-btn" onClick={() => navigate('/tournaments')}>
        ← Back to Tournaments
      </button>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading tournament details...</p>
        </div>
      ) : error ? (
        <div className="empty-state-box">
          <div className="empty-icon">⚠️</div>
          <h4>Error loading tournament</h4>
          <p className="empty-helper">{error}</p>
          <button className="submit-btn" onClick={loadTournament} style={{ marginTop: 'var(--spacing-md)' }}>
            Try Again
          </button>
        </div>
      ) : data?.tournament ? (
        <div className="tdp-card">
          <div className="tdp-header">
            <span className="tdp-status">{data.tournament.status === 'completed' ? '🏁 Completed' : 'ℹ️ Details'}</span>
            <h2 className="tdp-title">{data.tournament.name}</h2>
            <p className="tdp-host">Organized by {data.tournament.host_name}</p>
          </div>

          <div className="tdp-meta-grid">
            <div className="tdp-meta-item">
              <span className="tdp-meta-label">📅 Start Date</span>
              <span className="tdp-meta-value">{formatDate(data.tournament.start_date)}</span>
            </div>
            {data.tournament.end_date && (
              <div className="tdp-meta-item">
                <span className="tdp-meta-label">🏁 End Date</span>
                <span className="tdp-meta-value">{formatDate(data.tournament.end_date)}</span>
              </div>
            )}
            {data.tournament.registration_deadline && (
              <div className="tdp-meta-item">
                <span className="tdp-meta-label">⏰ Registration Deadline</span>
                <span className="tdp-meta-value">{formatDate(data.tournament.registration_deadline)}</span>
              </div>
            )}
            <div className="tdp-meta-item">
              <span className="tdp-meta-label">🎮 Format</span>
              <span className="tdp-meta-value">{data.tournament.format || 'Normal Battle'}</span>
            </div>
            <div className="tdp-meta-item">
              <span className="tdp-meta-label">👥 Players</span>
              <span className="tdp-meta-value">
                {data.participantCount || 0}
                {data.tournament.max_players ? ` / ${data.tournament.max_players}` : ' registered'}
              </span>
            </div>
            {data.tournament.prize && (
              <div className="tdp-meta-item">
                <span className="tdp-meta-label">🏆 Prize</span>
                <span className="tdp-meta-value tdp-prize">{data.tournament.prize}</span>
              </div>
            )}
          </div>

          {data.tournament.description && (
            <div className="tdp-section">
              <h4 className="tdp-section-title">📝 Description</h4>
              <p className="tdp-description">{data.tournament.description}</p>
            </div>
          )}

          {data.tournament.rules && (
            <div className="tdp-section">
              <h4 className="tdp-section-title">📜 Rules</h4>
              <p className="tdp-rules">{data.tournament.rules}</p>
            </div>
          )}

          <WinnerPodium tournament={data.tournament} registrations={data.registrations} />

          {data.tournament.tiktok_username && (
            <div className="tdp-section">
              <h4 className="tdp-section-title">🎵 Host TikTok</h4>
              <a
                href={`https://tiktok.com/@${data.tournament.tiktok_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tdp-tiktok-link"
              >
                @{data.tournament.tiktok_username}
              </a>
            </div>
          )}

          {data.registrations && data.registrations.length > 0 && (
            <div className="tdp-section">
              <h4 className="tdp-section-title">
                👥 Participants ({data.registrations.length})
              </h4>
              <div className="tdp-participants">
                {data.registrations.map((reg) => (
                  <div key={reg.id} className="tdp-participant">
                    <span className="tdp-participant-tag">#{reg.player_tag.toUpperCase()}</span>
                    {reg.tiktok_username && (
                      <span className="tdp-participant-tiktok">@{reg.tiktok_username}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-icon">🏛️</div>
          <h4>Tournament not found</h4>
          <p className="empty-helper">This tournament may have been removed or is no longer available.</p>
        </div>
      )}

      <style>{`
        .tournament-detail-page {
          animation: fadeIn 0.3s ease;
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }

        .tournament-detail-page .back-btn {
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .tournament-detail-page .back-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--accent-primary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .tournament-detail-page .back-btn:active {
          transform: translateY(0);
        }

        .tdp-card {
          background: linear-gradient(145deg, var(--bg-secondary), rgba(255,255,255,0.02));
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          position: relative;
          overflow: hidden;
        }

        .tdp-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #f59e0b, #ef4444, #3b82f6);
          opacity: 0.6;
        }

        .tdp-header {
          margin-bottom: var(--spacing-lg);
        }

        .tdp-status {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: 4px 10px;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          margin-bottom: var(--spacing-sm);
        }

        .tdp-title {
          margin: 0 0 var(--spacing-xs);
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1.25;
        }

        .tdp-host {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }

        .tdp-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .tdp-meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
        }

        .tdp-meta-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tdp-meta-value {
          font-size: 0.9375rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .tdp-prize {
          color: #fbbf24;
        }

        .tdp-section {
          margin-top: var(--spacing-lg);
        }

        .tdp-section-title {
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 700;
        }

        .tdp-description,
        .tdp-rules {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9375rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .tdp-podium {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .tdp-podium-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-xs);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-bottom: 3px solid var(--winner-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md) var(--spacing-lg);
          min-width: 110px;
          flex: 1;
        }

        .tdp-winner-icon {
          font-size: 1.5rem;
        }

        .tdp-winner-place {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
        }

        .tdp-winner-name {
          font-size: 0.9375rem;
          color: var(--text-primary);
          font-weight: 700;
          text-align: center;
          line-height: 1.2;
        }

        .tdp-winner-tag {
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-weight: 600;
          font-family: monospace;
        }

        .tdp-tiktok-link {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-primary);
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .tdp-tiktok-link:hover {
          background: var(--bg-hover);
          border-color: var(--accent-primary);
        }

        .tdp-participants {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: var(--spacing-sm);
        }

        .tdp-participant {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm) var(--spacing-md);
        }

        .tdp-participant-tag {
          font-size: 0.875rem;
          color: var(--text-primary);
          font-weight: 700;
        }

        .tdp-participant-tiktok {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @media (max-width: 600px) {
          .tdp-meta-grid {
            grid-template-columns: 1fr;
          }

          .tdp-podium {
            flex-direction: column;
          }

          .tdp-title {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
