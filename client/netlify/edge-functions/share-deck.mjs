/**
 * Netlify Edge Function
 * Serves rich social-media previews for community decks on the public domain.
 * Example: https://royalemy.com/share/deck/1
 */

export default async (request, context) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/share\/deck\/(\d+)$/);
  if (!match) {
    return context.next();
  }

  const deckId = match[1];
  const apiBase = Netlify.env.get('VITE_API_URL')?.replace(/\/$/, '') || 'http://localhost:3001/api';

  try {
    const backendUrl = `${apiBase}/community-decks/${deckId}/share`;
    const response = await fetch(backendUrl);

    if (!response.ok) {
      return new Response('<html><body><h1>Deck not found</h1></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const html = await response.text();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    return new Response(`<html><body><p>Failed to load deck preview: ${error.message}</p></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
