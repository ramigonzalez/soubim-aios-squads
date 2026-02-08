# Deployment Architecture - DecisionLog

**Document ID:** architecture/deployment
**Version:** 1.0
**Status:** Complete
**Owner:** @devops

---

## Overview

Complete deployment specification including infrastructure, CI/CD pipelines, monitoring, and operational procedures.

**Budget:** $25-35/month MVP
**Uptime Target:** 99%+ availability
**RPO/RTO:** Data backup 7-day retention, <1 hour recovery

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT TOPOLOGY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  GitHub Repository (decision-log-backend)          │     │
│  │  ├── Push to main                                  │     │
│  │  └── Trigger GitHub Actions                        │     │
│  └────────────────────┬─────────────────────────────┘     │
│                       │ CI Pipeline                         │
│  ┌────────────────────▼─────────────────────────────┐     │
│  │  GitHub Actions (Test, Lint, Build)              │     │
│  │  ├── pytest (unit + integration tests)            │     │
│  │  ├── ruff (linting)                               │     │
│  │  └── Docker image build                           │     │
│  └────────────────────┬─────────────────────────────┘     │
│                       │ Deploy                               │
│  ┌────────────────────▼─────────────────────────────┐     │
│  │  Railway/Render (Production)                      │     │
│  │  ├── Python FastAPI app                           │     │
│  │  ├── 512MB RAM, 0.5 vCPU (can scale)             │     │
│  │  ├── Auto-restart on crash                        │     │
│  │  └── Health checks: GET /api/health               │     │
│  └──────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  GitHub Repository (decision-log-frontend)         │     │
│  │  ├── Push to main                                  │     │
│  │  └── Vercel GitHub integration                     │     │
│  └────────────────────┬─────────────────────────────┘     │
│                       │ Auto-build                           │
│  ┌────────────────────▼─────────────────────────────┐     │
│  │  Vercel (Production)                              │     │
│  │  ├── Next.js/Vite build                           │     │
│  │  ├── Global CDN (60+ edge locations)              │     │
│  │  ├── Deploy previews for PRs                      │     │
│  │  └── Automatic rollback on failure                │     │
│  └──────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Supabase (Database)                               │     │
│  │  ├── PostgreSQL 15 + pgvector                      │     │
│  │  ├── Auto-backup (daily, 7-day retention)         │     │
│  │  ├── SSL connection required                       │     │
│  │  └── Connection pooling (PgBouncer)               │     │
│  └──────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Sentry (Error Tracking)                           │     │
│  │  ├── Backend exception monitoring                  │     │
│  │  ├── Frontend error tracking                       │     │
│  │  ├── Performance monitoring                        │     │
│  │  └── Alert on critical errors                      │     │
│  └──────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Components

### Backend Hosting (Railway or Render)

| Aspect | Details |
|--------|---------|
| Provider | Railway or Render |
| Runtime | Python 3.11 + Docker |
| Resources | 512MB RAM, 0.5 vCPU, 1GB disk |
| Cost | $10-20/month |
| Scaling | Horizontal (add more instances if needed) |
| Health Check | GET /api/health (every 30 sec) |
| Restart | Auto-restart on crash, max 3 attempts |
| Logs | Streamed to provider console |

**Dockerfile (Backend)**

