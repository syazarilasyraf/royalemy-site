import { useState, useEffect } from 'react';
import { isValidDeckLink, extractCardIds, getDeckLinkError } from '../utils/deckParser';
import { addToQueue } from '../utils/storage';
import DeckPreview from './DeckPreview';

function DeckSubmitForm({ onSubmit }) {
  const [deckLink, setDeckLink] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [trophyRange, setTrophyRange] = useState('');
  const [previewCards, setPreviewCards] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Update preview when link changes
  useEffect(() => {
    if (!deckLink.trim()) {
      setPreviewCards(null);
      setError('');
      return;
    }

    if (isValidDeckLink(deckLink)) {
      const cardIds = extractCardIds(deckLink);
      setPreviewCards(cardIds);
      setError('');
    } else {
      setPreviewCards(null);
      // Don't show error while typing, only show on submit
    }
  }, [deckLink]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!deckLink.trim()) {
      setError('Please enter a deck link');
      return;
    }

    if (!isValidDeckLink(deckLink)) {
      setError(getDeckLinkError(deckLink));
      return;
    }

    const cardIds = extractCardIds(deckLink);
    if (!cardIds) {
      setError('Could not extract cards from link');
      return;
    }

    setIsLoading(true);

    // Simulate a brief delay for UX
    setTimeout(() => {
      const newSubmission = {
        cardIds,
        deckLink: deckLink.trim(),
        viewerName: viewerName.trim() || 'Anonymous',
        trophyRange: trophyRange.trim() || null,
        submittedAt: new Date().toISOString()
      };

      const added = addToQueue(newSubmission);
      
      // Reset form
      setDeckLink('');
      setViewerName('');
      setTrophyRange('');
      setPreviewCards(null);
      setIsLoading(false);
      
      setSuccess('Deck submitted successfully! 🎉');
      
      // Clear success after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      // Notify parent
      if (onSubmit) {
        onSubmit(added);
      }
    }, 300);
  };

  const trophyRanges = [
    { value: '', label: 'Select Trophy Range (Optional)' },
    { value: '0-1000', label: '0 - 1,000 🌱' },
    { value: '1000-2000', label: '1,000 - 2,000 🌿' },
    { value: '2000-3000', label: '2,000 - 3,000 🍃' },
    { value: '3000-4000', label: '3,000 - 4,000 🌳' },
    { value: '4000-5000', label: '4,000 - 5,000 🌲' },
    { value: '5000-6000', label: '5,000 - 6,000 ⭐' },
    { value: '6000-7000', label: '6,000 - 7,000 🌟' },
    { value: '7000-8000', label: '7,000 - 8,000 💫' },
    { value: '8000+', label: '8,000+ 🔥' },
  ];

  return (
    <div className="deck-submit-form">
      <div className="submit-card">
        <div className="submit-header">
          <span className="submit-icon">📝</span>
          <h2 className="submit-title">Submit Your Deck</h2>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="submit-form">
          {/* Deck Link Input */}
          <div className="form-group">
            <label htmlFor="deck-link" className="form-label">
              Clash Royale Deck Link <span className="required">*</span>
            </label>
            <textarea
              id="deck-link"
              value={deckLink}
              onChange={(e) => setDeckLink(e.target.value)}
              placeholder="Paste link.clashroyale.com/deck/... here"
              className="input deck-link-input"
              rows={3}
            />
            <span className="form-hint">
              Share your deck from the game and paste the link here
            </span>
          </div>

          {/* Live Preview */}
          {previewCards && (
            <div className="preview-section animate-slideUp">
              <label className="form-label">Preview</label>
              <DeckPreview cardIds={previewCards} />
            </div>
          )}

          {/* Viewer Name */}
          <div className="form-group">
            <label htmlFor="viewer-name" className="form-label">
              Your Name <span className="optional">(optional)</span>
            </label>
            <input
              id="viewer-name"
              type="text"
              value={viewerName}
              onChange={(e) => setViewerName(e.target.value)}
              placeholder="How should we call you?"
              className="input"
              maxLength={20}
            />
          </div>

          {/* Trophy Range */}
          <div className="form-group">
            <label htmlFor="trophy-range" className="form-label">
              Trophy Range <span className="optional">(optional)</span>
            </label>
            <select
              id="trophy-range"
              value={trophyRange}
              onChange={(e) => setTrophyRange(e.target.value)}
              className="input select-input"
            >
              {trophyRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading || !previewCards}
            className="btn btn-primary btn-lg btn-full submit-button"
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Submitting...
              </>
            ) : (
              <>
                <span>🚀</span>
                Submit to Queue
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        .deck-submit-form {
          width: 100%;
        }

        .submit-card {
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          border: 1px solid var(--bg-tertiary);
          box-shadow: var(--shadow-md);
        }

        .submit-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .submit-icon {
          font-size: 1.5rem;
        }

        .submit-title {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .submit-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .required {
          color: var(--accent-danger);
        }

        .optional {
          font-weight: 400;
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .form-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .deck-link-input {
          font-family: monospace;
          font-size: 0.75rem;
          resize: vertical;
          min-height: 80px;
        }

        .select-input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
        }

        .select-input option {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .preview-section {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
        }

        .submit-button {
          margin-top: var(--spacing-sm);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spinner-small {
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
      `}</style>
    </div>
  );
}

export default DeckSubmitForm;
