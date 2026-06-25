/**
 * Share utilities for Malaysia rankings cards.
 * Generates a Spotify Wrapped-style image using the Canvas API and provides
 * helpers for copying/sharing the link or the generated image.
 */

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function getRankPalette(rank) {
  if (rank === 1) {
    return {
      bg: ['#1a0f00', '#4a2c00'],
      accent: '#f59e0b',
      accent2: '#fbbf24',
      label: '#fcd34d',
    };
  }
  if (rank === 2) {
    return {
      bg: ['#0f131a', '#2a3548'],
      accent: '#94a3b8',
      accent2: '#cbd5e1',
      label: '#e2e8f0',
    };
  }
  if (rank === 3) {
    return {
      bg: ['#1a1008', '#5c3a1e'],
      accent: '#b45309',
      accent2: '#d97706',
      label: '#fbbf24',
    };
  }
  return {
    bg: ['#0f172a', '#1e1b4b'],
    accent: '#3b82f6',
    accent2: '#8b5cf6',
    label: '#93c5fd',
  };
}

function truncateName(ctx, name, maxWidth) {
  if (!name) return '';
  let text = name;
  while (ctx.measureText(text).width > maxWidth && text.length > 1) {
    text = text.slice(0, -1);
  }
  if (text.length < name.length) {
    text = text.trimEnd() + '…';
  }
  return text;
}

export function generateRankingShareUrl({ tag, rank, board = 'ranked' }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = new URL('/player', origin);
  url.searchParams.set('tag', tag);
  url.searchParams.set('rank', String(rank));
  url.searchParams.set('board', board);
  url.searchParams.set('source', 'ranking-share');
  return url.toString();
}

export function generateRankingCardBlob({ rank, name, tag, score, boardLabel = 'Malaysia Ranked Mode' }) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const palette = getRankPalette(rank);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    gradient.addColorStop(0, palette.bg[0]);
    gradient.addColorStop(1, palette.bg[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Decorative radial glow
    const glow = ctx.createRadialGradient(
      CARD_WIDTH * 0.75,
      CARD_HEIGHT * 0.25,
      0,
      CARD_WIDTH * 0.75,
      CARD_HEIGHT * 0.25,
      CARD_WIDTH * 0.6
    );
    glow.addColorStop(0, `${palette.accent}33`); // 20% opacity
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Top brand bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, CARD_WIDTH, 80);
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('RoyaleMY', 60, 42);
    ctx.font = '24px Inter, system-ui, sans-serif';
    ctx.fillStyle = palette.label;
    ctx.fillText(boardLabel, CARD_WIDTH - 60, 42);

    // Rank circle
    const rankCircleX = 220;
    const rankCircleY = 330;
    const rankCircleR = 140;
    const rankGradient = ctx.createLinearGradient(
      rankCircleX - rankCircleR,
      rankCircleY - rankCircleR,
      rankCircleX + rankCircleR,
      rankCircleY + rankCircleR
    );
    rankGradient.addColorStop(0, palette.accent);
    rankGradient.addColorStop(1, palette.accent2);
    ctx.beginPath();
    ctx.arc(rankCircleX, rankCircleY, rankCircleR, 0, Math.PI * 2);
    ctx.fillStyle = rankGradient;
    ctx.fill();

    // Rank shadow ring
    ctx.beginPath();
    ctx.arc(rankCircleX, rankCircleY, rankCircleR + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = 'bold 160px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${rank}`, rankCircleX, rankCircleY + 8);

    // Player info
    const infoX = 460;
    const infoY = 240;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = '32px Inter, system-ui, sans-serif';
    ctx.fillStyle = palette.label;
    ctx.fillText('PLAYER', infoX, infoY);

    const displayName = truncateName(ctx, name || 'Unknown', CARD_WIDTH - infoX - 80);
    ctx.font = 'bold 80px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayName, infoX, infoY + 44);

    ctx.font = '36px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`#${tag || ''}`, infoX, infoY + 144);

    // Score pill
    const scoreText = score != null ? `${score.toLocaleString()} Trophies` : 'Ranked Mode';
    ctx.font = 'bold 40px Inter, system-ui, sans-serif';
    const textMetrics = ctx.measureText(scoreText);
    const pillPaddingX = 36;
    const pillPaddingY = 22;
    const pillWidth = textMetrics.width + pillPaddingX * 2;
    const pillHeight = 56 + pillPaddingY;
    const pillX = infoX;
    const pillY = infoY + 220;

    const pillGradient = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
    pillGradient.addColorStop(0, palette.accent);
    pillGradient.addColorStop(1, palette.accent2);

    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 18);
    ctx.fillStyle = pillGradient;
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(scoreText, pillX + pillPaddingX, pillY + pillHeight / 2);

    // Footer
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '22px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('royalemy.com · Fan-made Clash Royale community for Malaysian players', CARD_WIDTH / 2, CARD_HEIGHT - 34);

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob returned null'));
      }
    }, 'image/png');
  });
}

export async function shareRankingLink({ tag, rank, name, boardLabel = 'Malaysia Ranked Mode' }) {
  const shareUrl = generateRankingShareUrl({ tag, rank });
  const title = `${name || 'Unknown'} is #${rank} on RoyaleMY ${boardLabel}`;
  const text = `Check out ${name || 'Unknown'} (#${tag}) ranked #${rank} on RoyaleMY Malaysia Rankings!`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: shareUrl });
      return { method: 'share' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { method: 'cancelled' };
      }
      // Fall through to clipboard fallback
    }
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl);
    return { method: 'clipboard' };
  }

  window.prompt('Copy this link:', shareUrl);
  return { method: 'prompt' };
}

export async function shareRankingImage(blob, { name, rank }) {
  const file = new File([blob], `royalemy-ranking-${rank}-${name || 'player'}.png`, { type: 'image/png' });
  const data = {
    title: `${name || 'Unknown'} · #${rank} RoyaleMY Ranking`,
    text: `Check out this ranking card for ${name || 'Unknown'}!`,
    files: [file],
  };

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share(data);
    return { method: 'share-file' };
  }

  return downloadRankingImage(blob, { name, rank });
}

export function downloadRankingImage(blob, { name, rank }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `royalemy-ranking-${rank}-${name || 'player'}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { method: 'download' };
}
