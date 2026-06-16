import { useState, useEffect } from 'react';

function UpdatePrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setIsVisible(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <span className="update-prompt-text">A new version of RoyaleMY is available.</span>
      <div className="update-prompt-actions">
        <button className="update-prompt-refresh" onClick={handleReload}>
          Refresh now
        </button>
        <button className="update-prompt-dismiss" onClick={handleDismiss} aria-label="Dismiss update notice">
          ✕
        </button>
      </div>

      <style>{`
        .update-prompt {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          animation: updatePromptSlideDown 0.3s ease-out;
          max-width: calc(100% - 32px);
          width: 420px;
        }

        @keyframes updatePromptSlideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .update-prompt-text {
          color: #f8fafc;
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .update-prompt-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .update-prompt-refresh {
          padding: 8px 14px;
          background: #3b82f6;
          color: #fff;
          font-size: 0.8125rem;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .update-prompt-refresh:hover {
          background: #2563eb;
        }

        .update-prompt-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          color: #94a3b8;
          font-size: 1rem;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .update-prompt-dismiss:hover {
          background: #334155;
          color: #f8fafc;
        }

        @media (max-width: 480px) {
          .update-prompt {
            width: calc(100% - 32px);
          }

          .update-prompt-text {
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
}

export default UpdatePrompt;
