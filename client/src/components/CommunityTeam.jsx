import { memo } from 'react';

const TEAM_MEMBERS = [
  {
    id: 'wan',
    name: 'wan',
    role: 'Creator & Developer',
    description: 'Built RoyaleMy and maintains the platform.',
    avatar: '👑',
    socials: [
      { platform: 'TikTok', handle: '@wandfk', url: 'https://www.tiktok.com/@wandfk' },
    ],
  },
  {
    id: 'alfiq',
    name: 'Alfiq',
    role: 'Community Moderator',
    description: 'Helps review deck and clan submissions.',
    avatar: '🛡️',
    socials: [
      { platform: 'TikTok', handle: '@alfiqano.cr', url: 'https://www.tiktok.com/@alfiqano.cr' },
    ],
  },
];

function SocialLink({ social }) {
  return (
    <a
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      className="team-social-link"
      title={`${social.platform}: ${social.handle}`}
    >
      <span className="team-social-platform">{social.platform}</span>
      <span className="team-social-handle">{social.handle}</span>
    </a>
  );
}

function TeamCard({ member }) {
  return (
    <article className="team-card">
      <div className="team-card-avatar" aria-hidden="true">
        {member.avatar}
      </div>
      <div className="team-card-content">
        <h3 className="team-card-name">{member.name}</h3>
        <span className="team-card-role">{member.role}</span>
        <p className="team-card-description">{member.description}</p>
        <div className="team-card-socials">
          {member.socials.map((social) => (
            <SocialLink key={`${member.id}-${social.platform}`} social={social} />
          ))}
        </div>
      </div>
    </article>
  );
}

function CommunityTeam() {
  return (
    <div className="community-team-page">
      <div className="community-team-container">
        <header className="community-team-header">
          <h1 className="community-team-title">Community Team</h1>
          <p className="community-team-intro">
            RoyaleMy is built with help from the community. Thanks to everyone who supports and improves the platform.
          </p>
        </header>

        <section className="community-team-section" aria-labelledby="team-members-heading">
          <h2 id="team-members-heading" className="community-team-section-label">
            Team Members
          </h2>
          <div className="team-grid">
            {TEAM_MEMBERS.map((member) => (
              <TeamCard key={member.id} member={member} />
            ))}
          </div>
        </section>

        <section className="community-team-cta" aria-labelledby="want-to-help-heading">
          <h2 id="want-to-help-heading" className="community-team-cta-title">
            Want to Help?
          </h2>
          <p className="community-team-cta-text">
            If you'd like to contribute to RoyaleMy, feel free to reach out. We're always open to help from Clash Royale players.
          </p>
          <a
            href="https://discord.gg/gWXeAqjSYH"
            target="_blank"
            rel="noopener noreferrer"
            className="community-team-cta-button"
          >
            Join us on Discord
          </a>
        </section>
      </div>

      <style>{`
        .community-team-page {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .community-team-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .community-team-header {
          text-align: center;
          max-width: 640px;
          margin: 0 auto;
        }

        .community-team-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
        }

        .community-team-intro {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0;
        }

        .community-team-section-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 var(--spacing-md);
          text-align: center;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--spacing-lg);
        }

        .team-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--spacing-md);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .team-card:hover {
          border-color: var(--accent-primary);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .team-card-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          flex-shrink: 0;
        }

        .team-card-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          align-items: center;
        }

        .team-card-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .team-card-role {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--accent-primary);
          background: rgba(255, 159, 28, 0.12);
          padding: 4px 10px;
          border-radius: var(--radius-md);
        }

        .team-card-description {
          font-size: 0.9375rem;
          line-height: 1.5;
          color: var(--text-secondary);
          margin: var(--spacing-xs) 0 0;
        }

        .team-card-socials {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-sm);
        }

        .team-social-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .team-social-link:hover {
          background: var(--bg-hover);
          border-color: var(--accent-primary);
        }

        .team-social-platform {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .team-social-handle {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .community-team-cta {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-md);
        }

        .community-team-cta-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .community-team-cta-text {
          font-size: 0.9375rem;
          line-height: 1.5;
          color: var(--text-secondary);
          margin: 0;
          max-width: 560px;
        }

        .community-team-cta-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          background: var(--accent-primary);
          color: white;
          font-size: 0.9375rem;
          font-weight: 600;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: opacity 0.2s ease;
        }

        .community-team-cta-button:hover {
          opacity: 0.9;
        }

        @media (max-width: 640px) {
          .community-team-page {
            padding: var(--spacing-sm);
          }

          .community-team-title {
            font-size: 1.5rem;
          }

          .team-grid {
            grid-template-columns: 1fr;
          }

          .team-card {
            padding: var(--spacing-md);
          }

          .community-team-cta {
            padding: var(--spacing-lg);
          }
        }
      `}</style>
    </div>
  );
}

export default memo(CommunityTeam);
