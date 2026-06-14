import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TournamentBracket from './TournamentBracket';
import {
  getCommunityTournaments,
  getCommunityTournament,
  getTournamentArchive,
  submitCommunityTournament,
  registerForTournament,
  getTournamentRegistrations,
  getHallOfFame,
  updateTournamentStatus,
  updateTournament,
  deleteTournament,
  deleteRegistration,
  updateRegistration,
  searchTournaments,
  getTournament,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  exportTournamentRegistrations,
  promoteWaitlist,
} from '../services/api';

// ==================== CONSTANTS ====================

const STATUS_LABELS = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_BADGES = {
  pending: 'badge-warning',
  approved: 'badge-info',
  rejected: 'badge-danger',
  registration_open: 'badge-success',
  registration_closed: 'badge-secondary',
  live: 'badge-live',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

const PUBLIC_STATUSES = ['approved', 'registration_open', 'registration_closed', 'live'];

const TOURNAMENT_FORMATS = [
  'Normal Battle',
  'Double Elixir Battle',
  'Triple Elixir Battle',
  'Sudden Death Battle',
  'Draft Battle',
  'Double Elixir Draft',
  'Triple Draft',
  'Heist Draft',
  'Hog Race',
  'Lumberjack Rush',
  'Wall Breaker Party',
  'Ghost Parade',
  'Elixir Capture',
  'Dragon Hunt',
  'Duel',
  'Mega Draft Challenge',
];

const PRIZE_STATUS_LABELS = {
  pending: 'Pending',
  contacted: 'Contacted',
  paid: 'Paid',
};

// ==================== HELPER FUNCTIONS ====================

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

function getCountdown(targetDate) {
  if (!targetDate) return null;
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) return { expired: true, text: 'Started' };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return { expired: false, text: `${days}d ${hours}h ${minutes}m` };
  if (hours > 0) return { expired: false, text: `${hours}h ${minutes}m ${seconds}s` };
  return { expired: false, text: `${minutes}m ${seconds}s` };
}

