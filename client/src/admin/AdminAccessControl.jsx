import { useState, useEffect, memo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
} from '../services/api';
import { useAdminPermissions } from './AdminLayout';

const PERMISSION_DEFINITIONS = [
  { key: 'dashboard', label: 'Dashboard', description: 'View pending counts' },
  { key: 'tournaments', label: 'Tournaments', description: 'Approve/manage tournaments' },
  { key: 'clans', label: 'Clans', description: 'Approve/manage clans' },
  { key: 'decks', label: 'Decks', description: 'Approve/manage decks' },
  { key: 'roadmap', label: 'Roadmap', description: 'Manage feature suggestions' },
  { key: 'notifications', label: 'Notifications', description: 'Send notifications' },
  { key: 'logs', label: 'Logs', description: 'View server logs' },
  { key: 'audit', label: 'Audit', description: 'View audit trail' },
  { key: 'statePlayers', label: 'State Players', description: 'Approve state rankings' },
];

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  tournaments: false,
  clans: true,
  decks: true,
  roadmap: false,
  notifications: false,
  logs: false,
  audit: false,
  statePlayers: false,
};

function AdminAccessControl() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get('admin');
  const { isSuper } = useAdminPermissions();

  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [newName, setNewName] = useState('');
  const [newPermissions, setNewPermissions] = useState({ ...DEFAULT_PERMISSIONS });
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);

  useEffect(() => {
    if (!adminKey || !isSuper) return;
    loadSubAdmins();
  }, [adminKey, isSuper]);

  const loadSubAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSubAdmins(adminKey);
      setSubAdmins(data.subAdmins || []);
    } catch (err) {
      setError(err.message || 'Failed to load sub-admins');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError('');
    setCreatedKey(null);

    try {
      const data = await createSubAdmin(adminKey, {
        name: newName.trim(),
        permissions: newPermissions,
      });
      setCreatedKey({
        name: data.name,
        key: data.key,
        adminUrl: data.adminUrl,
      });
      setNewName('');
      setNewPermissions({ ...DEFAULT_PERMISSIONS });
      await loadSubAdmins();
      showMessage(`Sub-admin "${data.name}" created successfully`);
    } catch (err) {
      setError(err.message || 'Failed to create sub-admin');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePermission = async (id, key, currentPermissions) => {
    const updated = { ...currentPermissions, [key]: !currentPermissions[key] };
    try {
      await updateSubAdmin(id, adminKey, { permissions: updated });
      setSubAdmins((prev) =>
        prev.map((sa) => (sa.id === id ? { ...sa, permissions: updated } : sa))
      );
    } catch (err) {
      setError(err.message || 'Failed to update permission');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await updateSubAdmin(id, adminKey, { isActive: !isActive });
      setSubAdmins((prev) =>
        prev.map((sa) => (sa.id === id ? { ...sa, isActive: !isActive } : sa))
      );
      showMessage(`Sub-admin ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete sub-admin "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSubAdmin(id, adminKey);
      setSubAdmins((prev) => prev.filter((sa) => sa.id !== id));
      showMessage('Sub-admin deleted');
    } catch (err) {
      setError(err.message || 'Failed to delete sub-admin');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage('Copied to clipboard');
    } catch (e) {
      showMessage('Copy failed. Please copy manually.');
    }
  };

  const toggleNewPermission = (key) => {
    setNewPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isSuper) {
    return (
      <div className="access-control-page">
        <div className="access-denied">
          <h2>🚫 Access Denied</h2>
          <p>This page is only available to the super admin.</p>
        </div>
        <style>{`
          .access-control-page {
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
    <div className="access-control-page">
      <div className="access-control-header">
        <h2>🗝️ Admin Access Control</h2>
        <p>Create limited-admin keys and control which features they can access.</p>
      </div>

      {error && <div className="access-alert access-alert-error">{error}</div>}
      {message && <div className="access-alert access-alert-success">{message}</div>}

      <section className="access-section">
        <h3>Create New Limited Admin</h3>
        <form onSubmit={handleCreate} className="create-admin-form">
          <div className="form-row">
            <input
              type="text"
              className="input"
              placeholder="Admin name (e.g. Clan Moderator)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>
              {creating ? 'Creating...' : 'Create Admin'}
            </button>
          </div>

          <div className="permissions-grid">
            {PERMISSION_DEFINITIONS.map((perm) => (
              <label key={perm.key} className="permission-toggle">
                <input
                  type="checkbox"
                  checked={!!newPermissions[perm.key]}
                  onChange={() => toggleNewPermission(perm.key)}
                />
                <span className="permission-label">
                  <strong>{perm.label}</strong>
                  <small>{perm.description}</small>
                </span>
              </label>
            ))}
          </div>
        </form>

        {createdKey && (
          <div className="created-key-banner">
            <strong>🔐 Key created for "{createdKey.name}"</strong>
            <p>Copy this URL and share it with the new admin. It will not be shown again.</p>
            <div className="created-key-row">
              <code className="created-key-url">{window.location.origin}{createdKey.adminUrl}</code>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => copyToClipboard(`${window.location.origin}${createdKey.adminUrl}`)}
              >
                Copy URL
              </button>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => setCreatedKey(null)}>
              Dismiss
            </button>
          </div>
        )}
      </section>

      <section className="access-section">
        <h3>Existing Limited Admins</h3>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : subAdmins.length === 0 ? (
          <p className="empty-state">No limited admins yet.</p>
        ) : (
          <div className="sub-admin-list">
            {subAdmins.map((sa) => (
              <div key={sa.id} className={`sub-admin-card ${!sa.isActive ? 'inactive' : ''}`}>
                <div className="sub-admin-header">
                  <div>
                    <strong className="sub-admin-name">{sa.name}</strong>
                    <span className={`status-badge ${sa.isActive ? 'active' : 'inactive'}`}>
                      {sa.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="sub-admin-actions">
                    <button
                      type="button"
                      className={`btn btn-sm ${sa.isActive ? 'btn-secondary' : 'btn-success'}`}
                      onClick={() => handleToggleActive(sa.id, sa.isActive)}
                    >
                      {sa.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(sa.id, sa.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="sub-admin-permissions">
                  {PERMISSION_DEFINITIONS.map((perm) => (
                    <label key={perm.key} className="permission-toggle small">
                      <input
                        type="checkbox"
                        checked={!!sa.permissions[perm.key]}
                        onChange={() => handleTogglePermission(sa.id, perm.key, sa.permissions)}
                      />
                      <span className="permission-label">
                        <strong>{perm.label}</strong>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .access-control-page {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }
        .access-control-header {
          margin-bottom: var(--spacing-xl);
        }
        .access-control-header h2 {
          margin: 0 0 var(--spacing-sm);
          color: white;
          font-size: 1.5rem;
        }
        .access-control-header p {
          margin: 0;
          color: var(--text-muted);
        }
        .access-section {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }
        .access-section h3 {
          margin: 0 0 var(--spacing-md);
          color: white;
          font-size: 1.1rem;
        }
        .access-alert {
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
        }
        .access-alert-error {
          background: rgba(244, 67, 54, 0.15);
          color: #f44336;
        }
        .access-alert-success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }
        .create-admin-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .form-row {
          display: flex;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }
        .form-row .input {
          flex: 1;
          min-width: 220px;
        }
        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: var(--spacing-sm);
        }
        .permission-toggle {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .permission-toggle:hover {
          border-color: var(--accent-primary);
        }
        .permission-toggle input {
          margin-top: 3px;
          accent-color: var(--accent-primary);
        }
        .permission-label {
          display: flex;
          flex-direction: column;
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .permission-label small {
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 400;
        }
        .permission-toggle.small {
          padding: var(--spacing-xs) var(--spacing-sm);
        }
        .created-key-banner {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: var(--radius-lg);
        }
        .created-key-banner strong {
          display: block;
          color: #60a5fa;
          margin-bottom: var(--spacing-xs);
        }
        .created-key-banner p {
          margin: 0 0 var(--spacing-sm);
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .created-key-row {
          display: flex;
          gap: var(--spacing-sm);
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: var(--spacing-sm);
        }
        .created-key-url {
          flex: 1;
          min-width: 0;
          padding: var(--spacing-sm);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.8125rem;
          word-break: break-all;
        }
        .sub-admin-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .sub-admin-card {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
        }
        .sub-admin-card.inactive {
          opacity: 0.6;
        }
        .sub-admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          flex-wrap: wrap;
          margin-bottom: var(--spacing-md);
        }
        .sub-admin-name {
          color: white;
          margin-right: var(--spacing-sm);
        }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-badge.active {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        .status-badge.inactive {
          background: rgba(100, 116, 139, 0.2);
          color: var(--text-muted);
        }
        .sub-admin-actions {
          display: flex;
          gap: var(--spacing-sm);
        }
        .sub-admin-permissions {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: var(--spacing-xs);
        }
        .loading-state,
        .empty-state {
          color: var(--text-muted);
          text-align: center;
          padding: var(--spacing-lg);
        }

        @media (max-width: 640px) {
          .form-row {
            flex-direction: column;
          }
          .sub-admin-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .permissions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(AdminAccessControl);
