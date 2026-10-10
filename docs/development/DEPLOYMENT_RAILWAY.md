# Deploying DecisionLog on Railway (API + Worker + Postgres)

Story 13.8. Config is in the repo; the deploy itself is a manual, one-time setup in the Railway dashboard. Variable **names only** are listed here — never put values in git.

Topology: three services in one Railway project.

| Service | Source | Start command | Notes |
|---|---|---|---|
| `postgres` | Railway **pgvector** template | n/a | Migrations need the `vector` extension |
| `api` | this repo, `decision-log-backend/` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Healthcheck `/health`; runs `alembic upgrade head` before each deploy |
| `worker` | same repo, same Dockerfile | `python -m app.worker` | No HTTP, no domain |

The frontend is deployed separately on Netlify (`decision-log-frontend/netlify.toml`; Rami chose Netlify over Vercel on 2026-10-09).

## 0. Before anything: rotate the leaked Anthropic key

`decision-log-backend/.env.development` was tracked in git and contained a real Anthropic key; it is in the history on GitHub. Story 13.8 untracks the file but **does not remove it from history**.

1. In the Anthropic Console, revoke that key and create a new one (this is the one that goes into Railway).
2. Put the new key only in Railway variables and your local, untracked `.env.development`.
3. Optional: scrub history (`git filter-repo`) — not needed once the key is revoked.

Local setup after pulling this change: your `.env.development` stays on disk (now gitignored). New machines: copy `decision-log-backend/.env.development.example`.

## 1. Create the project and Postgres

1. Railway dashboard -> New Project -> **Deploy a template** -> search **pgvector** (Postgres with the pgvector extension). Name the service `postgres`.
2. Why pgvector and not plain Postgres: `project_items.embedding` is a `vector` column (Similar tab / meaning search). Migration `001_initial` runs `CREATE EXTENSION "vector"`, so migrations fail on a Postgres image without it.

## 2. API service

1. New -> GitHub Repo -> select this repo.
2. Settings:
   - **Root Directory:** `decision-log-backend`
   - **Config as Code -> Config Path:** `/decision-log-backend/railway.toml` (build = Dockerfile, healthcheck `/health`, pre-deploy `alembic upgrade head`, start command with `$PORT`)
3. Variables tab (see section 4).
4. Settings -> Networking -> **Generate Domain** (or add a custom domain, section 5).

## 3. Worker service

1. New -> GitHub Repo -> the same repo again (second service).
2. Settings: Root Directory `decision-log-backend`, Config Path `/decision-log-backend/railway.worker.toml` (start command `python -m app.worker`, no healthcheck, restart always). Alternative without the file: set Custom Start Command to `python -m app.worker`.
3. Variables: same as the API (use Railway shared variables or reference variables so both stay in sync). No public domain.
4. Do not give the worker the migration command: the API's pre-deploy owns migrations. On first deploy, deploy the API first so the schema exists.

## 4. Variables (names only)

Set on **both** `api` and `worker` unless noted.

