# NBA Stats API Proxy

Caching proxy server for NBA Stats API to bypass Vercel timeout limits.

## Features

- ✅ 30 second timeout (vs Vercel's 15s)
- ✅ 5 minute caching (reduces API load)
- ✅ CORS enabled
- ✅ All Stats API endpoints supported

## Deploy to Render

1. **Create new Web Service** on [Render.com](https://render.com)
2. **Connect this repository** (or create new repo with `express-proxy/` contents)
3. **Settings:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `ALLOWED_ORIGIN` = `https://scoard.vercel.app` (your Next.js domain)

4. **Deploy!** - Copy the URL (e.g., `https://your-proxy.onrender.com`)

## Local Development

```bash
cd express-proxy
npm install
node server.js
```

## Endpoints

- `GET /` - Health check
- `GET /api/standings?Season=2025-26` - League standings
- `GET /api/boxscore/:gameId` - Game boxscore
- `GET /api/roster/:teamId?Season=2025-26` - Team roster
- `GET /api/gamelog/:teamId?Season=2025-26` - Team game log
- `GET /api/stats/*` - Generic Stats API proxy (any endpoint)
- `POST /api/cache/clear` - Clear cache (optional)

## Usage from Next.js

```typescript
// In your Next.js API routes, replace:
const response = await axios.get('https://stats.nba.com/stats/leaguestandingsv3', ...);

// With:
const response = await axios.get(`${process.env.STATS_PROXY_URL}/api/standings`, ...);
```

Set `STATS_PROXY_URL` environment variable in Vercel to your Render URL.
