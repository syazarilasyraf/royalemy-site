import { useState, useEffect } from 'react';

const BANNER_DISMISS_KEY = 'royalemy_install_banner_dismissed';

function InstallBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    const dismissed = localStorage.getItem(BANNER_DISMISS_KEY);
    if (dismissed) {
      setIsVisible(false);
      return;
    }

    // Show banner after a short delay if beforeinstallprompt is supported
    // We don't wait for the event itself because some browsers (e.g. iOS Safari)
    // don't fire it but still support "Add to Home Screen"
    const timer = setTimeout(() => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setIsVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISS_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="install-banner" role="banner" aria-label="Install app banner">
      <span className="install-banner-text">Install RoyaleMY for faster access</span>
      <button
        className="install-banner-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
      >
        ✕
      </button>

      <style>{`
        .install-banner {
          position: fixed;
          bottom: 72px;
          left: 12px;
          right: 12px;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          animation: bannerSlideUp 0.3s ease-out;
        }
        @keyframes bannerSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .install-banner-text {
          color: #f8fafc;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .install-banner-dismiss {
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
          flex-shrink: 0;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .install-banner-dismiss:hover {
          background: #334155;
          color: #f8fafc;
        }
        @media (min-width: 768px) {
          .install-banner {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default InstallBanner;
