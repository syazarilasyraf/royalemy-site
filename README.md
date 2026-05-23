# RoyaleMY 🇲🇾

A fan-made Clash Royale platform for Malaysian players.

> **Disclaimer:** This site is not affiliated with, endorsed, sponsored, or specifically approved by Supercell. Clash Royale and all related assets are trademarks of Supercell Oy.

---

## Architecture

| Layer | Location | How It Runs |
|-------|----------|-------------|
| **Frontend** | `client/` | Deployed on [Vercel](https://vercel.com) |
| **Backend** | `server/` | Runs locally on your machine (port 3001) |
| **Tunnel** | ngrok | Exposes local backend to the internet |

The frontend talks to the backend via `VITE_API_URL` (set in Vercel dashboard).

---

## Local Backend Startup

```bash
# 1. Install dependencies (first time only)
cd server
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your CR_API_TOKEN

# 3. Start the server
npm start
```

Backend runs at **http://localhost:3001**

Health check: http://localhost:3001/api/health

---

## Expose Backend with ngrok

```bash
# In a new terminal (backend must be running)
ngrok http 3001
```

Copy the **HTTPS URL** (e.g., `https://abc123.ngrok-free.app`) and set it as `VITE_API_URL` in Vercel:

```
VITE_API_URL=https://abc123.ngrok-free.app/api
```

> **Tip:** Every time you restart ngrok, the URL changes. Update `VITE_API_URL` in Vercel and redeploy (or use a free ngrok static domain).

---

## Vercel Deployment

1. Push your code to GitHub
2. Import the `client/` folder into [Vercel](https://vercel.com)
   - Framework preset: **Vite**
   - Root directory: `client`
3. Add environment variables in Vercel dashboard:
   - `VITE_API_URL` = your ngrok HTTPS URL + `/api`
4. Deploy

The frontend will be built with `VITE_API_URL` baked in at build time.

---

## Environment Variables

### Frontend (`client/.env` or Vercel dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Full URL to backend API. Examples: `https://abc.ngrok-free.app/api` (production), empty (local dev with Vite proxy) |

### Backend (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `CR_API_TOKEN` | **Yes** | Your Clash Royale API token from [developer.clashroyale.com](https://developer.clashroyale.com/) |
| `PORT` | No | Server port (default: `3001`) |
| `FRONTEND_URL` | **Yes** | Your Vercel deployment URL for CORS. Example: `https://your-app.vercel.app` |
| `CORS_ORIGINS` | No | Additional allowed origins (comma-separated). Useful for Vercel preview deployments. |

---

## Local Development (Full Local)

If you want to run everything locally without ngrok or Vercel:

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd client
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:3001` automatically.

---

## Project Structure

```
RoyaleMY/
├── client/           ← Vite + React frontend (deploy to Vercel)
│   ├── src/
│   ├── public/
│   └── package.json
├── server/           ← Express backend (run locally)
│   ├── index.js
│   ├── data/
│   └── package.json
├── scripts/          ← Utility scripts (e.g., download card images)
├── package.json      ← Root workspace config
└── README.md
```

---

## Security Notes

- **CR_API_TOKEN** never leaves the backend.
- CORS is restricted to `FRONTEND_URL` (and any `CORS_ORIGINS` you set).
- Rate limiting is active: **60 requests/minute per IP**.
- ngrok exposes your machine to the internet — only run it when needed.
- Consider adding an IP whitelist or API key to sensitive endpoints if sharing publicly.

---

## Troubleshooting

### "CR_API_TOKEN not set"
Copy `server/.env.example` to `server/.env` and paste your token.

### "CORS error"
Make sure `FRONTEND_URL` in `server/.env` matches your actual frontend domain.

### "Rate limit exceeded"
Wait 1 minute. The backend limits to 60 requests per minute per IP.

### Port already in use
```powershell
# Windows
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
```

---

Created by [@wandfk](https://www.tiktok.com/@wandfk)

Built for Malaysian Clash Royale players 🇲🇾
