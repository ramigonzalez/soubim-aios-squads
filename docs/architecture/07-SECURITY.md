# Security Architecture - DecisionLog

**Document ID:** architecture/security
**Version:** 1.0
**Status:** Complete
**Owner:** @architect with @devops

---

## Overview

Comprehensive security specification covering authentication, authorization, data protection, and compliance.

**Security Goals:**
- Protect user credentials and session data
- Prevent unauthorized access to project decisions
- Ensure data integrity and confidentiality
- Compliance with architectural firm data practices
- OWASP Top 10 mitigation

---

## Authentication

### JWT-Based Authentication

**Flow:**

```
1. User submits email + password
   ↓
2. Backend validates against users table (bcrypt password hash)
   ↓
3. If valid:
   - Generate JWT token (HS256, 7-day expiration)
   - Return token + user info
   ↓
4. Frontend stores token in memory (Zustand) + localStorage
   ↓
5. All API requests include: Authorization: Bearer <token>
   ↓
6. Backend middleware validates JWT on every protected route
```

**Implementation:**

```python
# app/utils/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password with bcrypt (cost=12)."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext against hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create JWT access token."""
    to_encode = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=168)  # 7 days
    }
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm="HS256"
    )

def decode_access_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except JWTError:
        raise ValueError("Invalid token")
```

**Token Structure:**

```json
{
  "sub": "user_uuid",
  "email": "gabriela@soubim.com",
  "role": "director",
  "exp": 1707225600
}
```

**Password Policy:**

- Minimum 8 characters
- Must contain uppercase + lowercase + number + special char
- Never stored plaintext (always bcrypt hashed, cost=12)
- Never logged or transmitted unencrypted
- Must be changed on first login
- Password reset via email (with 1-hour token expiration)

---

## Authorization (Role-Based Access Control)

### User Roles

```python
class UserRole(str, Enum):
    DIRECTOR = "director"      # Gabriela - sees all projects
    ARCHITECT = "architect"    # Team members - sees assigned projects
    CLIENT = "client"          # Phase 2 - sees own project only
```

### Access Control Matrix

| Resource | Director | Architect | Client |
|----------|----------|-----------|--------|
| View all projects | ✅ | ❌ | ❌ |
| View assigned projects | ✅ | ✅ | ✅ |
| View decisions in project | ✅ | ✅ | ✅ (own) |
| View executive digest | ✅ | ❌ | ❌ |
| Approve decisions | ✅ | ❌ | ❌ |
| Edit decision metadata | ✅ | ✅ | ❌ |
| Manage project members | ✅ | ❌ | ❌ |

### Implementation

```python
# app/api/middleware/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security)
) -> User:
    """Extract and validate JWT from request."""
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token")

        # Fetch user from database
        async with async_session() as session:
            user = await session.execute(
                select(User).where(User.id == UUID(user_id))
            )
            user = user.scalar_one_or_none()
            if not user:
                raise ValueError("User not found")
            return user

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_project_access(
    project_id: str,
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify user has access to project."""

    # Directors have universal access
    if current_user.role == UserRole.DIRECTOR:
        return current_user

    # Check project membership
    async with async_session() as session:
        membership = await session.execute(
            select(ProjectMember).where(
                and_(
                    ProjectMember.project_id == UUID(project_id),
                    ProjectMember.user_id == current_user.id
                )
            )
        )
        if not membership.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
        return current_user

# In route handler
@router.get("/projects/{project_id}/decisions")
async def get_decisions(
    project_id: str,
    user: User = Depends(require_project_access)
):
    # Safe to return decisions for this project
    pass
```

---

## Data Protection

### Transport Security

```
✅ HTTPS/TLS 1.3 enforced everywhere
   - All API endpoints require HTTPS
   - Frontend redirects HTTP → HTTPS
   - HSTS header: Strict-Transport-Security: max-age=31536000

✅ Certificate management (automatic)
   - Vercel: Auto-renew LetsEncrypt certificates
   - Railway: Auto-renew HTTPS certificates
   - Supabase: Managed SSL connection
```

### Data at Rest

```python
# PostgreSQL
✅ Database encryption (optional, on paid Supabase tier)
✅ SSL connection required: sslmode=require
✅ No plaintext backups (automatic encryption by Supabase)

# Passwords
✅ bcrypt hashing with cost=12 (2^12 iterations)
✅ Never stored plaintext
✅ Never logged

# Sensitive fields
✅ JWT secrets (256-bit random)
✅ API keys (stored in environment, never in code)
✅ Webhook secrets (HMAC verification)
```

### Access Control (Database Level)

```sql
-- Minimal permissions
CREATE USER api_user WITH PASSWORD 'strong_random_password';

-- Grant only necessary tables
GRANT SELECT, INSERT, UPDATE ON users TO api_user;
GRANT SELECT, INSERT, UPDATE ON projects TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON decisions TO api_user;

-- Prevent direct access to user passwords
REVOKE SELECT ON users(password_hash) FROM api_user;
```

---

## Input Validation & Output Encoding

### OWASP Top 10 Mitigation

#### 1. SQL Injection Prevention