```dockerfile
# decision-log-backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

# Expose port
EXPOSE 8000

# Run migrations and start app
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### Frontend Hosting (Vercel)

| Aspect | Details |
|--------|---------|
| Provider | Vercel (free tier) |
| Build Tool | Vite |
| Runtime | Node.js 18 |
| Cost | Free |
| CDN | Global edge network (60+ locations) |
| Deployments | Auto-deploy on push to main |
| Previews | PR preview deployments |
| Rollback | Automatic on build failure |

### Database (Supabase - PostgreSQL + pgvector)

| Aspect | Details |
|--------|---------|
| Provider | Supabase |
| Database | PostgreSQL 15 |
| Storage | 500MB (free tier) → 1-8GB (paid) |
| Backup | Daily snapshots, 7-day retention |
| Connection | SSL required, PgBouncer pooling |
| Cost | Free tier suitable for MVP |
| Upgrade Path | $25/month for 8GB + better SLA |

**Connection String Format:**

```
postgresql://postgres:[password]@db.[region].supabase.co:5432/postgres?sslmode=require
```

### Error Tracking (Sentry)

| Aspect | Details |
|--------|---------|
| Provider | Sentry (free tier) |
| Capacity | 5K errors/month |
| Features | Error tracking, performance monitoring |
| Alerts | Email on critical errors |
| Cost | Free tier |
| Upgrade | $29/month for unlimited |

---

## CI/CD Pipeline

### GitHub Actions Workflow (Backend)

**File:** `.github/workflows/backend-deploy.yml`

```yaml
name: Backend Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          JWT_SECRET_KEY: test_secret_key
        run: |
          pytest --cov=app --cov-report=xml tests/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml

      - name: Lint with ruff
        run: |
          pip install ruff
          ruff check app/ --exit-zero

      - name: Type check with mypy
        run: |
          pip install mypy
          mypy app/ --ignore-missing-imports || true

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Build Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          tags: decision-log-backend:latest
          push: false

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: railway-cli/action@v1
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        with:
          project-id: ${{ secrets.RAILWAY_PROJECT_ID }}
          service: decision-log-backend

      - name: Notify Slack (optional)
        uses: slackapi/slack-github-action@v1
        if: always()
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🚀 Backend deployment ${{ job.status }} on ${{ github.ref }}"
            }
```

### Frontend (Vercel)

**Setup:**
1. Connect GitHub repo to Vercel (automatic)
2. Configure build settings:
   - Build command: `npm run build`
   - Install command: `npm ci`
   - Output directory: `dist`

**Environment Variables (in Vercel Dashboard):**
```
VITE_API_BASE_URL=https://api.decisionlog.io/api
VITE_SENTRY_DSN=https://...@sentry.io/...
```

Vercel automatically:
- Builds on every push to main
- Creates preview deployments for PRs
- Rolls back on build failure
- Serves via global CDN

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@db.supabase.co/postgres

# Authentication
JWT_SECRET_KEY=<256-bit random hex string>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=168

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Tactiq Webhook
TACTIQ_WEBHOOK_SECRET=whsec_...

# Error Tracking
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=["https://app.decisionlog.io"]
```

### Frontend (.env)

```bash
# API
VITE_API_BASE_URL=https://api.decisionlog.io/api

# Error Tracking
VITE_SENTRY_DSN=https://...@sentry.io/...
```

**How to set (Railway):**

```bash
railway env set DATABASE_URL postgresql://...
railway env set JWT_SECRET_KEY $(openssl rand -hex 32)
railway env set ANTHROPIC_API_KEY sk-ant-...
```

---

## Deployment Checklist

### Pre-Deployment (Manual)

- [ ] All tests passing (CI must pass)
- [ ] Code review approved
- [ ] Database migrations tested locally
- [ ] Environment variables configured in provider
- [ ] Secrets securely stored (no hardcoding)
- [ ] Performance tested (load test optional for MVP)
- [ ] Rollback procedure documented

### Deployment Steps (Automated via GitHub Actions)

1. Push to main branch
2. GitHub Actions runs tests
3. If tests pass:
   - Build Docker image (backend)
   - Deploy to Railway/Render
   - Run migrations
   - Health check passes
4. Frontend auto-deploys via Vercel
5. Verify both backends up: `curl https://api.decisionlog.io/api/health`

### Post-Deployment (Manual)

- [ ] Smoke tests: Login, view projects, see decisions
- [ ] Check error monitoring (Sentry)
- [ ] Verify database connections working
- [ ] Check API response times (<200ms p95)
- [ ] Monitor logs for errors (1 hour)
- [ ] Have rollback plan ready

### Rollback Procedure

**If critical issue:**

1. **Backend:** Push hotfix to main, GitHub Actions auto-deploys
   - Or manually: `railway deploy --service decision-log-backend` (requires Railway CLI)
2. **Frontend:** Push hotfix to main, Vercel auto-deploys
   - Or manually: Vercel dashboard → Previous deployment → Promote

**Database:** Never auto-rollback. Manual recovery if needed:
```bash
# Via Supabase dashboard: Database → Backups → Restore
# Or contact Supabase support
```

---

## Monitoring & Observability

### Health Checks

**Backend Health Endpoint:**

