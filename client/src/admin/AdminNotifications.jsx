import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getAdminNotifications,
  createAdminNotification,
  deleteAdminNotification,
  sendAdminNotificationPush
} from '../services/api';

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Site-wide', icon: '🌐' },
  { value: 'tournament', label: 'Tournament', icon: '🏆' },
  { value: 'clan', label: 'Clan', icon: '🛡️' },
  { value: 'deck', label: 'Deck', icon: '🃏' },
  { value: 'roadmap', label: 'Roadmap', icon: '🗺️' },
];

const TYPE_OPTIONS = [
  'announcement',
  'status_change',
  'updated',
  'registration',
  'winner',
  'reminder',
];

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function AdminNotifications() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin') || '';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    scope: 'global',
    type: 'announcement',
    title: '',
    message: '',
    link: '',
    tournament_id: '',
    resource_id: '',
    send_push: true,
  });

  const fetchNotifications = useCallback(async () => {
    if (!adminKey) return;
    try {
      setLoading(true);
      const data = await getAdminNotifications(adminKey, {
        scope: scopeFilter,
        search: search || undefined,
        limit: 50
      });
      setNotifications(data.notifications || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey, scopeFilter, search]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setMessage('');
      const payload = {
        scope: form.scope,
        type: form.type,
        title: form.title || undefined,
        message: form.message,
        link: form.link || undefined,
        tournament_id: form.tournament_id ? parseInt(form.tournament_id) : undefined,
        resource_id: form.resource_id ? parseInt(form.resource_id) : undefined,
        send_push: form.send_push,
      };
      await createAdminNotification(adminKey, payload);
      setMessage('Notification created');
      setForm({
        scope: 'global',
        type: 'announcement',
        title: '',
        message: '',
        link: '',
        tournament_id: '',
        resource_id: '',
        send_push: true,
      });
      fetchNotifications();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await deleteAdminNotification(id, adminKey);
      setMessage('Notification deleted');
      fetchNotifications();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleResendPush = async (id) => {
    try {
      const result = await sendAdminNotificationPush(id, adminKey);
      setMessage(`Push sent: ${result.push?.sent || 0} delivered, ${result.push?.failed || 0} failed`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const scopeInfo = SCOPE_OPTIONS.find(s => s.value === form.scope);

  return (
    <div className="admin-notifications">
      <h2>🔔 Notifications</h2>
      <p className="admin-section-subtitle">Create and manage site-wide announcements and targeted updates.</p>

      {message && (
        <div className={`admin-message ${message.includes('error') || message.includes('Failed') ? 'error' : ''}`}>
          {message}
        </div>
      )}

      <div className="admin-card">
        <h3>Create Notification</h3>
        <form onSubmit={handleSubmit} className="notification-form">
          <div className="form-row">
            <div className="form-group">
              <label>Scope</label>
              <select
                className="input"
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
              >
                {SCOPE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Title (optional)</label>
            <input
              className="input"
              type="text"
              placeholder="e.g., New Tournament Live"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Message</label>
            <textarea
              className="input"
              rows={3}
              placeholder="What should users know?"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Link (optional)</label>
            <input
              className="input"
              type="text"
              placeholder="e.g., /tournaments?tournament=12"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </div>

          {form.scope === 'tournament' && (
            <div className="form-group">
              <label>Tournament ID</label>
              <input
                className="input"
                type="number"
                placeholder="Tournament ID"
                value={form.tournament_id}
                onChange={(e) => setForm({ ...form, tournament_id: e.target.value })}
              />
            </div>
          )}

          {(form.scope === 'clan' || form.scope === 'deck' || form.scope === 'roadmap') && (
            <div className="form-group">
              <label>Resource ID</label>
              <input
                className="input"
                type="number"
                placeholder="Resource ID"
                value={form.resource_id}
                onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
              />
            </div>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.send_push}
              onChange={(e) => setForm({ ...form, send_push: e.target.checked })}
            />
            Send push notification
          </label>

          <button type="submit" className="btn btn-primary">
            Create Notification
          </button>
        </form>
      </div>

      <div className="admin-card">
        <div className="admin-filters">
          <select
            className="input"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
          >
            <option value="">All scopes</option>
            {SCOPE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
            ))}
          </select>
          <input
            className="input"
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={fetchNotifications} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="admin-empty">No notifications found.</div>
        ) : (
          <div className="notification-table">
            {notifications.map((n) => (
              <div key={n.id} className={`notification-item ${n.scope}`}>
                <div className="notification-item-main">
                  <div className="notification-item-header">
                    <span className={`scope-badge scope-${n.scope}`}>
                      {SCOPE_OPTIONS.find(s => s.value === n.scope)?.icon || '🔔'} {n.scope}
                    </span>
                    <span className="notification-type">{n.type}</span>
                    <span className="notification-time">{formatTimeAgo(n.created_at)}</span>
                  </div>
                  {n.title && <div className="notification-item-title">{n.title}</div>}
                  <div className="notification-item-message">{n.message}</div>
                  {n.link && <div className="notification-item-link">{n.link}</div>}
                </div>
                <div className="notification-item-actions">
                  <button className="btn btn-sm" onClick={() => handleResendPush(n.id)}>
                    Resend Push
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(n.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .admin-notifications {
          max-width: 900px;
        }
        .admin-section-subtitle {
          color: var(--text-muted);
          margin-bottom: var(--spacing-lg);
        }
        .admin-message {
          padding: var(--spacing-md);
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          color: var(--text-primary);
        }
        .admin-message.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .admin-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }
        .admin-card h3 {
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
          font-size: 1rem;
        }
        .notification-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .input {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .btn {
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          border: none;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }
        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .btn-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        .btn-sm {
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: 0.75rem;
        }
        .admin-filters {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
        }
        .admin-filters .input {
          flex: 1;
          min-width: 140px;
        }
        .admin-empty {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }
        .notification-table {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .notification-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        .notification-item-main {
          flex: 1;
          min-width: 0;
        }
        .notification-item-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-xs);
          flex-wrap: wrap;
        }
        .scope-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .scope-global { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
        .scope-tournament { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .scope-clan { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .scope-deck { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .scope-roadmap { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
        .notification-type {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .notification-time {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-left: auto;
        }
        .notification-item-title {
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
          font-size: 0.95rem;
        }
        .notification-item-message {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.4;
        }
        .notification-item-link {
          font-size: 0.75rem;
          color: var(--accent-primary);
          margin-top: var(--spacing-xs);
        }
        .notification-item-actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          .notification-item {
            flex-direction: column;
          }
          .notification-item-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminNotifications;