```python
# ✅ SAFE: Use SQLAlchemy ORM (parameterized queries)
from sqlalchemy import select, and_

# Query with ORM (safe)
decisions = await session.execute(
    select(Decision).where(
        and_(
            Decision.project_id == project_id,
            Decision.discipline == discipline
        )
    )
)

# ❌ NEVER use string interpolation
# query = f"SELECT * FROM decisions WHERE project_id = '{project_id}'"  # VULNERABLE!
```

#### 2. Authentication & Session Management

```python
# ✅ JWT tokens (stateless, secure)
# - HS256 signing with 256-bit key
# - 7-day expiration (not too long)
# - Stored in memory (frontend), not cookies
# - Refreshed on each login

# ❌ Avoid: Session cookies in browser storage
# ❌ Avoid: Long-lived tokens without refresh
```

#### 3. Sensitive Data Exposure

```python
# ✅ HTTPS enforced
# ✅ No secrets in URLs
# ✅ Password minimum 8 chars + complexity
# ✅ Never log sensitive data
logger.info("user_login", user_id=user.id)  # Safe
logger.error("auth_failed", password=password)  # UNSAFE!
```

#### 4. XML External Entities (XXE) - Not Applicable

```
DecisionLog uses JSON, not XML.
No XXE vulnerability possible.
```

#### 5. Broken Access Control

```python
# ✅ Check user permissions on every endpoint
@router.get("/projects/{project_id}/decisions")
async def get_decisions(
    project_id: str,
    user: User = Depends(require_project_access)  # ← Authorization check
):
    pass

# ❌ NEVER trust client-provided IDs
# ❌ NEVER skip permission checks "for performance"
```

#### 6. Security Misconfiguration

```python
# ✅ Explicit security headers
SECURE_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'"
}

# ✅ CORS restricted to frontend domain only
CORS_ORIGINS = ["https://app.decisionlog.io"]

# ✅ No debug mode in production
DEBUG = False  # NEVER True in production
```

#### 7. Cross-Site Scripting (XSS)

```typescript
// ✅ React auto-escapes by default
<p>{decision_statement}</p>
// Rendered as: &lt;script&gt;...&lt;/script&gt;

// ❌ NEVER use dangerouslySetInnerHTML
// <div dangerouslySetInnerHTML={{ __html: decision_statement }} />  // VULNERABLE!

// ✅ Use libraries for user-generated content
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(transcript_excerpt);
```

#### 8. Insecure Deserialization

```python
# ✅ Use Pydantic for validation
from pydantic import BaseModel, field_validator

class DecisionCreate(BaseModel):
    decision_statement: str
    who: str
    timestamp: str

    @field_validator('decision_statement')
    def statement_not_empty(cls, v):
        if not v or len(v) < 5:
            raise ValueError('Must be 5+ chars')
        return v

# ❌ NEVER use pickle or eval()
# obj = pickle.loads(data)  # VULNERABLE!
# result = eval(user_input)  # VULNERABLE!
```

#### 9. Using Components with Known Vulnerabilities

```
Dependency management:
✅ Regular npm audit + pip audit
✅ Automated updates (Dependabot)
✅ No outdated major versions
✅ Pin versions in requirements.txt / package-lock.json
```

#### 10. Insufficient Logging & Monitoring

```python
# ✅ Log security events
logger.warning("authentication_failed", email=email, ip=request.client.host)
logger.info("decision_approved", decision_id=id, approved_by=user.id)
logger.error("unauthorized_access_attempt", user_id=user.id, resource=resource)

# Send to Sentry for alerting
sentry_sdk.capture_exception(exception)
```

---

## Webhook Security

### Tactiq Webhook Verification

**Every webhook must be verified using HMAC-SHA256 signature:**

```python
# app/api/routes/webhooks.py
import hmac
import hashlib

TACTIQ_WEBHOOK_SECRET = settings.TACTIQ_WEBHOOK_SECRET

async def verify_tactiq_signature(
    request: Request,
    body: bytes
) -> bool:
    """Verify webhook signature from Tactiq."""

    signature = request.headers.get("X-Tactiq-Signature")
    if not signature:
        return False

    # Calculate expected signature
    expected = hmac.new(
        TACTIQ_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison (prevent timing attacks)
    return hmac.compare_digest(
        signature.split("sha256=")[1],  # Extract hex after "sha256="
        expected
    )

@router.post("/webhooks/transcript")
async def receive_transcript(request: Request):
    """Receive transcript from Tactiq webhook."""

    body = await request.body()

    # Verify signature
    if not await verify_tactiq_signature(request, body):
        raise HTTPException(
            status_code=401,
            detail="Invalid webhook signature"
        )

    # Parse and process
    payload = json.loads(body)
    # ... rest of logic
```

**Webhook Best Practices:**

```python
✅ Verify signature on every request
✅ Validate request source (IP whitelist if possible)
✅ Handle duplicate webhooks (idempotent processing)
✅ Verify required fields present
✅ Log all webhook activity
✅ Timeout after 5 seconds (prevent hanging)
✅ Retry failed webhooks (with exponential backoff)
```

---

## API Rate Limiting

