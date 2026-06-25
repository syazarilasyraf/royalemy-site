import { useEffect, useState, useCallback, memo } from 'react';
import {
  generateRankingCardBlob,
  shareRankingLink,
  shareRankingImage,
  downloadRankingImage,
} from '../utils/shareRanking';

function ShareRankingModal({ player, rank, boardLabel = 'Malaysia Ranked Mode', onClose }) {
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const name = player?.name || 'Unknown';
  const tag = player?.tag || '';
  const score = player?.trophies ?? null;

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    const draw = async () => {
      try {
        setLoading(true);
        setError('');
        const generated = await generateRankingCardBlob({
          rank,
          name,
          tag,
          score,
          boardLabel,
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(generated);
        setBlob(generated);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not generate ranking card.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    draw();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [rank, name, tag, score, boardLabel]);

  const showMessage = useCallback((msg) => {
    setActionMessage(msg);
    const timer = setTimeout(() => setActionMessage(''), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleShareLink = useCallback(async () => {
    try {
      const result = await shareRankingLink({ tag, rank, name, boardLabel });
      if (result.method === 'clipboard') {
        showMessage('Link copied to clipboard!');
      } else if (result.method === 'cancelled') {
        // no-op
      } else {
        showMessage('Share sheet opened!');
      }
    } catch (err) {
      showMessage(err.message || 'Could not share link.');
    }
  }, [tag, rank, name, boardLabel, showMessage]);

  const handleShareImage = useCallback(async () => {
    if (!blob) return;
    try {
      const result = await shareRankingImage(blob, { name, rank });
      if (result.method === 'download') {
        showMessage('Image downloaded!');
      } else {
        showMessage('Image share sheet opened!');
      }
    } catch (err) {
      showMessage(err.message || 'Could not share image.');
    }
  }, [blob, name, rank, showMessage]);

  const handleDownloadImage = useCallback(() => {
    if (!blob) return;
    downloadRankingImage(blob, { name, rank });
    showMessage('Image downloaded!');
  }, [blob, name, rank, showMessage]);

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="share-modal-header">
          <h3 id="share-title">Share Ranking</h3>
          <button className="share-modal-close" onClick={onClose} aria-label="Close share dialog">
            ✕
          </button>
        </div>

        <div className="share-modal-body">
          {loading && (
            <div className="share-modal-loading">
              <div className="share-modal-spinner" />
              <p>Creating your ranking card…</p>
            </div>
          )}

          {!loading && error && (
            <div className="share-modal-error">
              <p>⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && previewUrl && (
            <img
              src={previewUrl}
              alt={`Ranking card for ${name} at rank ${rank}`}
              className="share-modal-preview"
            />
          )}
        </div>

        {!loading && !error && blob && (
          <div className="share-modal-actions">
            <button className="share-btn share-btn-link" onClick={handleShareLink}>
              🔗 Copy Link
            </button>
            <button className="share-btn share-btn-image" onClick={handleShareImage}>
              📤 Share Image
            </button>
            <button className="share-btn share-btn-download" onClick={handleDownloadImage}>
              ⬇️ Download
            </button>
          </div>
        )}

        {actionMessage && <p className="share-modal-message">{actionMessage}</p>}
      </div>

      <style>{`
        .share-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--spacing-md);
          backdrop-filter: blur(4px);
        }

        .share-modal {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
        }

        .share-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .share-modal-header h3 {
          margin: 0;
          font-size: 1.125rem;
          color: var(--text-primary);
        }

        .share-modal-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }

        .share-modal-close:hover {
          color: var(--text-primary);
        }

        .share-modal-body {
          padding: var(--spacing-lg);
        }

        .share-modal-preview {
          width: 100%;
          height: auto;
          border-radius: var(--radius-lg);
          border: 1px solid var(--bg-tertiary);
          display: block;
        }

        .share-modal-loading,
        .share-modal-error {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-secondary);
        }

        .share-modal-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto var(--spacing-md);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .share-modal-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-sm);
          padding: 0 var(--spacing-lg) var(--spacing-lg);
        }

        .share-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          border: none;
          border-radius: var(--radius-lg);
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .share-btn-link {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .share-btn-link:hover {
          background: var(--accent-primary);
          color: white;
        }

        .share-btn-image {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
        }

        .share-btn-image:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .share-btn-download {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .share-btn-download:hover {
          background: var(--accent-success);
          color: white;
        }

        .share-modal-message {
          text-align: center;
          margin: 0 var(--spacing-lg) var(--spacing-lg);
          font-size: 0.875rem;
          color: var(--accent-success);
        }

        @media (max-width: 520px) {
          .share-modal-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(ShareRankingModal);
