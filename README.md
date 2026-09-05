# MiraclBet 🎯

**Sports Betting Platform — Project Foundation**

> Clean monorepo foundation for MiraclBet. Frontend on Vercel, API + Worker on Contabo VPS, Database on Supabase.

---

## Architecture

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
                             ▲
                             │
                         GO WORKER
                             │
                             ▼
                       FOOTBALL API
                    (7,500 req/day limit)
```

**The frontend NEVER calls the Football API directly.**

---

## Stack

| Layer | Technology | Host |
|---|---|---|
| Frontend | Next.js 15 (App Router, TypeScript, Tailwind) | Vercel |
| API | Go (chi, pgx) | Contabo VPS |
| Worker | Go (Football sync) | Contabo VPS |
| Database | Supabase PostgreSQL | Supabase |
| Reverse Proxy | Nginx | Contabo VPS |

---

## Monorepo Structure

```
miraclbet/
├── apps/
│   ├── web/         # Next.js frontend
│   └── api/         # Go backend API + Worker
├── deployment/
│   ├── nginx/       # Nginx config templates
│   └── systemd/     # Systemd service files
├── docs/
│   ├── architecture.md
│   └── deployment.md
├── .gitignore
├── package.json
└── README.md
```

---

## Quick Start

### Frontend

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

### Backend API

```bash
cd apps/api
cp .env.example .env
go mod tidy
go run ./cmd/api
# → http://localhost:8080
```

### Worker

```bash
cd apps/api
go run ./cmd/worker
```

---

## Development Status

This is the **project foundation**. The following are NOT yet implemented:

- ❌ Real-money payment processing
- ❌ Complete betting engine
- ❌ Bet settlement
- ❌ Wallet system
- ❌ KYC
- ❌ Admin dashboard
- ❌ Complete Football sync

See `docs/` for architecture and deployment guides.

---

## Football API Quota

The external Football API is limited to **7,500 requests/UTC day**.

- Quota is tracked in the `football_api_usage` database table
- Only the Go Worker accesses the Football API
- The frontend never has API credentials

---

*MiraclBet © 2026*
