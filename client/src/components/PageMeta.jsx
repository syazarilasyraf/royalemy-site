import { Helmet } from 'react-helmet-async';
import { useLocation, matchPath } from 'react-router-dom';

const DEFAULT_TITLE = 'RoyaleMY — Clash Royale Tournaments, Decks & Malaysian Leaderboards';
const DEFAULT_DESCRIPTION =
  'RoyaleMY is the fan-made Clash Royale Malaysia community hub. Browse Malaysian leaderboards, tournaments, community decks, clan finder, player lookup, deck stats, and smart arena decks.';

const ROUTE_META = [
  {
    pattern: '/',
    title: 'Home — Malaysian Clash Royale tools, leaderboards & tournaments | RoyaleMY',
    description:
      'Discover RoyaleMY: Clash Royale Malaysia community with leaderboards, tournaments, deck feeds, clan finder, player lookup, and smart arena decks.',
  },
  {
    pattern: '/rankings',
    title: 'MY Rankings — Malaysian Clash Royale Leaderboards | RoyaleMY',
    description:
      'Track Malaysian Clash Royale player, clan, and Path of Legend rankings. Live trophy leaderboards and local stats for Malaysia.',
  },
  {
    pattern: '/tournaments',
    title: 'Community Tournaments — Join & Compete in Malaysia | RoyaleMY',
    description:
      'Discover and register for Malaysian Clash Royale community tournaments. Live events, registration, prizes, and hall of fame.',
  },
  {
    pattern: '/tournaments/hall-of-fame',
    title: 'Hall of Fame — Tournament Winners & Legends | RoyaleMY',
    description:
      'Celebrate top Clash Royale tournament champions in Malaysia. Hall of Fame winners, stats, and tournament legends.',
  },
  {
    pattern: '/communitydecks',
    title: 'Community Decks — Vote for the Best Decks | RoyaleMY',
    description:
      'Browse, vote, and share Clash Royale decks with the Malaysian community. Top rated and trending deck builds.',
  },
  {
    pattern: '/clan',
    title: 'Clan Finder — Search Malaysian Clans | RoyaleMY',
    description:
      'Search and explore Malaysian Clash Royale clans. Find members, compare clan stats, and discover your next clan.',
  },
  {
    pattern: '/player',
    title: 'Player Lookup — Search Clash Royale Profiles | RoyaleMY',
    description:
      'Look up any Clash Royale player by tag. View trophies, battle log, current deck, arena, and profile stats.',
  },
  {
    pattern: '/deck',
    title: 'Deck Stats — Analyze Any Clash Royale Deck | RoyaleMY',
    description:
      'Paste a Clash Royale deck link to analyze elixir cost, archetype, strengths, weaknesses, and similar meta decks.',
  },
  {
    pattern: '/arenadecks',
    title: 'Smart Deck Finder — Live Meta Decks for Your Arena | RoyaleMY',
    description:
      'Find live Clash Royale meta decks matched to your card collection and arena level. Smart deck recommendations.',
  },
  {
    pattern: '/roadmap',
    title: 'Roadmap — Suggest & Vote on Features | RoyaleMY',
    description:
      'Help shape RoyaleMY. Suggest features, vote on ideas, and see what is coming next for the Clash Royale Malaysia community.',
  },
  {
    pattern: '/team',
    title: 'Community Team — Meet the RoyaleMY Crew | RoyaleMY',
    description:
      'Meet the community team behind RoyaleMY. Malaysian Clash Royale fans building tools for local players.',
  },
  {
    pattern: '/more',
    title: 'More Tools — Explore All RoyaleMY Features | RoyaleMY',
    description:
      'Explore all RoyaleMY tools: rankings, tournaments, decks, clan finder, player lookup, deck stats, and smart arena decks.',
  },
  {
    pattern: '/live/tournament/:id',
    title: 'Live Tournament Overlay | RoyaleMY',
    description:
      'Browser source overlay for live RoyaleMY tournaments. Designed for OBS and TikTok Live Studio.',
  },
];

function PageMeta() {
  const { pathname } = useLocation();
  const match = ROUTE_META.find((route) => matchPath(route.pattern, pathname));

  const title = match ? match.title : DEFAULT_TITLE;
  const description = match ? match.description : DEFAULT_DESCRIPTION;
  const canonicalUrl = `https://royalemy.com${pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content="https://royalemy.com/royalemy.png" />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content="https://royalemy.com/royalemy.png" />
    </Helmet>
  );
}

export default PageMeta;
