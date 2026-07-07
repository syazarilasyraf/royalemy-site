import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getRateLimitSettings,
  updateRateLimitSettings,
  updateSubAdminRateLimit,
} from '../services/api';
import { useAdminPermissions } from './AdminLayout';

function AdminRateLimitSettings() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin');
  const { isSuper } = useAdminPermissions();

  const [globalSettings, setGlobalSettings] = useState({ max: 60, windowMinutes: 1 });
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingAdminId, setSavingAdminId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!adminKey || !isSuper) return;
    loadSettings();
  }, [adminKey, isSuper]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRateLimitSettings(adminKey);
      setGlobalSettings(data.global || { max: 60, windowMinutes: 1 });
      setSubAdmins(data.subAdmins || []);
    } catch (err) {
      setError(err.message || 'Failed to load rate limit settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobal = async (e) => {
    e.preventDefault();
    setSavingGlobal(true);
    setError('');
    try {
      await updateRateLimitSettings(adminKey, globalSettings);
      showMessage('Global rate limit updated');
    } catch (err) {
      setError(err.message || 'Failed to update global rate limit');
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleAdminChange = (id, field, value) => {
    setSubAdmins((prev) =>
      prev.map((sa) => (sa.id === id ? { ...sa, [field]: value } : sa))
    );
  };

  const handleSaveAdmin = async (sa) => {
    setSavingAdminId(sa.id);
    setError('');
    try {
      const payload = {
        rateLimitMax: sa.rateLimitMax === '' ? null : Number(sa.rateLimitMax),
        rateLimitWindowMinutes: sa.rateLimitWindowMinutes === '' ? null : Number(sa.rateLimitWindowMinutes),
      };
      await updateSubAdminRateLimit(sa.id, adminKey, payload);
      showMessage(`Rate limit for "${sa.name}" updated`);
    } catch (err) {
      setError(err.message || `Failed to update rate limit for ${sa.name}`);
    } finally {
      setSavingAdminId(null);
    }
  };

  if (!isSuper) {
    return (
      <div className="rate-limit-page">
        <div className="access-denied">
          <h2>🚫 Access Denied</h2>
          <p>This page is only available to the super admin.</p>
        </div>
        <style>{`
          .rate-limit-page {
            max-width: 900px;
            margin: 0 auto;
            padding: var(--spacing-lg);
          }
          .access-denied {
            background: var(--bg-secondary);
            border: 1px solid var(--bg-tertiary);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            text-align: center;
            color: var(--text-primary);
          }
          .access-denied h2 {
            margin: 0 0 var(--spacing-md);
          }
          .access-denied p {
            color: var(--text-muted);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="rate-limit-page">
      <div className="rate-limit-header">
        <h2>⏱️ Rate Limit Settings</h2>
        <p>Control the global API rate limit and set per-admin overrides.</p>
      </div>

      {error && <div className="rate-alert rate-alert-error">{error}</div>}
      {message && <div className="rate-alert rate-alert-success">{message}</div>}

      <section className="rate-section">
        <h3>Global API Rate Limit</h3>
        <p className="rate-hint">
          Applies to all public API traffic. Admin routes use this as the default unless overridden below.
        </p>
        <form onSubmit={handleSaveGlobal} className="rate-form">
          <div className="rate-field">
            <label htmlFor="global-max">Max requests</label>
            <input
              id="global-max"
              type="number"
              className="input"
              min="1"
              max="10000"
              value={globalSettings.max}
              onChange={(e) => setGlobalSettings({ ...globalSettings, max: e.target.value })}
              required
            />
          </div>
          <div className="rate-field">
            <label htmlFor="global-window">Window (minutes)</label>
            <input
              id="global-window"
              type="number"
              className="input"
              min="1"
              max="1440"
              value={globalSettings.windowMinutes}
              onChange={(e) => setGlobalSettings({ ...globalSettings, windowMinutes: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingGlobal}>
            {savingGlobal ? 'Saving...' : 'Save Global Limit'}
          </button>
        </form>
      </section>

      <section className="rate-section">
        <h3>Per-Admin Overrides</h3>
        <p className="rate-hint">
          Leave a field empty to inherit the global limit for that admin.
        </p>

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : subAdmins.length === 0 ? (
          <p className="empty-state">No limited admins yet. Create one in Access Control.</p>
        ) : (
          <div className="sub-admin-rate-list">
            {subAdmins.map((sa) => (
              <div key={sa.id} className={`sub-admin-rate-card ${!sa.isActive ? 'inactive' : ''}`}>
                <div className="sub-admin-rate-header">
                  <strong>{sa.name}</strong>
                  {!sa.isActive && <span className="status-badge inactive">Inactive</span>}
                </div>
                <div className="rate-form inline">
                  <div className="rate-field">
                    <label htmlFor={`max-${sa.id}`}>Max requests</label>
                    <input
                      id={`max-${sa.id}`}
                      type="number"
                      className="input"
                      min="1"
                      max="10000"
                      placeholder={globalSettings.max}
                      value={sa.rateLimitMax ?? ''}
                      onChange={(e) => handleAdminChange(sa.id, 'rateLimitMax', e.target.value)}
                    />
                  </div>
                  <div className="rate-field">
                    <label htmlFor={`window-${sa.id}`}>Window (minutes)</label>
                    <input
                      id={`window-${sa.id}`}
                      type="number"
                      className="input"
                      min="1"
                      max="1440"
                      placeholder={globalSettings.windowMinutes}
                      value={sa.rateLimitWindowMinutes ?? ''}
                      onChange={(e) => handleAdminChange(sa.id, 'rateLimitWindowMinutes', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={savingAdminId === sa.id}
                    onClick={() => handleSaveAdmin(sa)}
                  >
                    {savingAdminId === sa.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .rate-limit-page {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }
        .rate-limit-header {
          margin-bottom: var(--spacing-lg);
        }
        .rate-limit-header h2 {
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
        }
        .rate-limit-header p {
          color: var(--text-muted);
          margin: 0;
        }
        .rate-section {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }
        .rate-section h3 {
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
        }
        .rate-hint {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin: 0 0 var(--spacing-md);
        }
        .rate-form {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: var(--spacing-md);
        }
        .rate-form.inline {
          align-items: center;
        }
        .rate-field {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          min-width: 140px;
        }
        .rate-field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .rate-field .input {
          width: 140px;
        }
        .rate-alert {
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
        }
        .rate-alert-error {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        .rate-alert-success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }
        .loading-state,
        .empty-state {
          color: var(--text-muted);
          padding: var(--spacing-md) 0;
        }
        .sub-admin-rate-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .sub-admin-rate-card {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
        }
        .sub-admin-rate-card.inactive {
          opacity: 0.6;
        }
        .sub-admin-rate-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-md);
          color: var(--text-primary);
        }
        .status-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-md);
          text-transform: uppercase;
        }
        .status-badge.inactive {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

export default AdminRateLimitSettings;
