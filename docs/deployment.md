# MiraclBet Deployment Guide

## Infrastructure Overview

| Service | Provider | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploy from `main` branch |
| API + Worker | Contabo VPS | Ubuntu 22.04 LTS |
| Database | Supabase | Managed PostgreSQL |
| DNS + SSL | Cloudflare + Certbot | |

---

## 1. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database** and copy the connection string
3. Run migrations in order:

```bash
# Using psql or the Supabase SQL editor
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/002_football_api_usage.sql
```

4. Copy your credentials:
   - `SUPABASE_URL` → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → Service Role key (keep secret)
   - `DATABASE_URL` → Direct connection string (use pooled for production)

---

## 2. Contabo VPS Setup

### Initial Server Configuration

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y nginx certbot python3-certbot-nginx ufw

# 3. Configure firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 4. Create service user
sudo useradd -r -s /bin/false -d /opt/miraclbet miraclbet
sudo mkdir -p /opt/miraclbet/api/bin
sudo chown -R miraclbet:miraclbet /opt/miraclbet
```

### Build and Deploy the Go API

```bash
# On your build machine (or CI/CD):
cd apps/api
GOOS=linux GOARCH=amd64 go build -o bin/api ./cmd/api
GOOS=linux GOARCH=amd64 go build -o bin/worker ./cmd/worker

# SCP binaries to server
scp bin/api bin/worker user@YOUR_VPS_IP:/opt/miraclbet/api/bin/

# Create .env on server
scp .env.example user@YOUR_VPS_IP:/opt/miraclbet/api/.env
# Then edit .env on the server with real values
ssh user@YOUR_VPS_IP "nano /opt/miraclbet/api/.env"
```

### Configure Systemd Services

```bash
# Copy service files
sudo cp deployment/systemd/miraclbet-api.service /etc/systemd/system/
sudo cp deployment/systemd/miraclbet-worker.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable miraclbet-api miraclbet-worker
sudo systemctl start miraclbet-api miraclbet-worker

# Check status
sudo systemctl status miraclbet-api
sudo journalctl -u miraclbet-api -f
```

### Configure Nginx

```bash
# Edit the domain in the config
sudo cp deployment/nginx/api.conf /etc/nginx/sites-available/miraclbet-api
# Replace YOUR_DOMAIN.com with your actual domain
sudo sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' /etc/nginx/sites-available/miraclbet-api

sudo ln -s /etc/nginx/sites-available/miraclbet-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate

```bash
sudo certbot --nginx -d api.yourdomain.com
# Follow prompts — Certbot auto-renews via cron
```

---

## 3. Vercel Frontend Deployment

1. Push code to GitHub/GitLab
2. Connect the repo in [vercel.com](https://vercel.com)
3. Set **Root Directory** to `apps/web`
4. Add environment variables in Vercel dashboard:

```
NEXT_PUBLIC_APP_NAME=MiraclBet
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

5. Deploy — Vercel auto-builds on every push to `main`

---

## 4. Environment Variables Reference

### Backend (`apps/api/.env`)

| Variable | Required | Description |
|---|---|---|
| `APP_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | HTTP port (default: 8080) |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (secret) |
| `JWT_SECRET` | Yes | Random secret for JWT signing |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated allowed origins |
| `FOOTBALL_API_BASE_URL` | Later | Football data provider URL |
| `FOOTBALL_API_KEY` | Later | Football API key (never expose) |
| `FOOTBALL_API_DAILY_LIMIT` | No | Default: 7500 |
| `FOOTBALL_SYNC_ENABLED` | No | Set `true` to enable worker sync |

### Frontend (`apps/web/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Yes | App name (shown in UI) |
| `NEXT_PUBLIC_API_URL` | Yes | Go API base URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | Frontend URL (for OG tags etc.) |

---

## 5. Football API Quota Management

The system is designed to never exceed **7,500 Football API requests/UTC day**:

1. Quota is tracked in the `football_api_usage` PostgreSQL table
2. Every request by the Worker atomically increments the counter
3. A DB-level `CHECK` constraint prevents the count from exceeding the daily limit
4. The Worker checks quota before making any requests
5. When quota is exhausted, sync is skipped until the next UTC day

To check today's usage:
```sql
SELECT usage_date, request_count, daily_limit, last_requested_at
FROM football_api_usage
WHERE usage_date = CURRENT_DATE;
```

---

## 6. Monitoring

View API logs:
```bash
sudo journalctl -u miraclbet-api -f
```

View Worker logs:
```bash
sudo journalctl -u miraclbet-worker -f
```

Health check:
```bash
curl https://api.yourdomain.com/health
```

---

## 7. Updates / Re-deployment

```bash
# Build new binary
cd apps/api
GOOS=linux GOARCH=amd64 go build -o bin/api ./cmd/api

# Deploy
scp bin/api user@YOUR_VPS_IP:/opt/miraclbet/api/bin/api

# Restart service (zero-downtime swap)
sudo systemctl restart miraclbet-api
```
