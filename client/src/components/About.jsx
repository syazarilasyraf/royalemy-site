function About() {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1 className="about-title">About RoyaleMY</h1>
        
        <div className="about-content">
          <section className="about-section">
            <p className="about-text">
              RoyaleMY is a fan-made platform created for Malaysian Clash Royale players.
            </p>
          </section>

          <section className="about-section">
            <p className="about-text">
              The goal of RoyaleMY is to provide useful tools and information for the Clash Royale community in Malaysia, including deck analysis, player lookup, clan search, and local rankings.
            </p>
          </section>

          <section className="about-section">
            <p className="about-text">
              RoyaleMY uses publicly available Clash Royale API data provided by Supercell.
            </p>
          </section>

          <section className="about-section legal">
            <p className="about-text">
              RoyaleMY is <strong>not affiliated with, endorsed, sponsored, or specifically approved by Supercell</strong>.
            </p>
            <p className="about-text">
              Clash Royale and all related assets are trademarks and copyrights of <strong>Supercell Oy</strong>.
            </p>
          </section>
        </div>
      </div>

      <style>{`
        .about-page {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--spacing-xl) 0;
        }

        .about-container {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          border: 1px solid var(--bg-tertiary);
        }

        .about-title {
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 var(--spacing-xl);
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: center;
        }

        .about-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .about-section {
          padding: var(--spacing-md) 0;
        }

        .about-section:not(:last-child) {
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .about-text {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0;
        }

        .about-section.legal {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-top: var(--spacing-md);
        }

        .about-section.legal .about-text {
          color: var(--text-muted);
          font-size: 0.9375rem;
        }

        .about-section.legal .about-text:not(:last-child) {
          margin-bottom: var(--spacing-sm);
        }

        .about-section.legal strong {
          color: var(--text-primary);
        }

        @media (max-width: 640px) {
          .about-container {
            padding: var(--spacing-lg);
          }

          .about-title {
            font-size: 1.5rem;
          }

          .about-text {
            font-size: 0.9375rem;
          }
        }
      `}</style>
    </div>
  );
}

export default About;
