# MiraclBet Architecture

## System Overview

```
              MIRACLBET
                  │
        ┌─────────┴─────────┐
        │                   │
     NEXT.JS              GO API
     VERCEL              CONTABO
        │                   │
        └────── HTTPS ───────┤
                             ▼
                         SUPABASE
                        (PostgreSQL)
                             ▲
                             │
                         GO WORKER
                        (Contabo VPS)
                             │
                             ▼
                       FOOTBALL API
                   (7,500 req/day limit)
```

---

## Layers

### 1. Frontend — Next.js 15 (Vercel)

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Font**: Inter (Google Fonts)
- **Hosting**: Vercel (automatic CI/CD from Git)

The frontend communicates **only** with the Go API backend over HTTPS. It has no direct database access and no Football API credentials.

**Environment variables** (set in Vercel dashboard):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | `MiraclBet` |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |

---

### 2. Go API — Contabo VPS

- **Language**: Go 1.26
- **Router**: chi v5
- **Database driver**: pgx/v5
- **Port**: 8080 (proxied by Nginx on 443)
- **Process manager**: systemd

The API receives requests from the Next.js frontend (and mobile clients in future). It reads data from Supabase PostgreSQL and serves it as JSON.

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/sports` | List active sports |
| `GET` | `/api/v1/fixtures` | List fixtures (future) |

---

### 3. Go Worker — Contabo VPS

The Worker is a separate process that:
1. Runs on a **10-minute tick** (when `FOOTBALL_SYNC_ENABLED=true`)
2. Calls the external Football API (within quota)
3. Upserts data into Supabase
4. Tracks usage in `football_api_usage` table

**The Worker is the ONLY process that calls the external Football API.**

**Football API quota:** `7,500 requests/UTC day`

The quota is tracked atomically in PostgreSQL using an `ON CONFLICT` upsert pattern to prevent concurrent overflows.

---

### 4. Supabase PostgreSQL

Supabase provides:
- PostgreSQL database
- Connection pooling via Supavisor
- Row Level Security (RLS) — to be configured in next phase

**Core tables:**

| Table | Purpose |
|---|---|
| `users` | User accounts |
| `sports` | Sport types (Football, Basketball…) |
| `leagues` | Competition leagues |
| `teams` | Football clubs / teams |
| `fixtures` | Match fixtures |
| `markets` | Betting markets per fixture |
| `selections` | Outcomes within a market |
| `odds` | Odds history |
| `football_api_usage` | Daily API quota tracking |

---

### 5. Nginx — Contabo VPS

Nginx acts as a TLS-terminating reverse proxy:

```
Internet (443/HTTPS)
        │
      Nginx
        │
127.0.0.1:8080 (Go API)
```

SSL certificates are managed via **Let's Encrypt + Certbot**.

---

## Football Data Flow

```
External Football API
        │  HTTP (Go Worker only)
        ▼
    Go Worker
        │  pgx/v5
        ▼
   Supabase DB
        │  pgx/v5
        ▼
    Go API
        │  HTTPS/JSON
        ▼
   Next.js
        │  Browser
        ▼
     User
```

## Security Rules

1. `FOOTBALL_API_KEY` is NEVER exposed to the frontend
2. `DATABASE_URL` is NEVER in frontend code or environment
3. CORS is configured to allow only `NEXT_PUBLIC_SITE_URL`
4. JWT secrets rotate per environment
5. No wildcard CORS in production