- Database: `DATABASE_URL` -> reference the Postgres service: `${{postgres.DATABASE_URL}}` (use the private-network URL)
- Auth: `JWT_SECRET_KEY` (>= 32 random chars: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`), `JWT_ALGORITHM`, `JWT_EXPIRATION_MINUTES`
- LLM: `ANTHROPIC_API_KEY` (**the rotated one**), `LLM_MODEL`, `EXTRACTION_MAX_TOKENS`, `EXTRACTION_EFFORT`
- Webhooks: `TACTIQ_WEBHOOK_SECRET` (currently required by `Settings`)
- Fathom (13.3): `FATHOM_CLIENT_ID`, `FATHOM_CLIENT_SECRET`, `FATHOM_REDIRECT_URI` (both: the worker refreshes tokens for 13.4 imports); `FRONTEND_URL` (API: the frontend origin the OAuth callback redirects back to)
- Google sign-in (12.8, API only, optional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` = `https://<api-domain>/api/auth/google/callback` (identical to an Authorized redirect URI of the Google OAuth client); uses `FRONTEND_URL` too
- Storage (once 13.1 decides the provider): `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`
- `TOKEN_ENCRYPTION_KEY` (both): Fernet key encrypting stored Fathom tokens (`python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`). Keep it stable: a new key makes stored tokens unreadable and every user must reconnect.
- Runtime: `ENVIRONMENT=production`, `DEBUG=false`, `DEMO_MODE=false` (or unset), `WORKER_POLL_SECONDS` (worker only)
- `CORS_ORIGINS` (API): see below
- Optional: `SENTRY_DSN`
- Rate limiting (13.11), API only: `RATE_LIMIT_STORAGE_URI`, `TRUSTED_PROXY=true`, optionally `RATE_LIMIT_ENABLED`, `RATE_LIMIT_*` (see the section below).
- `PORT` is injected by Railway; do not set it.

`ENVIRONMENT=production` matters: only `development`/`test` run `create_all` and seed demo users at startup (they would create `test@example.com` / `password`). In production the schema comes only from Alembic.

`DEBUG=false` matters too: with `DEBUG=true` a failed DB init at startup is swallowed instead of crashing the deploy.

### Rate limiting (Story 13.11)

The API limits requests with `slowapi` (counters in the `limits` package). Defaults (per minute unless noted; each is a variable, e.g. `RATE_LIMIT_LOGIN_IP=30/minute`):

| Scope | Key | Variable | Default |
|-------|-----|----------|---------|
| `POST /api/auth/login` | IP | `RATE_LIMIT_LOGIN_IP` | 30/minute |
| `POST /api/auth/login` | email | `RATE_LIMIT_LOGIN_EMAIL_MINUTE`, `RATE_LIMIT_LOGIN_EMAIL_HOUR` | 5/minute and 20/hour |
| `/api/invitations/public/*` | IP | `RATE_LIMIT_INVITATION` | 10/minute |
| `/api/fathom/callback` | IP | `RATE_LIMIT_OAUTH_CALLBACK` | 20/minute |
| Webhooks (`/api/fathom/webhook/{id}`, `/api/webhooks/*`) | connection id / IP | `RATE_LIMIT_WEBHOOK` | 120/minute |
| `/api/shared/*`, `/api/recordings/*` | IP | `RATE_LIMIT_PUBLIC_LINK` | 60/minute |
| Rest of `/api/*` | user id (valid JWT), else IP | `RATE_LIMIT_DEFAULT` | 600/minute |
| `/api/health`, `/docs`, `/openapi.json` | exempt | | |

Over the limit: `429`, `Retry-After` header, JSON `detail`.

- **More than one API instance (or any redeploy that must not reset counters):** add a Redis service and set `RATE_LIMIT_STORAGE_URI=redis://...` on the API. Without it counters live in each instance's memory, so the effective limit is `limit x instances`, and they reset on restart. If Redis is unreachable the limiter fails open (requests pass, error logged).
- **`TRUSTED_PROXY=true`** on Railway: the API then reads the client IP from `X-Forwarded-For`, taking the entry `TRUSTED_PROXY_HOPS` (default 1) from the right, i.e. the one Railway's edge appended; anything the client put on the left is ignored. Leave it unset anywhere the API is reachable without the proxy, otherwise clients could pick their own IP. Without it every request would share Railway's proxy IP, so set it before relying on per-IP limits.
- `RATE_LIMIT_ENABLED=false` turns everything off (tests, local debugging).

### CORS

Origins come from `CORS_ORIGINS` (`app/config.py`, passed to `CORSMiddleware` in `app/main.py`). It is parsed as a JSON list. Production value, exactly the frontend origin(s) with scheme and no trailing slash:

```
CORS_ORIGINS=["https://<your-frontend-domain>"]
```

Add the Netlify deploy-preview domain only if you want previews to call production.

## 5. Domain and Fathom redirect URL

1. API service -> Networking -> Generate Domain (`https://<name>.up.railway.app`) or add a custom domain (e.g. `api.<yourdomain>`; add the CNAME Railway shows). The custom domain purchase is out of scope for this story.
2. In the Fathom developer app settings, replace the localhost redirect with `https://<api-domain>/api/fathom/callback` and set `FATHOM_REDIRECT_URI` to the identical string. They must match exactly.
3. The Fathom webhook URL (13.9) is also `https://<api-domain>/...`.
4. Set `VITE_API_BASE_URL=https://<api-domain>/api` in Netlify (Site configuration → Environment variables) and redeploy.

## 6. First deploy checklist

1. Postgres service is up (pgvector template).
2. Deploy `api`: watch the pre-deploy log for `alembic upgrade head` finishing, then the healthcheck on `/health` going green.
3. Deploy `worker`: logs should show it polling the `jobs` table.
4. `curl https://<api-domain>/health` -> `{"status":"ok",...}`.
5. Create the first real user: **there is no user-creation endpoint or script yet** (only login). Until one exists, insert the user with SQL via `railway connect postgres` (password hash from `app.utils.security.hash_password`). Tracked as a gap in Story 13.8.
6. Confirm `test@example.com` does not exist.

## 7. Backups

Railway Postgres has volume backups in the service's **Backups** tab (available on paid plans): enable a daily schedule. Additionally take a logical dump before risky migrations:

```
pg_dump "$DATABASE_PUBLIC_URL" -Fc -f decisionlog-$(date +%F).dump
```

Restore into a fresh pgvector database with `pg_restore --no-owner -d <url> file.dump`. Do a restore drill once before real data goes in. Recordings live in object storage (13.1), which has its own durability/versioning settings.

## 8. Rollback

- **Bad code:** API service -> Deployments -> pick the last good deployment -> Redeploy/Rollback. Rolling back code does not roll back the schema.
- **Bad migration:** `alembic upgrade head` runs before the new version goes live, and a failure aborts the deploy (the old version keeps serving). If a migration succeeded but must be undone, run `railway run alembic downgrade -1` against the production service (only if the migration has a working `downgrade`), or restore the pre-migration dump/backup.
- Make migrations backward compatible (add columns before using them) so code rollback stays safe.
- **Worker:** redeploy independently; jobs claimed by a dead worker are reclaimed by the stale-job check (13.2).

## 9. Local container check

```
cd decision-log-backend
docker build -t decisionlog-backend .
docker run --rm -p 8099:8000 --env-file .env.development -e ENVIRONMENT=production decisionlog-backend
# worker: add `python -m app.worker` as the command
```

## Cost expectation

About $5-20/month at pilot scale (small API + worker + Postgres). GPU transcription runs elsewhere (14.1).