```python
# app/api/routes/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
```

**Configure in Railway:**
- URL: https://api.decisionlog.io/api/health
- Interval: 30 seconds
- Timeout: 10 seconds
- Failure threshold: 3 attempts before restart

### Error Tracking (Sentry)

**Backend Integration:**

```python
# app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment=settings.ENVIRONMENT
)
```

**Frontend Integration:**

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1
});
```

### Metrics & Logging

**Railway Metrics:**
- CPU usage
- Memory usage
- Request count
- Error rate
- Response time

**View in Railway Dashboard:**
- Analytics → Deployments
- Logs → Real-time streaming
- Metrics → CPU/Memory graphs

### Log Aggregation (Optional - Phase 2)

```python
# Structured logging for better analysis
import structlog

logger = structlog.get_logger()

logger.info(
    "decision_extracted",
    transcript_id=transcript.id,
    decisions_count=len(decisions),
    cost_usd=0.10,
    latency_ms=elapsed_time
)
```

---

## Cost Breakdown

| Component | Cost/Month | Details |
|-----------|-----------|---------|
| Railway/Render (Backend) | $10-20 | 512MB RAM, 0.5 vCPU |
| Vercel (Frontend) | Free | Within free tier |
| Supabase (Database) | Free | 500MB, free tier |
| Sentry (Error Tracking) | Free | 5K errors/month |
| Claude API (40 meetings) | $6-10 | $0.15-0.25 per meeting |
| Domain (optional) | $1 | $12/year amortized |
| **TOTAL** | **$18-31** | ✅ Within $25-35 budget |

**Cost Saving Tips:**
- Use Supabase free tier (no paid database needed for MVP)
- Monitor Claude API usage (potential bottleneck)
- Batch decisions for processing (reduce API calls)
- Cache API responses (React Query handles this)

---

## Disaster Recovery

### Backup Strategy

**Database:**
- Supabase auto-backup: Daily, 7-day retention (free)
- Upgrade to paid: 30-day retention, on-demand backups
- Manual backup: `pg_dump postgresql://... > backup.sql`

**Application Code:**
- GitHub as source of truth (automatic backup)
- All configuration in environment variables (not in code)

**Recovery Time Objectives (RTO):**
- Database corruption: <1 hour (restore from daily backup)
- Application crash: <5 minutes (auto-restart by Railway)
- Data loss: <1 week (restore from 7-day backup retention)

### Incident Response Plan

1. **Error detected** → Sentry alert
2. **Investigation** → Check logs, determine severity
3. **If critical:**
   - Immediate hotfix deployment
   - Or rollback to previous version
4. **If database issue:**
   - Contact Supabase support
   - Restore from backup if needed
5. **Post-mortem** → Document and prevent recurrence

---

## Performance Optimization

### Frontend (Vercel)

```bash
# Build optimizations included in Vite
# - Code splitting
# - Tree shaking
# - Minification
# - Source maps (for debugging)

# Measure Web Vitals
# Check in Vercel Analytics dashboard
# - LCP (Largest Contentful Paint)
# - FID (First Input Delay)
# - CLS (Cumulative Layout Shift)
```

### Backend (Railway)

```python
# Performance monitoring
from sqlalchemy import event
from sqlalchemy.engine import Engine
import time

@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, params, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, params, context, executemany):
    total_time = time.time() - conn.info['query_start_time'].pop(-1)
    if total_time > 0.5:  # Alert on slow queries
        logger.warning("slow_query", duration_ms=total_time*1000, sql=statement[:100])
```

### Database (Supabase)

```sql
-- Monitor slow queries
SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE mean_time > 100  -- queries taking >100ms
ORDER BY mean_time DESC;
```

---

## Success Criteria

✅ Backend deploys in <5 minutes
✅ Frontend deploys in <3 minutes
✅ 99%+ uptime (production)
✅ API response time <200ms (p95)
✅ Zero data loss (backup retention)
✅ Automatic health checks + restart
✅ Error monitoring + alerting
✅ Cost within $25-35/month budget
✅ Rollback capability within 5 minutes

---

**Document Status:** Complete
**Last Updated:** 2026-02-07
**Next:** Security Specification

— Aria, arquitetando o futuro 🏗️
