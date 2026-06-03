import { useState, useEffect, useRef, useCallback } from 'react';

function InstallButton() {
  const [isVisible, setIsVisible] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt.current) return;

    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    } else {
      console.log('[PWA] User dismissed install');
    }

    deferredPrompt.current = null;
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="install-btn"
      aria-label="Install RoyaleMY"
      title="Install RoyaleMY"
    >
      <span className="install-btn-icon">📲</span>
      <span className="install-btn-text">Install RoyaleMY</span>

      <style>{`
        .install-btn {
          position: fixed;
          bottom: 80px;
          right: 16px;
          z-index: 1000;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: #fff;
          font-size: 0.9375rem;
          font-weight: 700;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }
        .install-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }
        .install-btn:active {
          transform: translateY(0);
        }
        .install-btn-icon {
          font-size: 1.125rem;
        }
        @media (max-width: 767px) {
          .install-btn {
            bottom: 140px;
          }
        }
        @media (min-width: 768px) {
          .install-btn {
            bottom: 24px;
          }
        }
      `}</style>
    </button>
  );
}

export default InstallButton;
