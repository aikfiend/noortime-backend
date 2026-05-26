# NoorTime Backend

NestJS REST API with Google OAuth, session-based auth, and prayer/streak/mosque/qibla endpoints.

## Setup

```bash
cp .env.example .env   # fill in real values
npm install
npm run start:dev
```

API runs on `http://localhost:3001`.

## Environment Variables

| Variable              | Description                                          |
|-----------------------|------------------------------------------------------|
| `NODE_ENV`            | `development` or `production`                        |
| `DATABASE_URL`        | MySQL connection string (`mysql://user:pass@host:3306/db`) |
| `GOOGLE_CLIENT_ID`    | Google OAuth client ID                               |
| `GOOGLE_CLIENT_SECRET`| Google OAuth client secret                           |
| `SESSION_SECRET`      | Random 32+ char secret for signing session cookies   |
| `FRONTEND_URL`        | Frontend origin (for CORS + OAuth redirect)          |
| `BACKEND_URL`         | Backend public URL (for OAuth callback URL)          |
| `GOOGLE_MAPS_API_KEY` | Google Places API key (optional — falls back to OSM) |
| `PORT`                | Port to listen on (default: 3001)                    |

## Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Set **Authorised redirect URIs** to: `https://your-domain.com/api/auth/google/callback`
4. Copy `Client ID` and `Client Secret` into `.env`

## Auth Flow

```
Browser → GET /api/auth/google → Google consent → GET /api/auth/google/callback
→ session cookie (HttpOnly, Secure, SameSite=Lax) → redirect to /dashboard
```

## API Reference

| Method | Path                           | Auth | Description                       |
|--------|--------------------------------|------|-----------------------------------|
| GET    | `/api/auth/google`             | -    | Initiate Google OAuth             |
| GET    | `/api/auth/google/callback`    | -    | OAuth callback                    |
| POST   | `/api/auth/logout`             | -    | Destroy session                   |
| GET    | `/api/auth/me`                 | ✓    | Current user                      |
| GET    | `/api/users/me`                | ✓    | User profile + location + prefs   |
| PUT    | `/api/users/me/location`       | ✓    | Save location                     |
| PUT    | `/api/users/me/preferences`    | ✓    | Save prayer preferences           |
| GET    | `/api/prayers/today`           | -    | Today's prayer times              |
| GET    | `/api/prayers/week`            | -    | 7-day schedule                    |
| GET    | `/api/prayers/month`           | ✓    | Monthly schedule                  |
| GET    | `/api/streaks/stats`           | ✓    | Current/best streak               |
| GET    | `/api/streaks/heatmap`         | ✓    | 365-day heatmap data              |
| GET    | `/api/streaks/:date`           | ✓    | Day completion                    |
| POST   | `/api/streaks/mark`            | ✓    | Mark a prayer done                |
| DELETE | `/api/streaks/mark`            | ✓    | Unmark a prayer                   |
| GET    | `/api/qibla?lat=&lng=`         | -    | Qibla direction                   |
| GET    | `/api/mosques?lat=&lng=`       | -    | Nearby mosques                    |

## Production (PM2)

```bash
npm run build
pm2 start ecosystem.config.cjs
```
