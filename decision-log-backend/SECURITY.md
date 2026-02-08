# Security Considerations - DecisionLog Backend

## Authentication & Authorization

### JWT Token Model (Stateless)

**Current Implementation:** DecisionLog uses stateless JWT tokens with a 7-day expiration.

#### How It Works:
- User logs in → Server issues JWT token (expires in 7 days)
- Client stores token in localStorage
- Client sends token with each request via `Authorization: Bearer <token>` header
- Server validates token signature and expiration

#### Important Security Implications:

⚠️ **Logout Does NOT Invalidate Tokens**

The `/auth/logout` endpoint is a **client-side logout only**. When a user logs out:
- ✅ The endpoint validates the token is still valid
- ✅ The client should delete the token from localStorage
- ❌ The token continues to work until expiration (up to 7 days)
- ❌ Server cannot revoke the token

**Why?** JWTs are stateless - the server doesn't track issued tokens, making logout instant but allowing tokens to work until they expire.

**Mitigation for Phase 2:**
- Implement token blacklist using Redis (fast lookup)
- Store revoked token JTI in database with expiration TTL
- Add refresh token rotation for shorter-lived access tokens

---

## Demo Mode Security

✅ **FIXED:** Demo Mode Now Requires Environment Variable

**Implementation:** Database seeding (which creates test users with password "password") now requires `DEMO_MODE=true`.

**Location:** `app/database/seed.py`

**Security:**
- ✅ `DEMO_MODE` defaults to `false` (safe by default)
- ✅ Seed script exits immediately if `DEMO_MODE != true`
- ✅ Production deployments won't create demo accounts unless explicitly enabled

**Development Usage:**
```bash
export DEMO_MODE=true
python -m app.database.seed
```

---

## Rate Limiting

✅ **IMPLEMENTED:** Login Rate Limiting (Phase 1)

**Implementation:** In-memory rate limiting for `/auth/login` endpoint.

**Location:** `app/api/middleware/rate_limit.py`

**Protection:**
- ✅ Login endpoint: **5 attempts per 15 minutes per IP**
- ✅ Returns HTTP 429 (Too Many Requests) when limit exceeded
- ✅ Includes `Retry-After` header for client guidance
- ✅ Sliding window algorithm prevents burst attacks

**Current Limitations:**
- ⚠️ In-memory only (doesn't persist across restarts)
- ⚠️ Single-instance only (won't work with load balancing)

**Recommendation for Phase 2:**
- Migrate to Redis-backed rate limiting for distributed deployments
- Add email-based rate limiting (track by email in addition to IP)
- Implement CAPTCHA after 3 failed attempts
- Add global API rate limiting (100 req/min per IP)

**Testing:**
```bash
# Try 6 login requests in a row - 6th will be rate limited
for i in {1..6}; do
  curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  sleep 1
done
```

---

## Password Security

✅ **Currently Implemented:**
- Passwords hashed using bcrypt (industry standard)
- Salted automatically by bcrypt
- Hashing work factor: 12 rounds

---

## Soft Delete (User Deactivation)

✅ **Currently Implemented:**
- Deleted users have `deleted_at` timestamp set
- Soft-deleted users cannot log in
- Data retained for audit/recovery purposes

---

## Database Security

✅ **Currently Implemented:**
- SQLAlchemy ORM prevents SQL injection
- Parameterized queries throughout
- PostgreSQL role-based access control

⚠️ **Missing:**
- Database connection encryption (should use SSL in production)
- Secrets management (use environment variables, not hardcoded)

---

## CORS Configuration

✅ **Currently Implemented:**
- CORS origins configurable via environment variable
- Default: `["http://localhost:5173", "http://localhost:3000"]`

⚠️ **Production Checklist:**
- Set `CORS_ORIGINS` to production frontend domains only
- Never use `origins=["*"]` in production

---

## Environment Variables

**Critical Secrets:**
- `JWT_SECRET_KEY` - Must be at least 32 random characters
- `DATABASE_URL` - Contains database credentials
- `ANTHROPIC_API_KEY` - API access token
- `TACTIQ_WEBHOOK_SECRET` - Webhook validation

**Security Best Practices:**
- ✅ Never commit `.env` to version control (`.env` is in `.gitignore`)
- ✅ Use different secrets for dev/staging/production
- ❌ Rotate secrets regularly (not currently implemented)

---

## Known Vulnerabilities & Mitigation Timeline

| Issue | Severity | Status | Target | Fixed |
|-------|----------|--------|--------|-------|
| Logout doesn't invalidate JWT | Medium | Documented | Phase 2 | - |
| Demo mode always enabled | **HIGH** | ✅ **FIXED** | Phase 1 | 2026-02-08 |
| No rate limiting (login) | High | ✅ **FIXED** | Phase 1 | 2026-02-08 |
| Rate limiting (global API) | Medium | Backlog | Phase 2 | - |
| No refresh token rotation | Medium | Backlog | Phase 2 | - |
| No 2FA support | Low | Backlog | Phase 3 | - |

---

## Responsible Disclosure

If you discover a security vulnerability, please email: security@decisionlog.example.com

**DO NOT** open a public GitHub issue for security vulnerabilities.

---

Last Updated: 2026-02-08
Version: 1.0.0
