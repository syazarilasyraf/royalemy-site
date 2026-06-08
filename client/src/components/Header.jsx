import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getVapidPublicKey, subscribeToPush } from '../services/api.js';

function getDeviceId() {
  let id = localStorage.getItem('royalemy_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('royalemy_device_id', id);
  }
  return id;
}

function getPushEndpoint() {
  return localStorage.getItem('royalemy_push_endpoint') || '';
}

function savePushEndpoint(endpoint) {
  if (endpoint) localStorage.setItem('royalemy_push_endpoint', endpoint);
}

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

function Header() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState('');
  const dropdownRef = useRef(null);
  const deviceId = getDeviceId();
  const endpoint = getPushEndpoint() || deviceId;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications(endpoint);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      // Silently fail — notifications are non-critical
    }
  }, [endpoint]);

  useEffect(() => {
    // Check push permission state
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleToggleDropdown = () => {
    setDropdownOpen(prev => !prev);
    if (!dropdownOpen) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id, endpoint);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        // ignore
      }
    }
    setDropdownOpen(false);
    if (notif.tournament_id) {
      navigate(`/tournaments?tournament=${notif.tournament_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(endpoint);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  };

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushError('Push notifications not supported on this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === 'denied') {
      setPushError('Notifications blocked. Enable in browser settings.');
      return;
    }
    if (permission !== 'granted') return;

    setPushLoading(true);
    setPushError('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        savePushEndpoint(existingSub.endpoint);
        setPushLoading(false);
        return;
      }
      const { publicKey } = await getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      savePushEndpoint(sub.endpoint);
    } catch (err) {
      setPushError('Could not enable notifications.');
    } finally {
      setPushLoading(false);
    }
  };

  const hasPush = pushPermission === 'granted';
  const showEnablePrompt = pushPermission === 'default' || pushPermission === 'prompt';

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">👑</span>
          <span className="logo-text">RoyaleMY</span>
        </Link>

        <div className="header-actions">
          {/* Notification Bell */}
          <div className="notification-bell-wrapper" ref={dropdownRef}>
            <button
              className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
              onClick={handleToggleDropdown}
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="bell-icon">{hasPush ? '🔔' : '🔕'}</span>
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <span className="dropdown-title">📢 Notifications</span>
                  {unreadCount > 0 && (
                    <button className="mark-all-read" onClick={handleMarkAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="notification-dropdown-body">
                  {showEnablePrompt && !hasPush && (
                    <div className="notification-enable-prompt">
                      <p>Get notified when tournaments update</p>
                      <button
                        className="enable-push-btn"
                        onClick={handleEnablePush}
                        disabled={pushLoading}
                      >
                        {pushLoading ? 'Enabling...' : '🔔 Enable Push Notifications'}
                      </button>
                      {pushError && <p className="push-error">{pushError}</p>}
                    </div>
                  )}

                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      <p>No notifications yet</p>
                      <span>Updates will appear here</span>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.slice(0, 10).map((n) => (
                        <button
                          key={n.id}
                          className={`notification-row ${!n.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <span className={`notification-type-dot type-${n.type}`}></span>
                          <div className="notification-row-content">
                            <p className="notification-row-message">{n.message}</p>
                            <div className="notification-row-meta">
                              <span className="notification-row-tournament">{n.tournament_name}</span>
                              <span className="notification-row-time">{formatTimeAgo(n.created_at)}</span>
                            </div>
                          </div>
                          {!n.is_read && <span className="unread-indicator"></span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="notification-dropdown-footer">
                    <Link to="/tournaments" className="view-all-link" onClick={() => setDropdownOpen(false)}>
                      View all tournaments →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <a
            href="https://discord.gg/gWXeAqjSYH"
            target="_blank"
            rel="noopener noreferrer"
            className="header-discord-btn"
          >
            <span>💬</span>
            <span className="discord-label">Discord</span>
          </a>
        </div>
      </div>

      <style>{`
        .app-header {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--bg-tertiary);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-md);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          text-decoration: none;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .header-discord-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: #5865f2;
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .header-discord-btn:hover {
          background: #4752c4;
          transform: translateY(-1px);
        }

        /* Notification Bell */
        .notification-bell-wrapper {
          position: relative;
        }

        .notification-bell {
          position: relative;
          background: var(--bg-tertiary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-sm) var(--spacing-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: var(--text-primary);
        }

        .notification-bell:hover {
          background: var(--bg-primary);
          border-color: var(--accent-primary);
        }

        .bell-icon {
          font-size: 1.1rem;
        }

        .notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid var(--bg-secondary);
        }

        /* Dropdown */
        .notification-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 360px;
          max-width: calc(100vw - 32px);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          z-index: 200;
          overflow: hidden;
          animation: dropdownSlide 0.15s ease-out;
        }

        @keyframes dropdownSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .notification-dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .dropdown-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .mark-all-read {
          background: none;
          border: none;
          color: var(--accent-primary);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }

        .mark-all-read:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .notification-dropdown-body {
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-empty {
          padding: var(--spacing-xl) var(--spacing-md);
          text-align: center;
          color: var(--text-muted);
        }

        .notification-empty p {
          margin: 0 0 var(--spacing-xs);
          font-weight: 600;
        }

        .notification-empty span {
          font-size: 0.875rem;
        }

        .notification-enable-prompt {
          padding: var(--spacing-md);
          text-align: center;
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .notification-enable-prompt p {
          margin: 0 0 var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .enable-push-btn {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .enable-push-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .enable-push-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .push-error {
          color: #ef4444;
          font-size: 0.8rem;
          margin-top: var(--spacing-sm);
          margin-bottom: 0;
        }

        .notification-list {
          display: flex;
          flex-direction: column;
        }

        .notification-row {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: none;
          border: none;
          border-bottom: 1px solid var(--bg-tertiary);
          text-align: left;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s;
          position: relative;
        }

        .notification-row:hover {
          background: var(--bg-tertiary);
        }

        .notification-row.unread {
          background: rgba(59, 130, 246, 0.06);
        }

        .notification-row.unread:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .notification-type-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 6px;
          flex-shrink: 0;
        }

        .notification-type-dot.type-status_change { background: #3b82f6; }
        .notification-type-dot.type-registration { background: #22c55e; }
        .notification-type-dot.type-updated { background: #f59e0b; }
        .notification-type-dot.type-winner { background: #eab308; }
        .notification-type-dot.type-default { background: var(--text-muted); }

        .notification-row-content {
          flex: 1;
          min-width: 0;
        }

        .notification-row-message {
          margin: 0 0 2px;
          font-size: 0.875rem;
          color: var(--text-primary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-row-meta {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.75rem;
        }

        .notification-row-tournament {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .notification-row-time {
          color: var(--text-muted);
        }

        .unread-indicator {
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .notification-dropdown-footer {
          padding: var(--spacing-sm) var(--spacing-md);
          border-top: 1px solid var(--bg-tertiary);
          text-align: center;
        }

        .view-all-link {
          color: var(--accent-primary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .view-all-link:hover {
          text-decoration: underline;
        }

        /* Mobile */
        @media (max-width: 480px) {
          .notification-dropdown {
            width: calc(100vw - 32px);
            right: -8px;
          }
          .discord-label {
            display: none;
          }
          .header-discord-btn {
            padding: var(--spacing-sm);
          }
        }
      `}</style>
    </header>
  );
}

// Helper for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export default Header;
