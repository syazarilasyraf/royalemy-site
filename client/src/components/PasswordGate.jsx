import { useState, useEffect } from 'react';
import { validateStreamCode, setUnlocked, getStreamCode, setStreamCode } from '../utils/storage';

function PasswordGate({ onUnlock }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [newStreamCode, setNewStreamCode] = useState('');
  const [currentCode, setCurrentCode] = useState('');

  useEffect(() => {
    setCurrentCode(getStreamCode());
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!code.trim()) {
      setError('Please enter the access code');
      return;
    }

    setIsLoading(true);
    
    // Small delay for UX
    setTimeout(() => {
      if (validateStreamCode(code)) {
        setUnlocked(true);
        onUnlock();
      } else {
        setError('Invalid access code. Try again! 🔒');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleChangeCode = (e) => {
    e.preventDefault();
    if (!newStreamCode.trim()) {
      return;
    }
    setStreamCode(newStreamCode.trim().toUpperCase());
    setCurrentCode(newStreamCode.trim().toUpperCase());
    setNewStreamCode('');
    alert(`Access code changed to: ${newStreamCode.trim().toUpperCase()}`);
  };

  return (
    <div className="password-gate animate-fadeIn">
      <div className="gate-content">
        {/* Logo */}
        <div className="gate-logo">
          <span className="gate-logo-icon">👑</span>
          <h1 className="gate-title">RoyaleMY</h1>
        </div>
        
        <p className="gate-subtitle">
          Clash Royale tools for Malaysian players.
        </p>

        {/* Access Code Form */}
        <form onSubmit={handleSubmit} className="gate-form">
          <div className="gate-input-group">
            <label htmlFor="access-code" className="gate-label">
              🔐 Access Code
            </label>
            <input
              id="access-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter access code..."
              className={`input gate-input ${error ? 'input-error animate-shake' : ''}`}
              autoComplete="off"
              autoFocus
            />
            {error && (
              <span className="gate-error">{error}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg btn-full gate-button"
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Verifying...
              </>
            ) : (
              <>
                <span>🎮</span>
                Enter RoyaleMY
              </>
            )}
          </button>
        </form>

        {/* Admin Toggle */}
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className="btn btn-ghost gate-admin-toggle"
        >
          {showAdmin ? 'Hide Admin' : '⚙️ Change Access Code'}
        </button>

        {/* Admin Panel */}
        {showAdmin && (
          <div className="gate-admin animate-slideUp">
            <div className="gate-admin-divider"></div>
            <h3 className="gate-admin-title">Admin Settings</h3>
            <p className="gate-admin-current">
              Current code: <strong>{currentCode}</strong>
            </p>
            <form onSubmit={handleChangeCode} className="gate-admin-form">
              <input
                type="text"
                value={newStreamCode}
                onChange={(e) => setNewStreamCode(e.target.value.toUpperCase())}
                placeholder="New access code..."
                className="input"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-secondary btn-full">
                Update Code
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="gate-footer">
          <div className="gate-footer-main">
            <span>RoyaleMY</span>
            <span className="footer-separator">|</span>
            <span>Created by <a href="https://www.tiktok.com/@wandfk" target="_blank" rel="noopener noreferrer" className="footer-link">@wandfk</a></span>
          </div>
          <div className="gate-disclaimer">
            <p>RoyaleMY is a fan-made Clash Royale community website for Malaysian players.</p>
            <p>This site is not affiliated with, endorsed, sponsored, or specifically approved by Supercell.</p>
            <p>Clash Royale and all related assets are trademarks and copyrights of Supercell Oy.</p>
          </div>
        </div>
      </div>

      <style>{`
        .password-gate {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
          background: 
            radial-gradient(ellipse at top, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at bottom, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
            var(--bg-primary);
        }

        .gate-content {
          width: 100%;
          max-width: 380px;
          text-align: center;
        }

        .gate-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .gate-logo-icon {
          font-size: 4rem;
          filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
        }

        .gate-title {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .gate-subtitle {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          margin-bottom: var(--spacing-xl);
        }

        .gate-form {
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--bg-tertiary);
        }

        .gate-input-group {
          text-align: left;
          margin-bottom: var(--spacing-md);
        }

        .gate-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .gate-input {
          text-align: center;
          font-size: 1.125rem;
          letter-spacing: 0.1em;
          font-weight: 600;
        }

        .gate-error {
          display: block;
          font-size: 0.75rem;
          color: var(--accent-danger);
          margin-top: var(--spacing-sm);
        }

        .gate-button {
          margin-top: var(--spacing-sm);
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .gate-admin-toggle {
          margin-top: var(--spacing-lg);
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .gate-admin-toggle:hover {
          color: var(--text-secondary);
        }

        .gate-admin {
          margin-top: var(--spacing-lg);
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          border: 1px solid var(--bg-tertiary);
        }

        .gate-admin-divider {
          height: 1px;
          background: var(--bg-tertiary);
          margin: -var(--spacing-md) -var(--spacing-md) var(--spacing-md);
        }

        .gate-admin-title {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .gate-admin-current {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: var(--spacing-md);
        }

        .gate-admin-current strong {
          color: var(--accent-primary);
        }

        .gate-admin-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .gate-footer {
          margin-top: var(--spacing-xl);
          text-align: center;
        }

        .gate-footer-main {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-md);
        }

        .gate-footer-main span {
          display: inline;
        }

        .footer-separator {
          margin: 0 var(--spacing-xs);
          opacity: 0.5;
        }

        .gate-footer a {
          color: var(--accent-primary);
          text-decoration: none;
          font-weight: 600;
        }

        .gate-footer a:hover {
          text-decoration: underline;
        }

        .gate-disclaimer {
          font-size: 0.625rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .gate-disclaimer p {
          margin: 0 0 var(--spacing-xs);
        }

        .gate-disclaimer p:last-child {
          margin-bottom: 0;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease;
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

export default PasswordGate;
