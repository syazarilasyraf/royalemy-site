import { useState } from 'react';

function FeatureLocked({ isOpen, onClose, featureName }) {
  if (!isOpen) return null;

  return (
    <div className="feature-locked-overlay" onClick={onClose}>
      <div className="feature-locked-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="locked-content">
          <div className="lock-icon-large">🔒</div>
          <h2 className="locked-title">Coming Soon</h2>
          <p className="locked-feature">{featureName}</p>
          <p className="locked-message">
            RoyaleMY is expanding. This feature will be unlocked in a future update.
          </p>
          <button className="got-it-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>

      <style>{`
        .feature-locked-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--spacing-md);
          animation: fadeIn 0.2s ease;
        }

        .feature-locked-modal {
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          max-width: 360px;
          width: 100%;
          border: 1px solid var(--bg-tertiary);
          box-shadow: var(--shadow-lg);
          position: relative;
          animation: slideUp 0.3s ease;
        }

        .close-btn {
          position: absolute;
          top: var(--spacing-sm);
          right: var(--spacing-sm);
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .locked-content {
          text-align: center;
          padding-top: var(--spacing-sm);
        }

        .lock-icon-large {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
          opacity: 0.9;
        }

        .locked-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: var(--spacing-xs);
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .locked-feature {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--spacing-md);
        }

        .locked-message {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: var(--spacing-lg);
        }

        .got-it-btn {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .got-it-btn:hover {
          background: var(--accent-secondary);
          transform: translateY(-1px);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default FeatureLocked;