function useCountdown(targetDate) {
  const [countdown, setCountdown] = useState(getCountdown(targetDate));

  useEffect(() => {
    if (!targetDate) return;
    setCountdown(getCountdown(targetDate));
    const interval = setInterval(() => {
      setCountdown(getCountdown(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

function validatePlayerTag(tag) {
  if (!tag) return false;
  const clean = tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.length >= 3 && clean.length <= 10 ? clean : false;
}

function getStatusConfig(status) {
  switch (status?.toLowerCase()) {
    case 'inprogress': return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Active', dot: '🟢' };
    case 'upcoming': return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: 'Upcoming', dot: '🔵' };
    case 'ended': return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: 'Finished', dot: '⚪' };
    default: return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Unknown', dot: '🟡' };
  }
}

// ==================== COMPONENTS ====================

function CountdownTimer({ targetDate, className = '' }) {
  const countdown = useCountdown(targetDate);
  if (!countdown) return null;
  return (
    <span className={`countdown-timer ${countdown.expired ? 'expired' : ''} ${className}`}>
      {countdown.expired ? countdown.text : `Starts in: ${countdown.text}`}
    </span>
  );
}

function TournamentStatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const badgeClass = STATUS_BADGES[status] || 'badge-secondary';
  return <span className={`badge ${badgeClass}`}>{label}</span>;
}

// ==================== TOURNAMENT DETAIL ====================

function TournamentDetail({ tournament, onBack, onRefresh, adminKey, notifications = [] }) {
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({ player_tag: '', tiktok_username: '' });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerWaitlist, setRegisterWaitlist] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  // Admin participant management state
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [participantEditForm, setParticipantEditForm] = useState({ player_tag: '', tiktok_username: '' });
  const [participantEditLoading, setParticipantEditLoading] = useState(false);

  // Admin edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => ({ ...tournament }));
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const countdown = useCountdown(tournament.start_date);

  useEffect(() => {
    loadRegistrations();
  }, [tournament.id]);

  useEffect(() => {
    setEditForm({ ...tournament });
  }, [tournament]);

  const loadRegistrations = async () => {
    try {
      const data = await getTournamentRegistrations(tournament.id);
      setRegistrations(data.registrations || []);
      setWaitlist(data.waitlist || []);
    } catch (err) {
      console.error('Failed to load registrations:', err);
    }
  };

  const handlePromoteWaitlist = async (regId) => {
    if (!adminKey) return;
    try {
      await promoteWaitlist(tournament.id, regId, adminKey);
      loadRegistrations();
      onRefresh();
    } catch (err) {
      console.error('Failed to promote waitlist:', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerForm.player_tag) {
      setRegisterError('Player tag is required');
      return;
    }

    const cleanTag = validatePlayerTag(registerForm.player_tag);
    if (!cleanTag) {
      setRegisterError('Invalid player tag. Must be 3-10 alphanumeric characters.');
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await registerForTournament(tournament.id, {
        player_tag: cleanTag,
        tiktok_username: registerForm.tiktok_username,
      });
      if (res.waitlist) {
        setRegisterSuccess(`Tournament is full. You are #${res.position} on the waitlist.`);
        setRegisterWaitlist(true);
      } else {
        setRegisterSuccess('Registration successful!');
        setRegisterWaitlist(false);
      }
      setRegisterForm({ player_tag: '', tiktok_username: '' });
      loadRegistrations();
      onRefresh();
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);
    try {
      await updateTournament(tournament.id, {
        name: editForm.name,
        description: editForm.description,
        host_name: editForm.host_name,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        registration_deadline: editForm.registration_deadline,
        format: editForm.format,
        max_players: editForm.max_players,
        prize: editForm.prize,
        rules: editForm.rules,
        tiktok_username: editForm.tiktok_username,
        tiktok_live_url: editForm.tiktok_live_url,
        tournament_password: editForm.tournament_password,
      }, adminKey);
      setEditSuccess('Tournament updated successfully!');
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      setEditError(err.message || 'Failed to update tournament');
    } finally {
      setEditLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === tournament.status) return;
    setStatusLoading(true);
    try {
      await updateTournamentStatus(tournament.id, newStatus, adminKey);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tournament? This cannot be undone.')) return;
    try {
      await deleteTournament(tournament.id, adminKey);
      onBack();
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete tournament');
    }
  };

  const handleDeleteParticipant = async (regId, playerName) => {
    if (!confirm(`Remove ${playerName} from this tournament?`)) return;
    try {
      await deleteRegistration(tournament.id, regId, adminKey);
      loadRegistrations();
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to remove participant');
    }
  };

  const handleStartEditParticipant = (reg) => {
    setEditingParticipant(reg.id);
    setParticipantEditForm({
      player_tag: reg.player_tag,
      tiktok_username: reg.tiktok_username || '',
    });
  };

  const handleSaveParticipant = async (regId) => {
    setParticipantEditLoading(true);
    try {
      await updateRegistration(tournament.id, regId, participantEditForm, adminKey);
      setEditingParticipant(null);
      loadRegistrations();
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update participant');
    } finally {
      setParticipantEditLoading(false);
    }
  };

  const canRegister = tournament.status === 'approved' || tournament.status === 'registration_open';
  const isFull = tournament.max_players && registrations.length >= tournament.max_players;
  const waitlistCount = waitlist.length;

  return (
    <div className="tournament-details">
      <button className="back-btn" onClick={onBack}>← Back to Tournaments</button>

      <div className="details-card">
        <div className="details-hero">
          <div className="details-header">
            <TournamentStatusBadge status={tournament.status} />
            {countdown && !countdown.expired && (
              <CountdownTimer targetDate={tournament.start_date} className="details-countdown" />
            )}
          </div>
          <h2>{tournament.name}</h2>
          <p className="details-organizer">👤 Organized by <strong>{tournament.host_name}</strong></p>
        </div>

        {tournament.tiktok_username && (
          <a
            href={`https://www.tiktok.com/@${tournament.tiktok_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tiktok-banner"
          >
            <span className="tiktok-icon">🎵</span>
            <div>
              <p className="tiktok-label">Tournament Organizer on TikTok</p>
              <p className="tiktok-user">@{tournament.tiktok_username}</p>
            </div>
            <span className="tiktok-arrow">→</span>
          </a>
        )}

        {tournament.tiktok_live_url && tournament.status === 'live' && (
          <a
            href={tournament.tiktok_live_url}
            target="_blank"
            rel="noopener noreferrer"
            className="live-banner"
          >
            <span className="live-dot"></span>
            Watch Live on TikTok
          </a>
        )}

        <div className="details-stats">
          <div className="ds-item">
            <span className="ds-icon">📅</span>
            <span className="ds-value">{formatDate(tournament.start_date)}</span>
            <span className="ds-label">Start Date</span>
          </div>
          {tournament.end_date && (
            <div className="ds-item">
              <span className="ds-icon">🏁</span>
              <span className="ds-value">{formatDate(tournament.end_date)}</span>
              <span className="ds-label">End Date</span>
            </div>
          )}
          {tournament.registration_deadline && (
            <div className="ds-item">
              <span className="ds-icon">⏰</span>
              <span className="ds-value">{formatDate(tournament.registration_deadline)}</span>
              <span className="ds-label">Registration Deadline</span>
            </div>
          )}
          <div className="ds-item">
            <span className="ds-icon">⚔️</span>
            <span className="ds-value">{tournament.format || 'Normal Battle'}</span>
            <span className="ds-label">Format</span>
          </div>
          <div className="ds-item">
            <span className="ds-icon">👥</span>
            <span className="ds-value">{registrations.length}{tournament.max_players ? ` / ${tournament.max_players}` : ''}</span>
            <span className="ds-label">Participants</span>
          </div>
          {tournament.prize && (
            <div className="ds-item prize">
              <span className="ds-icon">🏆</span>
              <span className="ds-value">{tournament.prize}</span>
              <span className="ds-label">Prize Pool</span>
            </div>
          )}
        </div>

        {tournament.description && (
          <div className="details-section">
            <h4>📝 Description</h4>
            <div className="details-box">{tournament.description}</div>
          </div>
        )}

        {tournament.rules && (
          <div className="details-section">
            <h4>📜 Rules</h4>
            <div className="details-box rules-text">{tournament.rules}</div>
          </div>
        )}

        {tournament.status === 'completed' && (
          <div className="details-section winners-section">
            <h4>🏆 Tournament Results</h4>
            <div className="winners-grid">
              {tournament.winner_1st && (
                <div className="winner-card first">
                  <span className="winner-medal">🥇</span>
                  <span className="winner-title">Champion</span>
                  <span className="winner-tag">{tournament.winner_1st}</span>
                </div>
              )}
              {tournament.winner_2nd && (
                <div className="winner-card second">
                  <span className="winner-medal">🥈</span>
                  <span className="winner-title">Runner-up</span>
                  <span className="winner-tag">{tournament.winner_2nd}</span>
                </div>
              )}
              {tournament.winner_3rd && (
                <div className="winner-card third">
                  <span className="winner-medal">🥉</span>
                  <span className="winner-title">Third Place</span>
                  <span className="winner-tag">{tournament.winner_3rd}</span>
                </div>
              )}
            </div>
            <div className="prize-status">
              Prize Status: <span className={`ps-badge ps-${tournament.prize_status || 'pending'}`}>{PRIZE_STATUS_LABELS[tournament.prize_status] || 'Pending'}</span>
            </div>
          </div>
        )}

        {canRegister && (
          <div className="registration-area">
            {!showRegister ? (
              <div className="registration-card">
                <div className="rc-icon">🏆</div>
                <h4>Want to compete?</h4>
                <p>Register now to secure your spot in this tournament.</p>
                <button
                  className="register-btn"
                  onClick={() => setShowRegister(true)}
                  disabled={isFull}
                >
                  <span>{isFull ? 'Tournament Full' : 'Register Now'}</span>
                </button>
              </div>
            ) : (
              <div className="registration-card active">
                <div className="rc-header">
                  <span className="rc-header-icon">📝</span>
                  <h4>Register for Tournament</h4>
                </div>
                {registerSuccess && <div className="submit-success">{registerSuccess}</div>}
                {registerError && <div className="submit-error">{registerError}</div>}
                <form onSubmit={handleRegister}>
                  <div className="form-field full-width">
                    <label>TikTok Username (optional)</label>
                    <div className="tiktok-input-wrapper">
                      <span className="tiktok-at">@</span>
                      <input
                        type="text"
                        value={registerForm.tiktok_username}
                        onChange={(e) => setRegisterForm((p) => ({ ...p, tiktok_username: e.target.value.replace(/^@+/, '') }))}
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-btn" disabled={registerLoading}>
                      {registerLoading ? 'Registering...' : '✓ Confirm Registration'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowRegister(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="details-section notifications-section">
            <h4>📢 Tournament Updates</h4>
            <div className="notifications-list">
              {notifications.map((n) => (
                <div key={n.id} className={`notification-item notification-${n.type}`}>
                  <span className="notification-dot"></span>
                  <div className="notification-content">
                    <p className="notification-message">{n.message}</p>
                    <span className="notification-time">{formatDate(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {registrations.length > 0 && (
          <div className="details-section participants-section">
            <div className="participants-header" onClick={() => setShowParticipants((p) => !p)}>
              <h4>👥 Participants ({registrations.length}{tournament.max_players ? ` / ${tournament.max_players}` : ''})</h4>
              <div className="participants-header-actions">
                {adminKey && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTournamentRegistrations(tournament.id, adminKey);
                    }}
                  >
                    📥 Export CSV
                  </button>
                )}
                <span className="participants-toggle">{showParticipants ? '▲' : '▼'}</span>
              </div>
            </div>
            {showParticipants && (
              <div className="participants-list">
                {registrations.map((reg, idx) => (
                  <div key={reg.id} className="participant-row">
                    {editingParticipant === reg.id ? (
                      <>
                        <span className="participant-rank">#{idx + 1}</span>
                        <input
                          type="text"
                          className="participant-edit-input tag-input"
                          value={participantEditForm.player_tag}
                          onChange={(e) => setParticipantEditForm((p) => ({ ...p, player_tag: e.target.value }))}
                          placeholder="Tag"
                        />
                        <input
                          type="text"
                          className="participant-edit-input tiktok-input"
                          value={participantEditForm.tiktok_username}
                          onChange={(e) => setParticipantEditForm((p) => ({ ...p, tiktok_username: e.target.value }))}
                          placeholder="TikTok"
                        />
                        <div className="participant-actions">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleSaveParticipant(reg.id)}
                            disabled={participantEditLoading}
                          >
                            {participantEditLoading ? '...' : '✓'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingParticipant(null)}
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="participant-rank">#{idx + 1}</span>
                        <span className="participant-tag">{reg.player_tag}</span>
                        {reg.tiktok_username && <span className="participant-tiktok">🎵 @{reg.tiktok_username}</span>}
                        {adminKey && (
                          <div className="participant-actions">
                            <button
                              className="btn btn-info btn-sm"
                              onClick={() => handleStartEditParticipant(reg)}
                              title="Edit participant"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteParticipant(reg.id, reg.player_tag)}
                              title="Remove participant"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {waitlist.length > 0 && (
          <div className="details-section participants-section">
            <div className="participants-header">
              <h4>⏳ Waitlist ({waitlist.length})</h4>
            </div>
            <div className="participants-list">
              {waitlist.map((reg, idx) => (
                <div key={reg.id} className="participant-row">
                  <span className="participant-rank">#{idx + 1}</span>
                  <span className="participant-tag">{reg.player_tag}</span>
                  {reg.tiktok_username && <span className="participant-tiktok">🎵 @{reg.tiktok_username}</span>}
                  {adminKey && (
                    <div className="participant-actions">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handlePromoteWaitlist(reg.id)}
                        title="Promote from waitlist"
                      >
                        ⬆️ Promote
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {adminKey && !isEditing && (
          <div className="details-section admin-controls">
            <h4>🔧 Admin Controls</h4>
            <div className="admin-actions">
              <button className="btn btn-info" onClick={() => setIsEditing(true)}>
                ✏️ Edit Tournament
              </button>
              <div className="status-changer">
                <label>Quick Status:</label>
                <select
                  value={tournament.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusLoading}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-danger" onClick={handleDelete}>
                🗑️ Delete
              </button>
            </div>
          </div>
        )}

        {adminKey && isEditing && (
          <div className="modal-overlay" onClick={() => setIsEditing(false)}>
            <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>✏️ Edit Tournament</h3>
                <button className="modal-close" onClick={() => setIsEditing(false)}>✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="submit-form edit-form">
                {editSuccess && <div className="submit-success">{editSuccess}</div>}
                {editError && <div className="submit-error">{editError}</div>}
                <div className="form-grid">
                  <div className="form-field">
                    <label>Tournament Name *</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Tournament name"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Organizer *</label>
                    <input
                      type="text"
                      value={editForm.host_name || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, host_name: e.target.value }))}
                      placeholder="Organizer name"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={editForm.start_date || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>End Date & Time (optional)</label>
                    <input
                      type="datetime-local"
                      value={editForm.end_date || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Registration Deadline (optional)</label>
                    <input
                      type="datetime-local"
                      value={editForm.registration_deadline || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, registration_deadline: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Format</label>
                    <select
                      value={editForm.format || 'Normal Battle'}
                      onChange={(e) => setEditForm((p) => ({ ...p, format: e.target.value }))}
                    >
                      {TOURNAMENT_FORMATS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Max Players</label>
                    <input
                      type="number"
                      value={editForm.max_players || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, max_players: e.target.value }))}
                      placeholder="e.g. 50"
                      min="2"
                    />
                  </div>
                  <div className="form-field">
                    <label>Prize Pool</label>
                    <input
                      type="text"
                      value={editForm.prize || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, prize: e.target.value }))}
                      placeholder="e.g. 1000 Gems"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>TikTok Username</label>
                    <div className="tiktok-input-wrapper">
                      <span className="tiktok-at">@</span>
                      <input
                        type="text"
                        value={editForm.tiktok_username || ''}
                        onChange={(e) => setEditForm((p) => ({ ...p, tiktok_username: e.target.value.replace(/^@+/, '') }))}
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div className="form-field full-width">
                    <label>TikTok Live URL (optional)</label>
                    <input
                      type="url"
                      value={editForm.tiktok_live_url || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, tiktok_live_url: e.target.value }))}
                      placeholder="https://www.tiktok.com/@username/live"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Tournament Password (optional)</label>
                    <input
                      type="text"
                      value={editForm.tournament_password || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, tournament_password: e.target.value }))}
                      placeholder="Password to join"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Description</label>
                    <textarea
                      rows="3"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Short description..."
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Rules</label>
                    <textarea
                      rows="3"
                      value={editForm.rules || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, rules: e.target.value }))}
                      placeholder="Tournament rules..."
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn" disabled={editLoading}>
                    {editLoading ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <TournamentBracket tournament={tournament} adminKey={adminKey} />
      </div>
    </div>
  );
}

// ==================== ARCHIVE VIEW ====================

function ArchiveView({ onBack, onViewDetails }) {
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
    <div className="tournament-archive">
      <button className="back-btn" onClick={onBack}>← Back</button>
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
            <div key={t.id} className="archive-card" onClick={() => onViewDetails && onViewDetails(t)}>
              <div className="archive-header">
                <h4>{t.name}</h4>
                <span className="archive-date">{formatDateOnly(t.start_date)}</span>
              </div>
              <div className="archive-meta">
                <span>{t.format}</span>
                <span>{t.participant_count || 0} / {t.max_players || '∞'} players</span>
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
              {onViewDetails && <div className="archive-click-hint">Click to view details →</div>}
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
    </div>
  );
}

// ==================== HALL OF FAME ====================

function HallOfFameView({ onBack }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getHallOfFame(50);
      setStats(data.stats || []);
    } catch (err) {
      console.error('Failed to load hall of fame:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hall-of-fame">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="section-title">🏆 Hall of Fame</h2>
      <p className="section-desc">Top tournament performers</p>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading rankings...</p>
        </div>
      ) : stats.length > 0 ? (
        <>
          <div className="hof-header-row">
            <span className="hof-header-rank">Rank</span>
            <span className="hof-header-player">Player</span>
            <span className="hof-header-stat">Wins</span>
            <span className="hof-header-stat">Top 3</span>
            <span className="hof-header-stat">Joined</span>
          </div>
          <div className="hof-list">
            {stats.map((s, idx) => {
              const rank = idx + 1;
              const rankClass = rank === 1 ? 'hof-rank-1' : rank === 2 ? 'hof-rank-2' : rank === 3 ? 'hof-rank-3' : 'hof-rank-other';
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
              const showTag = s.player_name && s.player_name !== s.player_tag;
              return (
                <div key={s.id} className={`hof-card ${rank <= 3 ? 'hof-card-top' : ''}`}>
                  <div className={`hof-rank-badge ${rankClass}`}>
                    {medal || rank}
                  </div>
                  <div className="hof-player-info">
                    <span className="hof-player-name">{s.player_tag}</span>
                    {showTag && <span className="hof-player-tag">{s.player_name}</span>}
                  </div>
                  <div className="hof-stat hof-stat-wins">
                    <span className="hof-stat-value">{s.tournament_wins}</span>
                    <span className="hof-stat-label">Wins</span>
                  </div>
                  <div className="hof-stat hof-stat-top3">
                    <span className="hof-stat-value">{s.top_3_finishes}</span>
                    <span className="hof-stat-label">Top 3</span>
                  </div>
                  <div className="hof-stat hof-stat-part">
                    <span className="hof-stat-value">{s.total_participations}</span>
                    <span className="hof-stat-label">Joined</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-state-box">
          <div className="empty-icon">🏆</div>
          <h4>No rankings yet</h4>
          <p className="empty-helper">Complete tournaments to build the Hall of Fame!</p>
        </div>
      )}
    </div>
  );
}

// ==================== SUBMIT MODAL ====================

function SubmitModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    host_name: '',
    description: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    format: 'Normal Battle',
    max_players: '',
    prize: '',
    rules: '',
    tiktok_username: '',
    tiktok_live_url: '',
    tournament_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.host_name || !form.start_date) {
      alert('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await submitCommunityTournament(form);
      setSuccess('Tournament submitted for review! It will appear after admin approval.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      alert('Failed to submit tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Submit Tournament</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="submit-form">
          {success && <div className="submit-success">{success}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label>Tournament Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. RoyaleMY Weekly Cup"
                required
              />
            </div>
            <div className="form-field">
              <label>Organizer *</label>
              <input
                type="text"
                value={form.host_name}
                onChange={(e) => handleChange('host_name', e.target.value)}
                placeholder="Your name or organization"
                required
              />
            </div>
            <div className="form-field">
              <label>Start Date & Time *</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>End Date & Time (optional)</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Registration Deadline (optional)</label>
              <input
                type="datetime-local"
                value={form.registration_deadline}
                onChange={(e) => handleChange('registration_deadline', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Format</label>
              <select value={form.format} onChange={(e) => handleChange('format', e.target.value)}>
                {TOURNAMENT_FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Max Players</label>
              <input
                type="number"
                value={form.max_players}
                onChange={(e) => handleChange('max_players', e.target.value)}
                placeholder="e.g. 50"
                min="2"
              />
            </div>
            <div className="form-field">
              <label>Prize Pool</label>
              <input
                type="text"
                value={form.prize}
                onChange={(e) => handleChange('prize', e.target.value)}
                placeholder="e.g. 1000 Gems"
              />
            </div>
            <div className="form-field">
              <label>TikTok Username</label>
              <div className="tiktok-input-wrapper">
                <span className="tiktok-at">@</span>
                <input
                  type="text"
                  value={form.tiktok_username}
                  onChange={(e) => handleChange('tiktok_username', e.target.value.replace(/^@+/, ''))}
                  placeholder="username"
                />
              </div>
            </div>
            <div className="form-field">
              <label>TikTok Live URL (optional)</label>
              <input
                type="url"
                value={form.tiktok_live_url}
                onChange={(e) => handleChange('tiktok_live_url', e.target.value)}
                placeholder="https://www.tiktok.com/@username/live"
              />
            </div>
            <div className="form-field full-width">
              <label>Tournament Password (hidden until start)</label>
              <input
                type="text"
                value={form.tournament_password}
                onChange={(e) => handleChange('tournament_password', e.target.value)}
                placeholder="Password for joining the tournament in-game"
              />
            </div>
            <div className="form-field full-width">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Tournament description, requirements, etc."
                rows={3}
              />
            </div>
            <div className="form-field full-width">
              <label>Rules</label>
              <textarea
                value={form.rules}
                onChange={(e) => handleChange('rules', e.target.value)}
                placeholder="Tournament rules and regulations..."
                rows={3}
              />
            </div>
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==================== OFFICIAL TOURNAMENT DETAIL ====================

function OfficialTournamentDetail({ tournament, onBack }) {
  const formatTimeRemaining = (endTime) => {
    if (!endTime) return '-';
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 'Ended';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'inprogress': return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Active', dot: '🟢' };
      case 'upcoming': return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: 'Upcoming', dot: '🔵' };
      case 'ended': return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: 'Finished', dot: '⚪' };
      default: return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Unknown', dot: '🟡' };
    }
  };

  const status = getStatusConfig(tournament.status);

  return (
    <div className="tournament-details">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="details-card">
        <div className="details-hero official">
          <div className="details-status-badge" style={{ color: status.color, background: status.bg }}>
            {status.dot} {status.label}
          </div>
          <h2>{tournament.name}</h2>
          <p className="details-tag">🏷️ #{tournament.tag}</p>
        </div>

        <div className="details-stats">
          <div className="ds-item">
            <span className="ds-icon">👥</span>
            <span className="ds-value">{tournament.capacity}/{tournament.maxCapacity}</span>
            <span className="ds-label">Players</span>
          </div>
          <div className="ds-item">
            <span className="ds-icon">📅</span>
            <span className="ds-value">{formatDate(tournament.startTime)}</span>
            <span className="ds-label">Started</span>
          </div>
          <div className="ds-item">
            <span className="ds-icon">⏰</span>
            <span className="ds-value">{formatTimeRemaining(tournament.endTime)}</span>
            <span className="ds-label">Time Left</span>
          </div>
        </div>

        <div className="join-box">
          <h4>🎮 How to Join</h4>
          <div className="join-steps">
            <div className="join-step">
              <span className="join-step-num">1</span>
              <span>Open Clash Royale app</span>
            </div>
            <div className="join-step">
              <span className="join-step-num">2</span>
              <span>Go to Tournament tab</span>
            </div>
            <div className="join-step">
              <span className="join-step-num">3</span>
              <span>Search tag: <strong>#{tournament.tag}</strong></span>
            </div>
          </div>
          <button className="copy-btn" onClick={() => navigator.clipboard.writeText(tournament.tag)}>
            📋 Copy Tag
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== REGISTER MODAL ====================

function RegisterModal({ tournament, onClose, onSuccess }) {
  const [form, setForm] = useState({ player_tag: '', tiktok_username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState('');

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!form.player_tag) {
      setError('Player tag is required');
      return;
    }

    const cleanTag = validatePlayerTag(form.player_tag);
    if (!cleanTag) {
      setError('Invalid player tag. Must be 3-10 alphanumeric characters.');
      return;
    }

    setLoading(true);
    try {
      await registerForTournament(tournament.id, {
        player_tag: cleanTag,
        tiktok_username: form.tiktok_username,
      });
      setSubmittedData({
        player_tag: cleanTag,
        tiktok_username: form.tiktok_username,
      });
      setSuccess(true);
      setForm({ player_tag: '', tiktok_username: '' });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('Push notifications not supported on this browser.');
      return;
    }
    setPushLoading(true);
    setPushStatus('');

    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));

    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        timeout(5000)
      ]);

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const perm = await Promise.race([
          Notification.requestPermission(),
          timeout(3000)
        ]);
        if (perm === 'denied') {
          setPushStatus('❌ Notifications blocked. Please enable them in your browser settings and try again.');
          setPushLoading(false);
          return;
        }

        const { publicKey } = await Promise.race([
          getVapidPublicKey(),
          timeout(5000)
        ]);

        subscription = await Promise.race([
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }),
          timeout(10000)
        ]);
      }
      const subJSON = subscription.toJSON();
      await Promise.race([
        subscribeToPush(tournament.id, {
          endpoint: subJSON.endpoint,
          keys: subJSON.keys,
        }),
        timeout(5000)
      ]);
      setPushStatus('🔔 Notifications enabled! You\'ll get updates for this tournament.');
    } catch (err) {
      console.error('Push subscription failed:', err);
      const msg = err?.message || '';
      if (msg.includes('timed out')) {
        setPushStatus('⏱️ Request timed out. Please check your connection and try again.');
      } else if (msg.includes('not configured') || msg.includes('503')) {
        setPushStatus('🔕 Push notifications are not configured on the server yet.');
      } else if (msg.includes('denied') || msg.includes('permission')) {
        setPushStatus('❌ Permission denied. Enable notifications in your browser settings.');
      } else {
        setPushStatus('Could not enable notifications. You can try again later.');
      }
    } finally {
      setPushLoading(false);
    }
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content register-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{success ? '✅ Registration Confirmed' : `📝 Register for ${tournament.name}`}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {success && submittedData ? (
          <div className="register-form-body register-success-body">
            <div className="success-hero">
              <div className="success-icon">🏆</div>
              <h4>You're Registered!</h4>
            </div>

            <div className="success-details">
              <div className="sd-section">
                <span className="sd-label">Tournament</span>
                <span className="sd-value">{tournament.name}</span>
              </div>
              <div className="sd-section">
                <span className="sd-label">Player Tag</span>
                <span className="sd-value">#{submittedData.player_tag}</span>
              </div>
              <div className="sd-section">
                <span className="sd-label">Starts</span>
                <span className="sd-value">{formatDate(tournament.start_date)}</span>
              </div>
              {tournament.registration_deadline && (
                <div className="sd-section">
                  <span className="sd-label">Registration Deadline</span>
                  <span className="sd-value">{formatDate(tournament.registration_deadline)}</span>
                </div>
              )}
            </div>

            {tournament.tiktok_username && (
              <div className="success-tiktok">
                <p>📢 Stay updated! Follow the host on TikTok:</p>
                <a
                  href={`https://tiktok.com/@${tournament.tiktok_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tiktok-follow-btn"
                >
                  🎵 @{tournament.tiktok_username}
                </a>
              </div>
            )}

            <div className="success-next">
              <p className="next-title">What's Next?</p>
              <ul>
                <li>📅 Save the date — tournament starts soon!</li>
                <li>🏷️ Keep your player tag handy: <strong>#{submittedData.player_tag}</strong></li>
                <li>🔔 Enable notifications below to get live updates</li>
                {tournament.tournament_password && (
                  <li>🔐 Tournament password will be shared before it begins</li>
                )}
              </ul>
            </div>

            <div className="success-push">
              {pushStatus ? (
                <div className={`push-status ${pushStatus.includes('enabled') ? 'push-success' : 'push-info'}`}>
                  {pushStatus}
                </div>
              ) : (
                <button
                  className="push-enable-btn"
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                >
                  {pushLoading ? 'Enabling...' : '🔔 Enable Push Notifications'}
                </button>
              )}
            </div>

            <button className="submit-btn done-btn" onClick={onClose}>
              ✓ Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="submit-form register-form-body">
            {error && <div className="submit-error">{error}</div>}
            <div className="form-field">
              <label>Clash Royale Player Tag *</label>
              <input
                type="text"
                value={form.player_tag}
                onChange={(e) => handleChange('player_tag', e.target.value)}
                placeholder="e.g. #2P0JJQ0Y"
                required
              />
            </div>
            <div className="form-field">
              <label>TikTok Username (optional)</label>
              <div className="tiktok-input-wrapper">
                <span className="tiktok-at">@</span>
                <input
                  type="text"
                  value={form.tiktok_username}
                  onChange={(e) => handleChange('tiktok_username', e.target.value.replace(/^@+/, ''))}
                  placeholder="username"
                />
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Registering...' : '✓ Confirm Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

function CalendarView({ tournaments, onViewDetails, onRegister, adminKey }) {
  // Group tournaments by month
  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of tournaments) {
      const date = new Date(t.start_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tournaments]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="calendar-view">
      {grouped.map(([key, items]) => {
        const [year, month] = key.split('-');
        return (
          <div key={key} className="calendar-month">
            <h4 className="calendar-month-title">{monthNames[parseInt(month) - 1]} {year}</h4>
            <div className="calendar-grid">
              {items.map((t) => {
                const date = new Date(t.start_date);
                const day = date.getDate();
                const canRegister = t.status === 'approved' || t.status === 'registration_open';
                const isFull = t.max_players && (t.participant_count ?? 0) >= t.max_players;
                return (
                  <div key={t.id} className="calendar-cell" onClick={() => onViewDetails(t)}>
                    <div className="calendar-day">{day}</div>
                    <div className="calendar-cell-content">
                      <span className={`badge ${STATUS_BADGES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      <strong className="calendar-cell-name">{t.name}</strong>
                      <span className="calendar-cell-host">{t.host_name}</span>
                      {t.max_players && (
                        <span className="calendar-cell-count">
                          👥 {t.participant_count ?? 0} / {t.max_players} {isFull && '• Full'}
                        </span>
                      )}
                    </div>
                    {canRegister && !isFull && (
                      <button
                        className="btn btn-primary btn-sm calendar-register"
                        onClick={(e) => { e.stopPropagation(); onRegister(t); }}
                      >
                        Register
                      </button>
                    )}
                    {adminKey && (
                      <span className="calendar-edit" onClick={(e) => { e.stopPropagation(); onViewDetails(t); }}>✏️</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {grouped.length === 0 && (
        <div className="empty-state-box">
          <div className="empty-icon">📅</div>
          <h4>No upcoming tournaments</h4>
        </div>
      )}
      <style>{`
        .calendar-view { display: flex; flex-direction: column; gap: var(--spacing-lg); }
        .calendar-month-title { color: white; font-size: 1.1rem; margin-bottom: var(--spacing-md); }
        .calendar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--spacing-md); }
        .calendar-cell { background: var(--bg-secondary); border: 1px solid var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--spacing-md); cursor: pointer; transition: transform 0.15s; position: relative; }
        .calendar-cell:hover { transform: translateY(-2px); }
        .calendar-day { font-size: 1.5rem; font-weight: 700; color: var(--accent-primary); margin-bottom: var(--spacing-xs); }
        .calendar-cell-content { display: flex; flex-direction: column; gap: 4px; }
        .calendar-cell-name { color: white; font-size: 0.9375rem; }
        .calendar-cell-host { color: var(--text-secondary); font-size: 0.8125rem; }
        .calendar-cell-count { color: var(--text-muted); font-size: 0.8125rem; }
        .calendar-register { margin-top: var(--spacing-sm); width: 100%; }
        .calendar-edit { position: absolute; top: 8px; right: 8px; font-size: 0.875rem; opacity: 0.7; }
      `}</style>
    </div>
  );
}

function TournamentFinder() {
  const [communityTournaments, setCommunityTournaments] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedTournamentFull, setSelectedTournamentFull] = useState(null);
  const [view, setView] = useState('list'); // list, detail, archive, halloffame
  const [listViewMode, setListViewMode] = useState('list'); // list, calendar
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin');

  // Registration modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registeringTournament, setRegisteringTournament] = useState(null);

  // Official CR tournament search
  const [searchName, setSearchName] = useState('');
  const [officialTournaments, setOfficialTournaments] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Tag checker
  const [tagInput, setTagInput] = useState('');
  const [tagResult, setTagResult] = useState(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState('');
  const [selectedOfficialTournament, setSelectedOfficialTournament] = useState(null);

  useEffect(() => {
    loadCommunityTournaments();
  }, []);

  // Deep-link: auto-open tournament from ?tournament=ID
  useEffect(() => {
    const tournamentId = searchParams.get('tournament');
    if (!tournamentId || communityTournaments.length === 0) return;
    const id = parseInt(tournamentId);
    const tournament = communityTournaments.find(t => t.id === id);
    if (tournament && view === 'list') {
      viewTournamentDetails(tournament);
      // Clean the URL so refresh doesn't re-open
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [communityTournaments, searchParams, view]);

  const loadCommunityTournaments = async () => {
    setLoadingCommunity(true);
    try {
      const data = await getCommunityTournaments();
      setCommunityTournaments(data.tournaments || []);
    } catch (err) {
      console.error('Failed to load community tournaments:', err);
      setCommunityTournaments([]);
    } finally {
      setLoadingCommunity(false);
    }
  };

  const viewTournamentDetails = async (tournament) => {
    setSelectedTournament(tournament);
    try {
      const data = await getCommunityTournament(tournament.id);
      setSelectedTournamentFull(data);
      setView('detail');
    } catch (err) {
      console.error('Failed to load tournament details:', err);
      setSelectedTournamentFull({ tournament, registrations: [], participantCount: 0, notifications: [] });
      setView('detail');
    }
  };

  const openRegisterModal = (tournament) => {
    setRegisteringTournament(tournament);
    setRegisterModalOpen(true);
  };

  const handleBack = () => {
    setView('list');
    setSelectedTournament(null);
    setSelectedTournamentFull(null);
    setSelectedOfficialTournament(null);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchName.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const data = await searchTournaments(searchName);
      setOfficialTournaments(data.items || []);
    } catch (err) {
      setSearchError('Failed to search tournaments.');
      setOfficialTournaments([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTagCheck = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    setTagLoading(true);
    setTagError('');
    setTagResult(null);
    try {
      const data = await getTournament(tagInput.trim());
      setTagResult(data);
    } catch (err) {
      setTagError('Tournament not found.');
    } finally {
      setTagLoading(false);
    }
  };

  const viewOfficialDetails = (tournament) => {
    setSelectedOfficialTournament(tournament);
    setView('official-detail');
  };

  // Separate active/upcoming from live
  const liveTournaments = useMemo(() => communityTournaments.filter((t) => t.status === 'live'), [communityTournaments]);
  const upcomingTournaments = useMemo(() => communityTournaments.filter((t) => t.status !== 'live'), [communityTournaments]);

  if (view === 'detail' && selectedTournament) {
    const t = selectedTournamentFull?.tournament || selectedTournament;
    return (
      <div className="tournament-finder">
        <TournamentDetail
          tournament={t}
          onBack={handleBack}
          onRefresh={loadCommunityTournaments}
          adminKey={adminKey}
          notifications={selectedTournamentFull?.notifications || []}
        />

      </div>
    );
  }

  if (view === 'official-detail' && selectedOfficialTournament) {
    return (
      <div className="tournament-finder">
        <OfficialTournamentDetail tournament={selectedOfficialTournament} onBack={handleBack} />

      </div>
    );
  }

  if (view === 'archive') {
    return (
      <div className="tournament-finder">
        <ArchiveView onBack={handleBack} onViewDetails={viewTournamentDetails} />

      </div>
    );
  }

  if (view === 'halloffame') {
    return (
      <div className="tournament-finder">
        <HallOfFameView onBack={handleBack} />

      </div>
    );
  }

  return (
    <div className="tournament-finder">
      {/* Header */}
      <div className="finder-header">
        <h2 className="section-title">🏆 Community Tournaments</h2>
        <p className="section-desc">Discover, register, and compete in community tournaments</p>
        <div className="finder-actions">
          <button className="submit-tournament-btn" onClick={() => setShowSubmitModal(true)}>
            ➕ Submit Tournament
          </button>
          <button className="archive-btn" onClick={() => setView('archive')}>
            🏛️ Archive
          </button>
          <button className="hof-btn" onClick={() => setView('halloffame')}>
            🏆 Hall of Fame
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setListViewMode(listViewMode === 'list' ? 'calendar' : 'list')}
          >
            {listViewMode === 'list' ? '📅 Calendar' : '📋 List'}
          </button>
        </div>
      </div>

      {/* Live Tournaments */}
      {liveTournaments.length > 0 && (
        <section className="live-section">
          <h3>🔴 Live Now</h3>
          <div className="live-tournament-list">
            {liveTournaments.map((t) => {
              const liveParticipantCount = t.participant_count ?? 0;
              return (
                <div key={t.id} className="live-tournament-card">
                  <div className="live-indicator">
                    <span className="live-pulse"></span>
                    <span>LIVE</span>
                  </div>
                  <h4>{t.name}</h4>
                  <p className="live-host">by {t.host_name}</p>
                  <div className="live-meta">
                    <span>👥 {liveParticipantCount}{t.max_players ? ` / ${t.max_players}` : ''} players</span>
                    {t.prize && <span>🏆 {t.prize}</span>}
                  </div>
                  <div className="card-actions">
                    {t.tiktok_live_url && (
                      <a
                        href={t.tiktok_live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card-action-btn watch-btn"
                      >
                        🎵 Watch Live
                      </a>
                    )}
                    {adminKey && (
                      <button className="card-action-btn edit-btn-sm" onClick={() => viewTournamentDetails(t)}>
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Tournaments */}
      <section className="community-section">
        <div className="section-header">
          <div>
            <h3>📅 Upcoming Tournaments</h3>
            <p className="section-subtitle">Register early and mark your calendar</p>
          </div>
        </div>

        {loadingCommunity ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading tournaments...</p>
          </div>
        ) : upcomingTournaments.length > 0 ? (
          listViewMode === 'calendar' ? (
            <CalendarView
              tournaments={upcomingTournaments}
              onViewDetails={viewTournamentDetails}
              onRegister={openRegisterModal}
              adminKey={adminKey}
            />
          ) : (
          <div className="community-tournament-list">
            {upcomingTournaments.map((t) => {
              const canRegister = t.status === 'approved' || t.status === 'registration_open';
              const participantCount = t.participant_count ?? 0;
              const isFull = t.max_players && participantCount >= t.max_players;
              const fillRatio = t.max_players ? participantCount / t.max_players : 0;
              const almostFull = t.max_players && fillRatio >= 0.8 && !isFull;
              return (
                <div key={t.id} className="community-tournament-card">
                  <div className="ct-card-header">
                    <TournamentStatusBadge status={t.status} />
                    <CountdownTimer targetDate={t.start_date} />
                  </div>
                  <h4 className="ct-name">{t.name}</h4>
                  <p className="ct-host">Organized by {t.host_name}</p>
                  {t.description && <p className="ct-desc">{t.description}</p>}
                  <div className="ct-meta">
                    <span>📅 {formatDate(t.start_date)}</span>
                    <span>🎮 {t.format || 'Normal Battle'}</span>
                    {t.max_players ? (
                      <span className={isFull ? 'participants-full' : almostFull ? 'participants-almost' : ''}>
                        👥 {participantCount} / {t.max_players}
                        {isFull && ' (Full)'}
                        {almostFull && ' (Almost Full!)'}
                      </span>
                    ) : (
                      <span>👥 {participantCount} registered</span>
                    )}
                    {t.prize && <span>🏆 {t.prize}</span>}
                    {t.registration_deadline && <span>⏰ Deadline: {formatDate(t.registration_deadline)}</span>}
                  </div>
                  {t.tiktok_username && (
                    <div className="ct-tiktok">
                      🎵 @{t.tiktok_username}
                    </div>
                  )}
                  <div className="card-actions">
                    {canRegister && !isFull && (
                      <button className="card-action-btn register-action-btn" onClick={() => openRegisterModal(t)}>
                        ✍️ Register Now
                      </button>
                    )}
                    {isFull && (
                      <span className="card-full-badge">🔒 Full</span>
                    )}
                    {adminKey && (
                      <button className="card-action-btn edit-btn-sm" onClick={() => viewTournamentDetails(t)}>
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )
        ) : (
          <div className="empty-state-box">
            <div className="empty-icon">🏆</div>
            <h4>No upcoming tournaments</h4>
            <p className="empty-helper">Be the first to submit a tournament!</p>
          </div>
        )}
      </section>

      {/* Official Tournament Search */}
      <section className="tag-checker-section">
        <h3>🔎 Find Official Tournaments</h3>
        <p className="section-subtitle">Search for official Clash Royale tournaments</p>

        <form onSubmit={handleSearch} className="tag-form">
          <div className="tag-input-wrapper">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search tournament name..."
              className="tag-input"
              style={{ paddingLeft: 'var(--spacing-md)' }}
            />
            <button type="submit" className="tag-submit-btn" disabled={searchLoading || !searchName.trim()}>
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {searchError && (
          <div className="tag-error">
            <span>❌</span> {searchError}
          </div>
        )}

        {officialTournaments.length > 0 && (
          <div className="search-results">
            <h4>Search Results</h4>
            <div className="tournament-list">
              {officialTournaments.map((tournament) => (
                <div key={tournament.tag} className="tournament-card" onClick={() => viewOfficialDetails(tournament)}>
                  <div className="tc-header">
                    <span className="tc-status" style={{ color: getStatusConfig(tournament.status).color }}>
                      {getStatusConfig(tournament.status).dot} {getStatusConfig(tournament.status).label}
                    </span>
                  </div>
                  <h4>{tournament.name}</h4>
                  <p>#{tournament.tag}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleTagCheck} className="tag-form" style={{ marginTop: 'var(--spacing-lg)' }}>
          <div className="tag-input-wrapper">
            <span className="tag-prefix">#</span>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.replace('#', ''))}
              placeholder="Enter tournament tag"
              className="tag-input"
            />
            <button type="submit" className="tag-submit-btn" disabled={tagLoading || !tagInput.trim()}>
              {tagLoading ? 'Checking...' : 'Check Tag'}
            </button>
          </div>
        </form>

        {tagError && (
          <div className="tag-error">
            <span>❌</span> {tagError}
          </div>
        )}

        {tagResult && (
          <div className="tag-result" onClick={() => viewOfficialDetails(tagResult)}>
            <div className="tr-header">
              <span className="tr-status" style={{ color: getStatusConfig(tagResult.status).color }}>
                {getStatusConfig(tagResult.status).dot} {getStatusConfig(tagResult.status).label}
              </span>
            </div>
            <h4>{tagResult.name}</h4>
            <p>👥 {tagResult.capacity}/{tagResult.maxCapacity} players</p>
            <span className="tr-click">Click to view details →</span>
          </div>
        )}
      </section>

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitModal
          onClose={() => setShowSubmitModal(false)}
          onSuccess={loadCommunityTournaments}
        />
      )}

      {registerModalOpen && registeringTournament && (
        <RegisterModal
          tournament={registeringTournament}
          onClose={() => {
            setRegisterModalOpen(false);
            setRegisteringTournament(null);
          }}
          onSuccess={loadCommunityTournaments}
        />
      )}



      <style>{`
        .tournament-finder {
          max-width: 900px;
          margin: 0 auto;
          padding-bottom: var(--spacing-xl);
        }

        .finder-header {
          text-align: center;
          padding: var(--spacing-xl) 0;
        }

        .section-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .section-desc {
          color: var(--text-secondary);
          margin-bottom: var(--spacing-md);
        }

        .finder-actions {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: center;
          flex-wrap: wrap;
        }

        .submit-tournament-btn,
        .archive-btn,
        .hof-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: white;
        }

        .submit-tournament-btn {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }

        .archive-btn {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }

        .hof-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        .submit-tournament-btn:hover,
        .archive-btn:hover,
        .hof-btn:hover {
          filter: brightness(1.1);
        }

        section {
          margin-bottom: var(--spacing-xl);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        section h3 {
          font-size: 1.25rem;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .section-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto var(--spacing-md);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .empty-state-box {
          text-align: center;
          padding: var(--spacing-xl);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 2px dashed var(--bg-tertiary);
        }

        .empty-state-box .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        .empty-state-box h4 {
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .empty-helper {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        /* Live Section */
        .live-section h3 {
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .live-tournament-list {
          display: grid;
          gap: var(--spacing-md);
        }

        .live-tournament-card {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), var(--bg-secondary));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          transition: all 0.2s;
        }

        .live-tournament-card:hover {
          border-color: #ef4444;
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(239, 68, 68, 0.15);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
          font-weight: 700;
          color: #ef4444;
        }

        .live-pulse {
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .live-tournament-card h4 {
          margin: 0 0 var(--spacing-xs);
          color: var(--text-primary);
          font-size: 1.2rem;
        }

        .live-host {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0 0 var(--spacing-sm);
        }

        .live-link {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: #000;
          color: white;
          text-decoration: none;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          margin-right: var(--spacing-sm);
        }

        .live-prize {
          font-size: 0.8125rem;
          color: #f59e0b;
          font-weight: 600;
        }

        /* Community Tournament Cards */
        .community-tournament-list {
          display: grid;
          gap: var(--spacing-md);
        }

        .community-tournament-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
        }

        .community-tournament-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .ct-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .badge-success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .badge-info {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .badge-secondary {
          background: rgba(107, 114, 128, 0.15);
          color: #6b7280;
        }

        .badge-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .badge-live {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .countdown-timer {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }

        .countdown-timer.expired {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
        }

        .ct-name {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
        }

        .ct-host {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-sm);
        }

        .ct-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-sm);
          line-height: 1.5;
        }

        .ct-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .ct-meta span {
          font-size: 0.8125rem;
          color: var(--text-muted);
          background: var(--bg-primary);
          padding: 4px 10px;
          border-radius: var(--radius-md);
        }

        .ct-tiktok {
          font-size: 0.8125rem;
          color: #ff0050;
          font-weight: 600;
          margin-top: var(--spacing-xs);
        }

        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--bg-tertiary);
        }

        .card-action-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .register-action-btn {
          background: linear-gradient(135deg, var(--accent-primary), #2563eb);
          color: white;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
          flex: 1;
          justify-content: center;
        }

        .register-action-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
        }

        .edit-btn-sm {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .edit-btn-sm:hover {
          background: var(--text-muted);
          color: white;
        }

        .watch-btn {
          background: #000;
          color: white;
        }

        .watch-btn:hover {
          background: #333;
          transform: translateY(-1px);
        }

        .register-modal {
          max-width: 480px;
        }

        .register-form-body {
          padding: var(--spacing-xl);
        }

        .register-form-body .form-field {
          margin-bottom: var(--spacing-md);
        }

        .register-form-body .form-field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .register-form-body .form-field input {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.9375rem;
          outline: none;
          transition: all 0.2s;
        }

        .register-form-body .form-field input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Details View */
        .tournament-details {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .back-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          color: var(--text-primary);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          margin-bottom: var(--spacing-lg);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: var(--bg-tertiary);
          transform: translateX(-2px);
        }

        .details-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 1px solid var(--bg-tertiary);
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
          transition: box-shadow 0.3s ease;
        }

        .details-hero {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05));
          padding: var(--spacing-xl);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .details-hero.official {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(59, 130, 246, 0.05));
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        .details-countdown {
          font-size: 0.9rem !important;
        }

        .details-hero h2 {
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
          font-size: 1.75rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .details-organizer {
          color: var(--text-secondary);
          font-size: 1rem;
          margin: 0;
        }

        .details-organizer strong {
          color: var(--text-primary);
        }

        .details-status-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 700;
          margin-bottom: var(--spacing-md);
        }

        .details-tag {
          color: var(--text-muted);
          font-size: 0.9375rem;
          margin: var(--spacing-xs) 0 0;
          font-family: monospace;
        }

        .tiktok-banner {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          background: linear-gradient(135deg, rgba(255, 0, 80, 0.1), var(--bg-secondary));
          border: 1px solid rgba(255, 0, 80, 0.2);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          margin: var(--spacing-lg);
          text-decoration: none;
          transition: all 0.2s;
        }

        .tiktok-banner:hover {
          border-color: rgba(255, 0, 80, 0.4);
          transform: translateX(4px);
        }

        .tiktok-icon {
          font-size: 1.5rem;
        }

        .tiktok-arrow {
          margin-left: auto;
          color: #ff0050;
          font-size: 1.25rem;
          font-weight: 700;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .tiktok-banner:hover .tiktok-arrow {
          opacity: 1;
        }

        .tiktok-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
        }

        .tiktok-user {
          font-size: 1rem;
          font-weight: 700;
          color: #ff0050;
          margin: 0;
        }

        .live-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          text-decoration: none;
          font-weight: 700;
          margin: var(--spacing-lg);
          transition: all 0.2s;
        }

        .live-banner:hover {
          filter: brightness(1.1);
          transform: scale(1.01);
        }

        .live-dot {
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        .details-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
        }

        .ds-item {
          background: var(--bg-primary);
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          text-align: center;
          border: 1px solid var(--bg-tertiary);
          transition: transform 0.15s, border-color 0.2s;
        }

        .ds-item:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.06);
        }

        .ds-icon {
          display: block;
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .ds-value {
          display: block;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: 2px;
        }

        .ds-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .ds-item.prize .ds-value {
          color: #fbbf24;
        }

        .details-section {
          padding: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .details-section h4 {
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 700;
        }

        .details-box {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .rules-text {
          white-space: pre-wrap;
        }

        .winners-section {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), var(--bg-primary));
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .winners-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .winner-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          transition: transform 0.15s;
        }

        .winner-card:hover {
          transform: translateY(-3px);
        }

        .winner-card.first {
          border: 1px solid rgba(245, 158, 11, 0.3);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), var(--bg-secondary));
        }

        .winner-card.second {
          border: 1px solid rgba(156, 163, 175, 0.3);
          background: linear-gradient(135deg, rgba(156, 163, 175, 0.08), var(--bg-secondary));
        }

        .winner-card.third {
          border: 1px solid rgba(234, 88, 12, 0.3);
          background: linear-gradient(135deg, rgba(234, 88, 12, 0.08), var(--bg-secondary));
        }

        .winner-medal {
          font-size: 1.75rem;
          margin-bottom: var(--spacing-xs);
        }

        .winner-title {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }

        .winner-tag {
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .prize-status {
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .ps-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          margin-left: var(--spacing-xs);
        }

        .ps-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .ps-contacted { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .ps-paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

        .registration-area {
          padding: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .registration-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), var(--bg-primary));
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          text-align: center;
          transition: all 0.2s;
        }

        .registration-card:hover {
          border-color: rgba(59, 130, 246, 0.35);
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.12);
          transform: translateY(-2px);
        }

        .registration-card.active {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          text-align: left;
        }

        .registration-card.active:hover {
          transform: none;
          box-shadow: none;
          border-color: var(--bg-tertiary);
        }

        .rc-icon {
          font-size: 2.5rem;
          margin-bottom: var(--spacing-sm);
        }

        .registration-card h4 {
          margin: 0 0 var(--spacing-xs);
          color: var(--text-primary);
          font-size: 1.15rem;
        }

        .registration-card p {
          margin: 0 0 var(--spacing-md);
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }

        .rc-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
        }

        .rc-header-icon {
          font-size: 1.25rem;
        }

        .rc-header h4 {
          margin: 0;
          font-size: 1.125rem;
        }

        .register-btn {
          width: 100%;
          padding: var(--spacing-md) var(--spacing-lg);
          background: linear-gradient(135deg, var(--accent-primary), #2563eb);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
        }

        .register-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
        }

        .register-btn:disabled {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          opacity: 0.7;
          cursor: not-allowed;
          box-shadow: none;
        }

        .tiktok-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .tiktok-input-wrapper input {
          flex: 1;
          background: transparent;
          border: none;
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--text-primary);
          font-size: 0.9375rem;
          outline: none;
        }

        .tiktok-at {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-tertiary);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.9375rem;
        }

        .form-actions {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
        }

        .submit-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
          font-weight: 600;
        }

        .participants-section {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg) !important;
          margin: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .participants-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .participants-header h4 {
          margin: 0;
        }

        .participants-toggle {
          color: var(--text-muted);
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .participants-header:hover .participants-toggle {
          color: var(--text-primary);
        }

        .participants-header-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .participants-list {
          margin-top: var(--spacing-sm);
        }

        .participant-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: 10px var(--spacing-sm);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          transition: background 0.15s;
        }

        .participant-row:hover {
          background: var(--bg-secondary);
        }

        .participant-rank {
          color: var(--text-muted);
          font-weight: 700;
          min-width: 36px;
          text-align: center;
          background: var(--bg-secondary);
          padding: 2px 6px;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
        }

        .participant-name {
          color: var(--text-primary);
          font-weight: 600;
          flex: 1;
        }

        .participant-tag {
          color: var(--text-secondary);
          font-family: monospace;
          font-size: 0.8125rem;
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-md);
        }

        .participant-tiktok {
          color: #ff0050;
          font-size: 0.8125rem;
          font-weight: 600;
          background: rgba(255, 0, 80, 0.08);
          padding: 3px 10px;
          border-radius: var(--radius-md);
        }

        .participant-actions {
          display: flex;
          gap: 4px;
          margin-left: auto;
        }

        .participant-actions .btn {
          padding: 4px 8px;
          font-size: 0.75rem;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }

        .participant-actions .btn-info {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .participant-actions .btn-info:hover {
          background: var(--accent-primary);
          color: white;
        }

        .participant-actions .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .participant-actions .btn-danger:hover {
          background: #ef4444;
          color: white;
        }

        .participant-actions .btn-success {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .participant-actions .btn-success:hover {
          background: #22c55e;
          color: white;
        }

        .participant-actions .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }

        .participant-edit-input {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          padding: 4px 8px;
          font-size: 0.8125rem;
          outline: none;
        }

        .participant-edit-input:focus {
          border-color: var(--accent-primary);
        }

        .participant-edit-input.tag-input {
          width: 80px;
          font-family: monospace;
        }

        .participant-edit-input.tiktok-input {
          width: 100px;
        }

        .live-meta {
          display: flex;
          gap: var(--spacing-sm);
          margin: var(--spacing-xs) 0;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .join-box {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), var(--bg-primary));
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          margin: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .join-box h4 {
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
          font-size: 1.1rem;
        }

        .join-steps {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
        }

        .join-step {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }

        .join-step-num {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-primary);
          color: white;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 800;
          flex-shrink: 0;
        }

        .copy-btn {
          width: 100%;
          padding: var(--spacing-md);
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .archive-click-hint {
          text-align: center;
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 1px dashed var(--bg-tertiary);
        }

        .archive-card {
          cursor: pointer;
        }

        /* Admin Controls */
        .admin-controls {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), var(--bg-primary));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .admin-controls h4 {
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
          font-size: 1rem;
        }

        .admin-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .status-changer {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          flex: 1;
          min-width: 200px;
        }

        .status-changer label {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          font-weight: 600;
          white-space: nowrap;
        }

        .status-changer select {
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          outline: none;
        }

        .btn-info {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .btn-info:hover {
          filter: brightness(1.1);
        }

        /* Tag Input */
        .tag-checker-section {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          margin-top: var(--spacing-xl);
        }

        .tag-checker-section h3 {
          margin: 0 0 var(--spacing-xs);
          font-size: 1.125rem;
          color: var(--text-primary);
        }

        .tag-checker-section .section-subtitle {
          margin: 0 0 var(--spacing-lg);
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .tag-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .tag-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xs);
          gap: var(--spacing-xs);
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .tag-input-wrapper:focus-within {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .tag-prefix {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .tag-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.9375rem;
          outline: none;
          padding: var(--spacing-sm) var(--spacing-xs);
          min-width: 0;
        }

        .tag-input::placeholder {
          color: var(--text-muted);
        }

        .tag-submit-btn {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: linear-gradient(135deg, var(--accent-primary), #2563eb);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: filter 0.2s, transform 0.1s;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .tag-submit-btn:hover:not(:disabled) {
          filter: brightness(1.15);
        }

        .tag-submit-btn:active:not(:disabled) {
          transform: scale(0.97);
        }

        .tag-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tag-error {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          color: #ef4444;
          font-size: 0.875rem;
          font-weight: 500;
          margin-top: var(--spacing-sm);
        }

        .tag-result {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin-top: var(--spacing-md);
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
        }

        .tag-result:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          border-color: var(--accent-primary);
        }

        /* Archive */
        .tournament-archive {
          animation: fadeIn 0.3s ease;
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

        /* Hall of Fame */
        .hall-of-fame {
          animation: fadeIn 0.3s ease;
        }

        .hof-header-row {
          display: grid;
          grid-template-columns: 56px 1fr 56px 56px 56px;
          align-items: center;
          gap: var(--spacing-md);
          padding: 8px var(--spacing-lg);
          margin-bottom: 8px;
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .hof-header-rank { text-align: center; }
        .hof-header-player { padding-left: 4px; }
        .hof-header-stat { text-align: center; }

        .hof-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .hof-card {
          display: grid;
          grid-template-columns: 56px 1fr 56px 56px 56px;
          align-items: center;
          gap: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md) var(--spacing-lg);
          transition: transform 0.15s, box-shadow 0.2s, border-color 0.2s;
        }

        .hof-card-top {
          border-color: rgba(255, 215, 0, 0.25);
          background: linear-gradient(90deg, rgba(255,215,0,0.06) 0%, var(--bg-secondary) 100%);
        }

        .hof-card:hover {
          transform: translateX(4px);
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }

        .hof-rank-badge {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 800;
          font-size: 1rem;
          flex-shrink: 0;
          margin: 0 auto;
        }

        .hof-rank-1 {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1a1a1a;
          box-shadow: 0 0 16px rgba(251, 191, 36, 0.45);
          font-size: 1.25rem;
        }

        .hof-rank-2 {
          background: linear-gradient(135deg, #e5e7eb, #9ca3af);
          color: #1a1a1a;
          font-size: 1.25rem;
        }

        .hof-rank-3 {
          background: linear-gradient(135deg, #fdba74, #ea580c);
          color: #1a1a1a;
          font-size: 1.25rem;
        }

        .hof-rank-other {
          background: var(--bg-primary);
          color: var(--text-muted);
          border: 1px solid var(--bg-tertiary);
          font-size: 0.875rem;
        }

        .hof-player-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .hof-player-name {
          font-weight: 700;
          font-size: 1.0625rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: monospace;
          letter-spacing: 0.02em;
        }

        .hof-player-tag {
          font-family: inherit;
          color: var(--text-secondary);
          font-size: 0.8125rem;
        }

        .hof-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 56px;
        }

        .hof-stat-value {
          font-weight: 800;
          font-size: 1.125rem;
        }

        .hof-stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .hof-stat-wins .hof-stat-value {
          color: #fbbf24;
        }

        .hof-stat-top3 .hof-stat-value {
          color: #60a5fa;
        }

        .hof-stat-part .hof-stat-value {
          color: var(--text-secondary);
        }

        @media (max-width: 640px) {
          .hof-card {
            grid-template-columns: auto 1fr auto auto auto;
            gap: var(--spacing-sm);
            padding: var(--spacing-sm) var(--spacing-md);
          }

          .hof-rank-badge {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }

          .hof-stat {
            min-width: 44px;
          }

          .hof-stat-value {
            font-size: 0.875rem;
          }

          .hof-stat-label {
            font-size: 0.625rem;
          }
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: var(--spacing-md);
          backdrop-filter: blur(8px);
        }

        .modal-content {
          background: linear-gradient(180deg, var(--bg-secondary), rgba(30, 30, 40, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .edit-modal {
          max-width: 640px;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-xl);
          border-bottom: 1px solid var(--bg-tertiary);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), transparent);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.35rem;
          color: var(--text-primary);
          font-weight: 800;
        }

        .modal-close {
          background: var(--bg-tertiary);
          border: 1px solid var(--bg-tertiary);
          color: var(--text-muted);
          font-size: 1rem;
          cursor: pointer;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .submit-form {
          padding: var(--spacing-lg);
        }

        .edit-form {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
          border-radius: 0 0 var(--radius-xl) var(--radius-xl);
        }

        .edit-form .form-field label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-muted);
        }

        .edit-form .form-field input,
        .edit-form .form-field select,
        .edit-form .form-field textarea {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          transition: all 0.2s;
        }

        .edit-form .form-field input:focus,
        .edit-form .form-field select:focus,
        .edit-form .form-field textarea:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .submit-success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
          font-weight: 600;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .form-field.full-width {
          grid-column: 1 / -1;
        }

        .form-field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.9375rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          border-color: var(--accent-primary);
        }

        .form-field input::placeholder,
        .form-field textarea::placeholder {
          color: var(--text-muted);
        }

        .form-field textarea {
          resize: vertical;
          font-family: inherit;
        }

        .submit-btn {
          width: 100%;
          padding: var(--spacing-md);
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Admin Panel */
        .tournament-admin {
          margin-top: var(--spacing-xl);
          padding-top: var(--spacing-xl);
          border-top: 2px solid var(--bg-tertiary);
        }

        .tournament-admin-title {
          font-size: 1.25rem;
          margin-bottom: var(--spacing-lg);
          color: var(--text-primary);
        }

        .tournament-admin-section {
          margin-bottom: var(--spacing-lg);
        }

        .tournament-admin-section h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-md);
        }

        .tournament-admin-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .tournament-admin-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
        }

        .tournament-admin-info {
          cursor: pointer;
          flex: 1;
          min-width: 0;
        }

        .tournament-admin-name {
          transition: color 0.2s;
        }

        .tournament-admin-info:hover .tournament-admin-name {
          color: var(--accent-primary);
        }

        .tournament-admin-actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-shrink: 0;
          align-items: center;
        }

        .btn {
          padding: var(--spacing-xs) var(--spacing-sm);
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-success {
          background: #22c55e;
          color: white;
        }

        .btn-success:hover {
          background: #16a34a;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .btn-secondary:hover {
          background: var(--text-muted);
          color: white;
        }

        .alert-success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .section-header {
            flex-direction: column;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .details-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .tournament-admin-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .tournament-admin-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .tournament-admin-actions .btn,
          .tournament-admin-actions select {
            flex: 1;
          }

          .winners-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Registration Success Screen */
        .register-success-body {
          padding: var(--spacing-xl);
          text-align: center;
        }

        .success-hero {
          margin-bottom: var(--spacing-lg);
        }

        .success-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-sm);
          animation: bounceIn 0.5s ease;
        }

        @keyframes bounceIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .success-hero h4 {
          font-size: 1.25rem;
          color: var(--accent-primary);
          margin: 0;
        }

        .success-details {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
          text-align: left;
        }

        .sd-section {
          margin-bottom: var(--spacing-sm);
        }

        .sd-section:last-child {
          margin-bottom: 0;
        }

        .sd-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }

        .sd-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }

        .sd-value {
          display: block;
          font-size: 0.9375rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .success-tiktok {
          margin-bottom: var(--spacing-lg);
        }

        .success-tiktok p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .tiktok-follow-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          background: linear-gradient(135deg, #ff0050, #00f2ea);
          color: white;
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-lg);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .tiktok-follow-btn:hover {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }

        .success-next {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
          text-align: left;
        }

        .next-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .success-next ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .success-next li {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          padding: var(--spacing-xs) 0;
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .success-next li:last-child {
          border-bottom: none;
        }

        .success-push {
          margin-bottom: var(--spacing-lg);
        }

        .push-enable-btn {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .push-enable-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .push-enable-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .push-status {
          font-size: 0.8125rem;
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
        }

        .push-success {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .push-info {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .done-btn {
          width: 100%;
        }

        /* Participant count urgency */
        .participants-full {
          color: #ef4444 !important;
          font-weight: 700;
        }

        .participants-almost {
          color: #f59e0b !important;
          font-weight: 700;
        }

        .card-full-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          background: var(--bg-tertiary);
          color: var(--text-muted);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
        }

        /* In-site Notifications */
        .notifications-section {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), var(--bg-primary));
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
        }

        .notifications-section h4 {
          margin-bottom: var(--spacing-md);
          font-size: 1rem;
          color: var(--text-primary);
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border-left: 3px solid var(--accent-primary);
        }

        .notification-item.notification-status_change {
          border-left-color: #8b5cf6;
        }

        .notification-item.notification-updated {
          border-left-color: #f59e0b;
        }

        .notification-item.notification-registration {
          border-left-color: #22c55e;
        }

        .notification-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-primary);
          margin-top: 6px;
          flex-shrink: 0;
        }

        .notification-status_change .notification-dot {
          background: #8b5cf6;
        }

        .notification-updated .notification-dot {
          background: #f59e0b;
        }

        .notification-registration .notification-dot {
          background: #22c55e;
        }

        .notification-content {
          flex: 1;
        }

        .notification-message {
          font-size: 0.875rem;
          color: var(--text-primary);
          margin: 0 0 2px 0;
          line-height: 1.4;
        }

        .notification-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

export default memo(TournamentFinder);