### Per-User Rate Limiting

```python
# app/api/middleware/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=lambda request: request.state.user_id,  # Per user, not per IP
    default_limits=["100 per minute"]  # 100 requests/minute per user
)

# Apply to routes
@router.get("/projects")
@limiter.limit("100/minute")
async def list_projects(request: Request):
    pass
```

**Rate Limit Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1612949660
```

**Rate Limit Exceeded Response:**

```json
{
  "error": "rate_limit_exceeded",
  "detail": "Too many requests. Limit reset at 2026-02-07T14:45:00Z",
  "retry_after": 30
}
```

---

## Compliance & Best Practices

### Data Retention

```
Users: No deletion, soft-delete flag (deleted_at)
Projects: Soft archive (archived_at), can be restored
Decisions: Kept indefinitely (business records)
Transcripts: Kept indefinitely (source of truth)
Logs: 30-day retention (Sentry free tier)
Backups: 7-day retention (Supabase free tier)
```

### Data Privacy

```
✅ No third-party data sharing
✅ No marketing emails
✅ No tracking cookies
✅ No user data sold
✅ Encrypted connections everywhere
✅ User can request data export (future feature)
✅ User can request deletion (future feature)
```

### Audit Logging

```python
# Log all sensitive operations
logger.info(
    "audit_log",
    event="decision_approved",
    decision_id=decision.id,
    approved_by=user.id,
    timestamp=datetime.utcnow(),
    ip_address=request.client.host
)
```

---

## Incident Response

### Security Incident Procedures

1. **Detect:** Sentry alerts on suspicious patterns
2. **Respond:** Immediate investigation
3. **Contain:** Temporarily disable affected endpoint if needed
4. **Remediate:** Deploy hotfix
5. **Communicate:** Notify affected users if necessary
6. **Post-Mortem:** Document and prevent recurrence

### Incident Examples & Responses

**Example 1: SQL Injection Attempt**

```
Detection: Sentry error from SQLAlchemy
Response:
1. Check logs for attack pattern
2. Block IP if systematic
3. Verify no data exfiltration
4. Communicate: "No user data compromised"
```

**Example 2: Brute Force Login Attack**

```
Detection: Multiple failed login attempts from single IP
Response:
1. Implement account lockout (5 failed attempts = 15 min lockout)
2. Alert affected user to change password
3. Log incident
4. Monitor for similar patterns
```

**Example 3: Elevated API Usage**

```
Detection: Single user making 10K requests/hour
Response:
1. Rate limit triggered (automated)
2. Alert user about suspicious activity
3. Investigation if legitimate API client
4. Potential credential compromise
```

---

## Security Testing

### Automated Security Checks

```bash
# Dependency vulnerability scan
npm audit
pip audit

# Static code analysis
bandit app/ -r  # Python security linter

# OWASP ZAP scan (optional)
docker run -v $(pwd):/zap/wrk:rw \
  owasp/zap2docker-stable zap-baseline.py \
  -t https://api.decisionlog.io/api
```

### Manual Security Testing

```
□ Test SQL injection (parameterized queries)
□ Test XSS (auto-escape in React)
□ Test authentication bypass
□ Test CORS misconfiguration
□ Test broken access control
□ Test API rate limiting
□ Test webhook signature verification
□ Test HTTPS enforcement
□ Test password hashing
□ Test JWT expiration
```

### Penetration Testing (Phase 2)

Schedule annual penetration testing with certified firm:
- Test all attack vectors
- Check compliance with OWASP Top 10
- Remediate findings

---

## Security Checklist

### Pre-Launch

- [ ] All endpoints require authentication
- [ ] All endpoints check user permissions
- [ ] HTTPS enforced (no HTTP fallback)
- [ ] CORS configured (frontend domain only)
- [ ] Rate limiting implemented
- [ ] Webhook signature verification working
- [ ] Database backups tested
- [ ] Error messages don't leak sensitive info
- [ ] Secrets in environment variables only
- [ ] Logs don't contain passwords/tokens
- [ ] Security headers configured
- [ ] Content Security Policy set
- [ ] Dependencies scanned for vulnerabilities
- [ ] SQL queries parameterized (no string interpolation)
- [ ] XSS protection enabled (React auto-escape)
- [ ] CSRF protection (not needed with JWT headers)

### Post-Launch (Monthly)

- [ ] Review Sentry error logs
- [ ] Check GitHub security alerts
- [ ] Scan dependencies for updates
- [ ] Review audit logs for suspicious activity
- [ ] Test password reset flow
- [ ] Verify backups working
- [ ] Check uptime/availability

---

## Success Criteria

✅ Zero authentication bypass vulnerabilities
✅ All API endpoints enforce RBAC
✅ 100% HTTPS coverage
✅ Webhook signature verification required
✅ Password policy enforced
✅ Rate limiting prevents abuse
✅ Error messages don't leak info
✅ Security headers configured
✅ Dependencies regularly updated
✅ Zero data loss incidents

---

**Document Status:** Complete
**Last Updated:** 2026-02-07
**Architecture Documentation Complete:** Ready for Implementation

— Aria, arquitetando o futuro 🏗️
